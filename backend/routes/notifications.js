const express = require('express');
const db = require('../db/database');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, (req, res) => {
  const notifications = db.prepare(`
    SELECT n.*, u.username as actor_username, u.display_name as actor_name, u.avatar as actor_avatar
    FROM notifications n
    JOIN users u ON n.actor_id = u.id
    WHERE n.user_id=?
    ORDER BY n.created_at DESC LIMIT 50
  `).all(req.user.id);
  res.json(notifications);
});

router.put('/read', auth, (req, res) => {
  db.prepare('UPDATE notifications SET read=1 WHERE user_id=?').run(req.user.id);
  res.json({ ok: true });
});

router.get('/unread-count', auth, (req, res) => {
  const row = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id=? AND read=0').get(req.user.id);
  res.json({ count: row.count });
});

module.exports = router;
