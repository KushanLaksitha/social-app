const db = require('./backend/db/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function createAdmin() {
  const username = 'admin';
  const password = 'adminpassword123';
  const hashed = await bcrypt.hash(password, 10);
  const id = uuidv4();
  
  try {
    db.prepare(`INSERT INTO users (id, username, display_name, email, password, role, avatar) VALUES (?,?,?,?,?,?,?)`)
      .run(id, username, 'System Admin', 'admin@vibe.com', hashed, 'admin', '#6C63FF');
    console.log('Admin created successfully!');
    console.log('Username: admin');
    console.log('Password: adminpassword123');
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      db.prepare('UPDATE users SET role = "admin" WHERE username = ?').run(username);
      console.log('User "admin" already exists, promoted to admin role.');
    } else {
      console.error(e);
    }
  }
}

createAdmin();
