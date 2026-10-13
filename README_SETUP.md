# SuperGym local demo setup

1. Install Node.js; run `npm install`.
2. Import the team's original schema, data, business rules, and the existing `user_account` table into MySQL. The extra table must contain: `user_id`, `email` (UNIQUE), `password_hash`, `role` ENUM('member','trainer','manager'), `member_id` (UNIQUE FK to member), `trainer_id` (UNIQUE FK to trainer), with nullable profile IDs.
3. Copy `.env.example` to `.env` and enter local DB password and a private demo password. Never commit `.env`.
4. Start with `npm run dev`; visit `http://localhost:3000/index.html`.
5. Legacy member/trainer rows without a `user_account` can log in using DEMO_PASSWORD. New signups have an account and must use their own password. Signup records member and user_account in one transaction, but creates no membership plan.
6. IMPORTANT SECURITY: This is a local classroom prototype, NOT ready for public hosting. The shared legacy password, unauthenticated management and booking APIs, and client-side role flags do not enforce permissions. Add real sessions, role authorization, per-user credentials, CSRF considerations and rate limiting before internet exposure.

## Login with previously seeded demo accounts
If `seedAccounts.js` was run with a previous `DEMO_PASSWORD`, existing `user_account` rows contain hashes for that old password. Logging in with a different default will fail even though the email exists. For local testing, either use the original seeded password or migrate ONLY old shared-password accounts: add `OLD_DEMO_PASSWORD=<previous demo password>` and `DEMO_PASSWORD=<current demo password>` to `.env`, then run `node resetLegacyDemoPasswords.js`. The migration compares hashes and leaves personally chosen passwords unchanged. Remove `OLD_DEMO_PASSWORD` afterward. Never run this with unknown or live user accounts.

For registration errors, open the network response and backend terminal; error response now includes a safe database error code, while server logs print the SQL error code/message (but never user passwords).
