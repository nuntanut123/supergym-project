/** Local classroom demo migration only. Resets hashes that match the OLD shared demo password.
 * Never modifies an account with a personally chosen signup password.
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db');
async function main() {
  const oldPassword = process.env.OLD_DEMO_PASSWORD;
  const newPassword = process.env.DEMO_PASSWORD;
  if (!oldPassword || !newPassword || oldPassword.length < 8 || newPassword.length < 8) {
    throw new Error('Set OLD_DEMO_PASSWORD and DEMO_PASSWORD (at least 8 characters) in .env');
  }
  const [rows] = await db.query('SELECT user_id, role, password_hash FROM user_account');
  let changed=0, skipped=0;
  for (const r of rows) {
    if (await bcrypt.compare(oldPassword, r.password_hash)) {
      const newHash = await bcrypt.hash(newPassword, 12);
      await db.execute('UPDATE user_account SET password_hash = ? WHERE user_id = ? AND password_hash = ?', [newHash, r.user_id, r.password_hash]);
      changed++;
    } else skipped++;
  }
  console.log(`Legacy demo hashes updated: ${changed}; accounts with other passwords left unchanged: ${skipped}`);
}
main().catch(e=>{console.error('Migration error:',e.code || e.message);process.exitCode=1;}).finally(()=>db.end());
