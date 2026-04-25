const express = require('express');
const db = require('../db/database');
const { auth } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Get all conversations for current user
router.get('/conversations', auth, (req, res) => {
  const convs = db.prepare(`
    SELECT c.*, 
      u1.username as u1_username, u1.display_name as u1_display, u1.avatar as u1_avatar,
      u2.username as u2_username, u2.display_name as u2_display, u2.avatar as u2_avatar,
      (SELECT COUNT(*) FROM messages m WHERE m.conversation_id=c.id AND m.sender_id!=? AND m.read=0) as unread
    FROM conversations c
    JOIN users u1 ON c.user1_id = u1.id
    JOIN users u2 ON c.user2_id = u2.id
    WHERE c.user1_id=? OR c.user2_id=?
    ORDER BY c.last_message_at DESC
  `).all(req.user.id, req.user.id, req.user.id);

  const result = convs.map(c => {
    const other = c.user1_id === req.user.id
      ? { id: c.user2_id, username: c.u2_username, display_name: c.u2_display, avatar: c.u2_avatar }
      : { id: c.user1_id, username: c.u1_username, display_name: c.u1_display, avatar: c.u1_avatar };
    return { id: c.id, other, last_message: c.last_message, last_message_at: c.last_message_at, unread: c.unread };
  });
  res.json(result);
});

// Get or create conversation with user
router.post('/conversations/:userId', auth, (req, res) => {
  const [a, b] = [req.user.id, req.params.userId].sort();
  let conv = db.prepare('SELECT * FROM conversations WHERE (user1_id=? AND user2_id=?) OR (user1_id=? AND user2_id=?)').get(a, b, b, a);
  if (!conv) {
    const id = uuidv4();
    db.prepare('INSERT INTO conversations (id, user1_id, user2_id) VALUES (?,?,?)').run(id, a, b);
    conv = db.prepare('SELECT * FROM conversations WHERE id=?').get(id);
  }
  res.json(conv);
});

// Get messages in conversation
router.get('/conversations/:convId/messages', auth, (req, res) => {
  const conv = db.prepare('SELECT * FROM conversations WHERE id=? AND (user1_id=? OR user2_id=?)').get(req.params.convId, req.user.id, req.user.id);
  if (!conv) return res.status(403).json({ error: 'Forbidden' });

  // Mark as read
  db.prepare('UPDATE messages SET read=1 WHERE conversation_id=? AND sender_id!=?').run(req.params.convId, req.user.id);

  const messages = db.prepare('SELECT * FROM messages WHERE conversation_id=? ORDER BY created_at ASC').all(req.params.convId);
  res.json(messages);
});

// Send message
router.post('/conversations/:convId/messages', auth, (req, res) => {
  const conv = db.prepare('SELECT * FROM conversations WHERE id=? AND (user1_id=? OR user2_id=?)').get(req.params.convId, req.user.id, req.user.id);
  if (!conv) return res.status(403).json({ error: 'Forbidden' });

  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Content required' });

  const id = uuidv4();
  db.prepare('INSERT INTO messages (id, conversation_id, sender_id, content) VALUES (?,?,?,?)').run(id, req.params.convId, req.user.id, content.trim());
  db.prepare('UPDATE conversations SET last_message=?, last_message_at=CURRENT_TIMESTAMP WHERE id=?').run(content.trim().substring(0, 100), req.params.convId);

  const msg = db.prepare('SELECT * FROM messages WHERE id=?').get(id);
  res.json(msg);
});

module.exports = router;
