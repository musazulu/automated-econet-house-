# Secure Sign-in and BA Portal Setup

The app now uses individual accounts instead of the demo role selector. Staff sign in with email and a personal six-digit PIN. BAs sign in with their BA ID and a personal six-digit PIN.

## One-time administrator setup

1. In the Vercel project settings, add an environment variable named `AUTH_SETUP_KEY` for Production. Generate a random value locally, for example:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

   Keep this key private. Do not put it in the source code or share it in chat.
2. Redeploy the Vercel project so the new environment variable is available to the API.
3. If this is a new database without BA and attendance tables, initialize it with a POST request and the setup-key header. For example, after putting the same key into your local PowerShell environment:

   ```powershell
   Invoke-RestMethod -Method Post -Uri "https://automated-econet-house.vercel.app/api/init-db" -Headers @{ "x-setup-key" = $env:AUTH_SETUP_KEY }
   ```

   Do not run this against a database that is already initialized. The endpoint is protected and cannot be opened directly in a browser.
4. Open the main application URL. The initial setup screen asks for the setup key, administrator name, email, and a personal six-digit PIN.
5. After the administrator account is created, remove `AUTH_SETUP_KEY` from Vercel and redeploy. The setup endpoint also refuses to create another initial admin once one exists.
6. Sign in with the administrator email and PIN.

The database must contain the `brand_ambassadors` and `attendance_records` tables before initial sign-in. Authentication tables are created automatically when the sign-in API is first used.

For local development, `npm run dev` starts only the Vite frontend and does not serve the Vercel API routes. Use `vercel dev` with `DATABASE_URL` and (for initial setup) `AUTH_SETUP_KEY` configured to test sign-in locally.

## Create staff and BA accounts

1. Sign in as an administrator and open **Sign-in Accounts**.
2. For a new BA, choose **Brand Ambassador → + New Brand Ambassador**, enter only the BA's name and a six-digit PIN. The system registers the BA with the next BA ID (for example `ECO-BA-1002`) and shows it; give that ID and the PIN to the BA. Other BA details can be completed later in **BA Management**. For staff, enter name, email, and (for consultants) the assigned consultant.
3. Set a separate six-digit PIN and share it directly with that account holder.
4. For a PIN reset, choose the existing BA or staff account, set a new PIN in the same screen and send it privately to the user. Saved PINs are not displayed.

Users open the same main application link. Staff enter their email and PIN; BAs enter their BA ID and PIN. A BA's account is tied to their BA record and becomes unavailable if the BA is inactive.

## Access and attendance rules

- BAs can see their own registration status and signed attendance register only. Their portal is read-only; corrections must be made by an authorized staff member.
- Administrators can open **Live Attendance**. The page refreshes today's attendance every 10 seconds.
- A clock-in at or before **08:00:00 CAT** is on time. Any time after **08:00:00 CAT** is late.
- Five unsuccessful PIN attempts lock that account's sign-in for 15 minutes. An administrator can reset the PIN from **Sign-in Accounts**.
- Signed-in sessions expire after 12 hours.
