const db = require('./backend/db/database');
const bcrypt = require('bcryptjs');

async function reset() {
  const hashed = await bcrypt.hash('admin123', 10);
  db.prepare("UPDATE users SET password = ? WHERE username = 'kushanlk'").run(hashed);
  console.log('Password for kushanlk reset to: admin123');
}
reset();
