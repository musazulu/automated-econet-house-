import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

export type AccountRole = 'admin' | 'consultant' | 'operator' | 'ba';

export interface AuthenticatedUser {
  loginId: string;
  role: AccountRole;
  displayName: string;
  baId?: string;
  consultantId?: string;
}

export const getDatabase = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured');
  }
  return neon(process.env.DATABASE_URL);
};

let schemaReady: Promise<void> | null = null;

export const ensureAuthSchema = (sql: ReturnType<typeof getDatabase>): Promise<void> => {
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS auth_accounts (
          login_id TEXT PRIMARY KEY,
          role TEXT NOT NULL CHECK (role IN ('admin', 'consultant', 'operator', 'ba')),
          display_name TEXT NOT NULL,
          ba_id TEXT,
          consultant_id TEXT,
          pin_salt TEXT NOT NULL,
          pin_hash TEXT NOT NULL,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS auth_sessions (
          token_hash TEXT PRIMARY KEY,
          login_id TEXT NOT NULL REFERENCES auth_accounts(login_id) ON DELETE CASCADE,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS auth_login_attempts (
          subject_hash TEXT PRIMARY KEY,
          failure_count INTEGER NOT NULL DEFAULT 0,
          locked_until TIMESTAMPTZ,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS idx_auth_sessions_expiry ON auth_sessions(expires_at)`;
    })().catch(error => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
};

export const normalizeLoginId = (value: string): string => value.trim().toLowerCase();

export const hashValue = (value: string): string =>
  createHash('sha256').update(value).digest('hex');

export const createPinHash = (pin: string): { salt: string; hash: string } => {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(pin, salt, 64).toString('hex');
  return { salt, hash };
};

export const verifyPin = (pin: string, salt: string, expectedHash: string): boolean => {
  const actualHash = scryptSync(pin, salt, 64);
  const expected = Buffer.from(expectedHash, 'hex');
  return actualHash.length === expected.length && timingSafeEqual(actualHash, expected);
};

const getCookieValue = (request: VercelRequest, name: string): string | undefined => {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) return undefined;
  const cookie = cookieHeader.split(';').map(value => value.trim()).find(value => value.startsWith(`${name}=`));
  if (!cookie) return undefined;
  try {
    return decodeURIComponent(cookie.slice(name.length + 1));
  } catch {
    return undefined;
  }
};

export const getSessionToken = (request: VercelRequest): string | undefined =>
  getCookieValue(request, 'econet_session');

export const setSessionCookie = (response: VercelResponse, token: string, maxAge: number): void => {
  const secure = process.env.NODE_ENV === 'production' ? ' Secure;' : '';
  response.setHeader(
    'Set-Cookie',
    `econet_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge};${secure}`
  );
};

export const getAuthenticatedUser = async (
  request: VercelRequest,
  sql = getDatabase()
): Promise<AuthenticatedUser | null> => {
  await ensureAuthSchema(sql);
  const token = getSessionToken(request);
  if (!token) return null;

  const rows = await sql`
    SELECT a.login_id, a.role, a.display_name, a.ba_id, a.consultant_id
    FROM auth_sessions s
    JOIN auth_accounts a ON a.login_id = s.login_id
    WHERE s.token_hash = ${hashValue(token)}
      AND s.expires_at > CURRENT_TIMESTAMP
      AND a.is_active = TRUE
      AND (
        a.role <> 'ba'
        OR EXISTS (
          SELECT 1 FROM brand_ambassadors b
          WHERE lower(b.ba_id) = a.ba_id AND b.status = 'active'
        )
      )
    LIMIT 1
  `;
  const account = rows[0];
  if (!account) return null;
  return {
    loginId: account.login_id,
    role: account.role,
    displayName: account.display_name,
    baId: account.ba_id || undefined,
    consultantId: account.consultant_id || undefined,
  };
};

export const requireRole = async (
  request: VercelRequest,
  response: VercelResponse,
  roles: AccountRole[],
  sql = getDatabase()
): Promise<AuthenticatedUser | null> => {
  response.setHeader('Cache-Control', 'no-store');
  const user = await getAuthenticatedUser(request, sql);
  if (!user) {
    response.status(401).json({ success: false, error: 'Sign in is required.' });
    return null;
  }
  if (!roles.includes(user.role)) {
    response.status(403).json({ success: false, error: 'You are not authorised to perform this action.' });
    return null;
  }
  return user;
};
