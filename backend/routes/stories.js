const express = require('express');
const db = require('../db/database');
const { auth } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { saveEncrypted } = require('../utils/encryption');

const router = express.Router();

router.post('/', auth, (req, res) => {
  const upload = req.app.get('upload');
  upload.single('media')(req, res, (uploadErr) => {
    if (uploadErr) return res.status(400).json({ error: 'File upload failed' });
    if (!req.file) return res.status(400).json({ error: 'Media required' });

    const mime = req.file.mimetype;
    let prefix = 'img';
    let mediaType = 'image';
    if (mime === 'image/png') prefix = 'png';
    else if (mime === 'image/gif') prefix = 'gif';
    else if (mime === 'image/webp') prefix = 'webp';
    else if (mime.startsWith('video/webm')) { prefix = 'webm'; mediaType = 'video'; }
    else if (mime.startsWith('video/')) { prefix = 'vid'; mediaType = 'video'; }

    const encFilename = `${prefix}-${uuidv4()}.enc`;
    const encPath = path.join(__dirname, '../uploads', encFilename);
    saveEncrypted(req.file.buffer, encPath);
    req.file.buffer = null;

    const mediaUrl = `/api/media/${encFilename}`;
    const id = uuidv4();
    const duration = req.body.duration || 0; // Duration should be passed from frontend
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours from now

    db.prepare('INSERT INTO stories (id, user_id, media_url, media_type, duration, expires_at) VALUES (?,?,?,?,?,?)')
      .run(id, req.user.id, mediaUrl, mediaType, duration, expiresAt);

    const story = db.prepare('SELECT * FROM stories WHERE id=?').get(id);
    res.json(story);
  });
});

router.get('/feed', auth, (req, res) => {
  // Get active stories from followed users + self
  const now = new Date().toISOString();
  const stories = db.prepare(`
    SELECT s.*, u.username, u.display_name, u.avatar
    FROM stories s
    JOIN users u ON s.user_id = u.id
    WHERE (s.user_id = ? OR s.user_id IN (SELECT following_id FROM follows WHERE follower_id = ?))
    AND s.expires_at > ?
    ORDER BY s.created_at DESC
  `).all(req.user.id, req.user.id, now);

  // Group by user
  const grouped = stories.reduce((acc, s) => {
    if (!acc[s.user_id]) {
      acc[s.user_id] = {
        user_id: s.user_id,
        username: s.username,
        display_name: s.display_name,
        avatar: s.avatar,
        stories: []
      };
    }
    acc[s.user_id].stories.push(s);
    return acc;
  }, {});

  res.json(Object.values(grouped));
});

router.get('/user/:userId', auth, (req, res) => {
  const isMe = req.user.id === req.params.userId;
  let isFollowing = false;
  if (!isMe) {
    isFollowing = !!db.prepare('SELECT 1 FROM follows WHERE follower_id=? AND following_id=?').get(req.user.id, req.params.userId);
    
    // Check if blocked
    const amIBlocked = db.prepare('SELECT 1 FROM blocks WHERE blocker_id=? AND blocked_id=?').get(req.params.userId, req.user.id);
    if (amIBlocked) return res.status(403).json({ error: 'Blocked' });
    
    // User wants only followers to see stories
    if (!isFollowing) return res.json([]);
  }

  const stories = db.prepare('SELECT * FROM stories WHERE user_id=? ORDER BY created_at DESC').all(req.params.userId);
  res.json(stories);
});

router.delete('/:id', auth, (req, res) => {
  const story = db.prepare('SELECT 1 FROM stories WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!story) return res.status(404).json({ error: 'Story not found' });

  db.prepare('DELETE FROM stories WHERE id=?').run(req.params.id);
  res.json({ deleted: true });
});

module.exports = router;
