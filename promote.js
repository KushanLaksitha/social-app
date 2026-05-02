const db = require('./backend/db/database');
try {
  db.prepare("UPDATE users SET role = 'admin' WHERE username = 'kushanlk'").run();
  console.log('Success: kushanlk is now an admin.');
} catch (e) {
  console.error('Error:', e.message);
}
