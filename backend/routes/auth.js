const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { auth, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { username, display_name, email, password } = req.body;
    if (!username || !display_name || !email || !password)
      return res.status(400).json({ error: 'All fields required' });

    const existing = db.prepare('SELECT id FROM users WHERE username=? OR email=?').get(username, email);
    if (existing) return res.status(400).json({ error: 'Username or email already taken' });

    const hashed = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const avatarColors = ['#6C63FF','#FF6584','#43E97B','#F7971E','#4FACFE','#FA709A'];
    const color = avatarColors[Math.floor(Math.random() * avatarColors.length)];

    db.prepare(`INSERT INTO users (id, username, display_name, email, password, avatar) VALUES (?,?,?,?,?,?)`)
      .run(id, username.toLowerCase(), display_name, email, hashed, color);

    const token = jwt.sign({ id, username: username.toLowerCase() }, JWT_SECRET, { expiresIn: '30d' });
    const user = db.prepare('SELECT id, username, display_name, email, bio, avatar, cover, followers_count, following_count, posts_count, created_at FROM users WHERE id=?').get(id);
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { login, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username=? OR email=?').get(login?.toLowerCase(), login);
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
    const { password: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', auth, (req, res) => {
  const user = db.prepare('SELECT id, username, display_name, email, bio, avatar, cover, followers_count, following_count, posts_count, created_at FROM users WHERE id=?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

const path = require('path');
const { saveEncrypted } = require('../utils/encryption');

router.put('/profile', auth, (req, res) => {
  const upload = req.app.get('upload');
  upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'cover', maxCount: 1 }])(req, res, (err) => {
    if (err) return res.status(400).json({ error: 'File upload failed' });

    const { display_name, bio, education } = req.body;
    let { avatar, cover } = req.body;

    const uploadDir = path.join(__dirname, '../uploads');

    if (req.files?.['avatar']) {
      const file = req.files['avatar'][0];
      const encFilename = `img-${uuidv4()}.enc`;
      saveEncrypted(file.buffer, path.join(uploadDir, encFilename));
      file.buffer = null;
      avatar = `/api/media/${encFilename}`;
    }
    if (req.files?.['cover']) {
      const file = req.files['cover'][0];
      const encFilename = `img-${uuidv4()}.enc`;
      saveEncrypted(file.buffer, path.join(uploadDir, encFilename));
      file.buffer = null;
      cover = `/api/media/${encFilename}`;
    }

    db.prepare('UPDATE users SET display_name=COALESCE(?,display_name), bio=COALESCE(?,bio), education=COALESCE(?,education), avatar=COALESCE(?,avatar), cover=COALESCE(?,cover) WHERE id=?')
      .run(display_name || null, bio || null, education || null, avatar || null, cover || null, req.user.id);
    
    const user = db.prepare('SELECT id, username, display_name, email, bio, education, avatar, cover, followers_count, following_count, posts_count, created_at FROM users WHERE id=?').get(req.user.id);
    res.json(user);
  });
});

router.post('/change-password', auth, async (req, res) => {
  try {
    const { old_password, new_password } = req.body;
    if (!old_password || !new_password) return res.status(400).json({ error: 'Both passwords required' });

    const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
    const valid = await bcrypt.compare(old_password, user.password);
    if (!valid) return res.status(400).json({ error: 'Current password incorrect' });

    const hashed = await bcrypt.hash(new_password, 10);
    db.prepare('UPDATE users SET password=? WHERE id=?').run(hashed, req.user.id);
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
