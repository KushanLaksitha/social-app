const express = require('express');
const db = require('../db/database');
const { auth, optionalAuth } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

router.post('/', auth, (req, res) => {
  const { title, cover_url, story_ids } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  if (!story_ids || !story_ids.length) return res.status(400).json({ error: 'At least one story required' });

  const id = uuidv4();
  db.prepare('INSERT INTO highlights (id, user_id, title, cover_url) VALUES (?,?,?,?)')
    .run(id, req.user.id, title, cover_url || '');

  const stmt = db.prepare('INSERT INTO highlight_stories (highlight_id, story_id) VALUES (?,?)');
  for (const storyId of story_ids) {
    stmt.run(id, storyId);
  }

  res.json({ id, title, cover_url });
});

router.get('/user/:userId', optionalAuth, (req, res) => {
  const isMe = req.user?.id === req.params.userId;
  let isFollowing = false;
  if (!isMe) {
    if (req.user) {
      isFollowing = !!db.prepare('SELECT 1 FROM follows WHERE follower_id=? AND following_id=?').get(req.user.id, req.params.userId);
      // Check if blocked
      const amIBlocked = db.prepare('SELECT 1 FROM blocks WHERE blocker_id=? AND blocked_id=?').get(req.params.userId, req.user.id);
      if (amIBlocked) return res.status(403).json({ error: 'Blocked' });
    }
    
    // User wants only followers to see highlights
    if (!isFollowing) return res.json([]);
  }

  const highlights = db.prepare('SELECT * FROM highlights WHERE user_id=? ORDER BY created_at DESC').all(req.params.userId);
  const results = highlights.map(h => {
    const stories = db.prepare(`
      SELECT s.* FROM stories s
      JOIN highlight_stories hs ON s.id = hs.story_id
      WHERE hs.highlight_id = ?
      ORDER BY s.created_at ASC
    `).all(h.id);
    return { ...h, stories };
  });
  res.json(results);
});

router.delete('/:id', auth, (req, res) => {
  const highlight = db.prepare('SELECT 1 FROM highlights WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!highlight) return res.status(404).json({ error: 'Highlight not found' });

  db.prepare('DELETE FROM highlights WHERE id=?').run(req.params.id);
  res.json({ deleted: true });
});

module.exports = router;
