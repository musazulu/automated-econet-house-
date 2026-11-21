import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  createPinHash,
  ensureAuthSchema,
  getAuthenticatedUser,
  getDatabase,
  getSessionToken,
  hashValue,
  normalizeLoginId,
  requireRole,
  setSessionCookie,
  verifyPin,
  type AccountRole,
} from '../src/server/auth.js';

const SESSION_SECONDS = 60 * 60 * 12;
const MAX_LOGIN_FAILURES = 5;
const LOCKOUT_MINUTES = 15;

const isValidPin = (pin: unknown): pin is string =>
  typeof pin === 'string' && /^\d{6}$/.test(pin);

const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const isAccountRole = (role: unknown): role is AccountRole =>
  role === 'admin' || role === 'consultant' || role === 'operator' || role === 'ba';

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Unexpected authentication error.';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    res.setHeader('Cache-Control', 'no-store');
    const sql = getDatabase();
    await ensureAuthSchema(sql);

    if (req.method === 'GET') {
      const user = await getAuthenticatedUser(req, sql);
      const admins = await sql`SELECT 1 FROM auth_accounts WHERE role = 'admin' LIMIT 1`;
      let baProfile = null;
      if (user?.role === 'ba' && user.baId) {
        const rows = await sql`
          SELECT ba_id, full_name, date_registered, status
          FROM brand_ambassadors
          WHERE ba_id = ${user.baId}
          LIMIT 1
        `;
        const row = rows[0];
        baProfile = row
          ? {
              baId: row.ba_id,
              fullName: row.full_name,
              dateRegistered: row.date_registered,
              status: row.status,
            }
          : null;
      }
      return res.status(200).json({
        success: true,
        user,
        baProfile,
        setupRequired: admins.length === 0,
      });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Method not allowed.' });
    }

    const body = req.body as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ success: false, error: 'A valid request body is required.' });
    }

    if (body.action === 'bootstrap') {
      const setupKey = typeof body.setupKey === 'string' ? body.setupKey : '';
      const configuredKey = process.env.AUTH_SETUP_KEY || '';
      if (configuredKey.length < 32) {
        return res.status(503).json({
          success: false,
          error: 'First-time setup is unavailable. Configure AUTH_SETUP_KEY with a random value of at least 32 characters in Vercel.',
        });
      }
      const supplied = Buffer.from(setupKey);
      const expected = Buffer.from(configuredKey);
      if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
        return res.status(401).json({ success: false, error: 'Setup key is incorrect.' });
      }

      const existingAdmins = await sql`SELECT 1 FROM auth_accounts WHERE role = 'admin' LIMIT 1`;
      if (existingAdmins.length > 0) {
        return res.status(409).json({ success: false, error: 'Administrator setup has already been completed.' });
      }

      const email = normalizeLoginId(typeof body.email === 'string' ? body.email : '');
      const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : '';
      const pin = body.pin;
      if (!isValidEmail(email) || displayName.length < 2 || !isValidPin(pin)) {
        return res.status(400).json({
          success: false,
          error: 'Enter a valid email address, name, and six-digit PIN.',
        });
      }

      const { salt, hash } = createPinHash(pin);
      await sql`
        INSERT INTO auth_accounts (login_id, role, display_name, pin_salt, pin_hash)
        VALUES (${email}, 'admin', ${displayName}, ${salt}, ${hash})
      `;

      const token = randomBytes(32).toString('base64url');
      await sql`
        INSERT INTO auth_sessions (token_hash, login_id, expires_at)
        VALUES (${hashValue(token)}, ${email}, CURRENT_TIMESTAMP + INTERVAL '12 hours')
      `;
      setSessionCookie(res, token, SESSION_SECONDS);
      return res.status(201).json({
        success: true,
        user: { loginId: email, role: 'admin', displayName },
      });
    }

    if (body.action === 'login') {
      const loginId = normalizeLoginId(typeof body.loginId === 'string' ? body.loginId : '');
      const pin = body.pin;
      if (!loginId || typeof pin !== 'string' || pin.length > 64) {
        return res.status(400).json({ success: false, error: 'Enter your BA ID or email and PIN.' });
      }

      const subjectHash = hashValue(loginId);
      const attempts = await sql`
        SELECT failure_count, locked_until
        FROM auth_login_attempts
        WHERE subject_hash = ${subjectHash}
        LIMIT 1
      `;
      const lockedUntil = attempts[0]?.locked_until ? new Date(attempts[0].locked_until) : null;
      if (lockedUntil && lockedUntil.getTime() > Date.now()) {
        return res.status(429).json({
          success: false,
          error: `Too many unsuccessful attempts. Try again in ${LOCKOUT_MINUTES} minutes or ask an administrator to reset your PIN.`,
        });
      }

      const rows = await sql`
        SELECT login_id, role, display_name, ba_id, consultant_id, pin_salt, pin_hash
        FROM auth_accounts
        WHERE login_id = ${loginId} AND is_active = TRUE
          AND (
            role <> 'ba'
            OR EXISTS (
              SELECT 1 FROM brand_ambassadors b
              WHERE lower(b.ba_id) = lower(auth_accounts.ba_id) AND b.status = 'active'
            )
          )
        LIMIT 1
      `;
      const account = rows[0];
      const matches = verifyPin(
        typeof pin === 'string' ? pin : '',
        account?.pin_salt || '0'.repeat(32),
        account?.pin_hash || '0'.repeat(128)
      ) && Boolean(account);

      if (!matches) {
        const updatedAttempts = await sql`
          INSERT INTO auth_login_attempts (subject_hash, failure_count, locked_until, updated_at)
          VALUES (${subjectHash}, 1, NULL, CURRENT_TIMESTAMP)
          ON CONFLICT (subject_hash) DO UPDATE SET
            failure_count = CASE
              WHEN auth_login_attempts.locked_until > CURRENT_TIMESTAMP
                THEN auth_login_attempts.failure_count
              WHEN auth_login_attempts.locked_until IS NOT NULL
                THEN 1
              ELSE auth_login_attempts.failure_count + 1
            END,
            locked_until = CASE
              WHEN auth_login_attempts.locked_until > CURRENT_TIMESTAMP
                THEN auth_login_attempts.locked_until
              WHEN (
                CASE
                  WHEN auth_login_attempts.locked_until IS NOT NULL THEN 1
                  ELSE auth_login_attempts.failure_count + 1
                END
              ) >= ${MAX_LOGIN_FAILURES}
                THEN CURRENT_TIMESTAMP + INTERVAL '15 minutes'
              ELSE NULL
            END,
            updated_at = CURRENT_TIMESTAMP
          RETURNING failure_count, locked_until
        `;
        const newLock = updatedAttempts[0]?.locked_until
          ? new Date(updatedAttempts[0].locked_until)
          : null;
        if (newLock && newLock.getTime() > Date.now()) {
          return res.status(429).json({
            success: false,
            error: `Too many unsuccessful attempts. Try again in ${LOCKOUT_MINUTES} minutes or ask an administrator to reset your PIN.`,
          });
        }
        return res.status(401).json({ success: false, error: 'The BA ID/email or PIN is incorrect.' });
      }

      await sql`DELETE FROM auth_login_attempts WHERE subject_hash = ${subjectHash}`;
      const token = randomBytes(32).toString('base64url');
      await sql`
        INSERT INTO auth_sessions (token_hash, login_id, expires_at)
        VALUES (${hashValue(token)}, ${loginId}, CURRENT_TIMESTAMP + INTERVAL '12 hours')
      `;
      setSessionCookie(res, token, SESSION_SECONDS);
      return res.status(200).json({
        success: true,
        user: {
          loginId: account.login_id,
          role: account.role,
          displayName: account.display_name,
          baId: account.ba_id || undefined,
          consultantId: account.consultant_id || undefined,
        },
      });
    }

    if (body.action === 'logout') {
      const token = getSessionToken(req);
      if (token) await sql`DELETE FROM auth_sessions WHERE token_hash = ${hashValue(token)}`;
      setSessionCookie(res, '', 0);
      return res.status(200).json({ success: true, user: null });
    }

    if (body.action === 'list-accounts') {
      const user = await requireRole(req, res, ['admin'], sql);
      if (!user) return;
      const accounts = await sql`
        SELECT login_id, role, display_name, ba_id, consultant_id, is_active, updated_at
        FROM auth_accounts
        ORDER BY role, display_name
      `;
      return res.status(200).json({ success: true, data: accounts });
    }

    if (body.action === 'create-ba-account') {
      const user = await requireRole(req, res, ['admin'], sql);
      if (!user) return;
      const fullName = typeof body.fullName === 'string' ? body.fullName.trim().replace(/\s+/g, ' ') : '';
      const pin = body.pin;
      if (fullName.length < 2 || fullName.length > 100 || !isValidPin(pin)) {
        return res.status(400).json({ success: false, error: 'Enter the BA name and a six-digit PIN.' });
      }

      const latest = await sql`
        SELECT COALESCE(MAX(CAST(substring(ba_id FROM '[0-9]+$') AS INTEGER)), 1000) AS max_number
        FROM brand_ambassadors
        WHERE ba_id ~ '^ECO-BA-[0-9]+$'
      `;
      const baId = `ECO-BA-${Number(latest[0]?.max_number ?? 1000) + 1}`;
      const today = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Africa/Harare',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());
      const { salt, hash } = createPinHash(pin);

      await sql.transaction([
        sql`
          INSERT INTO brand_ambassadors (
            id, ba_id, full_name, category, region, branch,
            sales_consultant_id, sales_consultant_name, date_registered, status,
            daily_commission_rate, daily_attendance_commission_rate,
            qr_token, qr_revoked, qr_generated_at
          ) VALUES (
            ${`ba-${Date.now()}`}, ${baId}, ${fullName}, 'BA', 'Harare Central', 'First Street Branch',
            'unassigned', 'Unassigned', ${today}, 'active',
            5.0, 3.0,
            ${`ECO_TOKEN_${randomBytes(6).toString('hex').toUpperCase()}`}, FALSE, ${`${today} (CAT)`}
          )
        `,
        sql`
          INSERT INTO auth_accounts (login_id, role, display_name, ba_id, pin_salt, pin_hash, is_active)
          VALUES (${baId.toLowerCase()}, 'ba', ${fullName}, ${baId}, ${salt}, ${hash}, TRUE)
        `,
      ]);
      return res.status(201).json({
        success: true,
        baId,
        message: `${fullName} registered as ${baId}.`,
      });
    }

    if (body.action === 'provision-account') {
      const user = await requireRole(req, res, ['admin'], sql);
      if (!user) return;
      const role = body.role;
      const pin = body.pin;
      const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : '';
      const loginIdRaw = typeof body.loginId === 'string' ? body.loginId : '';
      const loginId = role === 'ba' ? loginIdRaw.trim().toLowerCase() : normalizeLoginId(loginIdRaw);
      const consultantId = typeof body.consultantId === 'string' ? body.consultantId.trim() : '';

      if (
        !isAccountRole(role) ||
        displayName.length < 2 ||
        !isValidPin(pin) ||
        !loginId
      ) {
        return res.status(400).json({
          success: false,
          error: 'Provide a name, valid account ID, role, and six-digit PIN.',
        });
      }
      if (role === 'consultant' && !consultantId) {
        return res.status(400).json({ success: false, error: 'Assign this consultant to a consultant ID.' });
      }
      if (role !== 'ba' && !isValidEmail(loginId)) {
        return res.status(400).json({ success: false, error: 'Staff accounts must use a valid email address.' });
      }

      let baId: string | null = null;
      if (role === 'ba') {
        const baRows = await sql`
          SELECT ba_id
          FROM brand_ambassadors
          WHERE lower(ba_id) = ${loginId} AND status = 'active'
          LIMIT 1
        `;
        if (!baRows[0]) {
          return res.status(404).json({ success: false, error: 'No active BA with that ID was found.' });
        }
        baId = baRows[0].ba_id;
      }
      if (loginId === user.loginId && role !== 'admin') {
        return res.status(400).json({ success: false, error: 'You cannot remove your own administrator access.' });
      }

      const { salt, hash } = createPinHash(pin);
      await sql`
        INSERT INTO auth_accounts (
          login_id, role, display_name, ba_id, consultant_id, pin_salt, pin_hash, is_active, updated_at
        ) VALUES (
          ${loginId}, ${role}, ${displayName}, ${baId},
          ${consultantId || null}, ${salt}, ${hash}, TRUE, CURRENT_TIMESTAMP
        )
        ON CONFLICT (login_id) DO UPDATE SET
          role = EXCLUDED.role,
          display_name = EXCLUDED.display_name,
          ba_id = EXCLUDED.ba_id,
          consultant_id = EXCLUDED.consultant_id,
          pin_salt = EXCLUDED.pin_salt,
          pin_hash = EXCLUDED.pin_hash,
          is_active = TRUE,
          updated_at = CURRENT_TIMESTAMP
      `;
      const currentToken = getSessionToken(req);
      if (currentToken) {
        await sql`
          DELETE FROM auth_sessions
          WHERE login_id = ${loginId} AND token_hash <> ${hashValue(currentToken)}
        `;
      }
      await sql`DELETE FROM auth_login_attempts WHERE subject_hash = ${hashValue(loginId)}`;
      return res.status(200).json({ success: true, message: 'Access PIN saved. Share it directly with the account holder.' });
    }

    return res.status(400).json({ success: false, error: 'Unknown authentication action.' });
  } catch (error: unknown) {
    console.error('Authentication API error:', error);
    return res.status(500).json({ success: false, error: errorMessage(error) });
  }
}
