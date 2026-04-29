const express = require('express');
const db = require('../db/database');
const { auth } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { saveEncrypted } = require('../utils/encryption');

const router = express.Router();

const enrichStory = (story, userId) => {
  if (!story) return null;
  let liked = false;
  if (userId) {
    liked = !!db.prepare('SELECT 1 FROM story_likes WHERE story_id=? AND user_id=?').get(story.id, userId);
  }
  return { ...story, liked };
};

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
    AND s.user_id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = ?)
    AND s.user_id NOT IN (SELECT blocker_id FROM blocks WHERE blocked_id = ?)
    AND s.expires_at > ?
    ORDER BY s.created_at DESC
  `).all(req.user.id, req.user.id, req.user.id, req.user.id, now);

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
    acc[s.user_id].stories.push(enrichStory(s, req.user.id));
    return acc;
  }, {});

  res.json(Object.values(grouped));
});

router.post('/:id/view', auth, (req, res) => {
  const existing = db.prepare('SELECT 1 FROM story_views WHERE story_id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!existing) {
    db.prepare('INSERT INTO story_views (story_id, user_id) VALUES (?,?)').run(req.params.id, req.user.id);
    db.prepare('UPDATE stories SET views_count = views_count + 1 WHERE id=?').run(req.params.id);
    return res.json({ viewed: true });
  }
  res.json({ viewed: false });
});

router.post('/:id/like', auth, (req, res) => {
  const existing = db.prepare('SELECT 1 FROM story_likes WHERE story_id=? AND user_id=?').get(req.params.id, req.user.id);
  if (existing) {
    db.prepare('DELETE FROM story_likes WHERE story_id=? AND user_id=?').run(req.params.id, req.user.id);
    db.prepare('UPDATE stories SET likes_count = MAX(0, likes_count - 1) WHERE id=?').run(req.params.id);
    return res.json({ liked: false });
  }
  db.prepare('INSERT INTO story_likes (story_id, user_id) VALUES (?,?)').run(req.params.id, req.user.id);
  db.prepare('UPDATE stories SET likes_count = likes_count + 1 WHERE id=?').run(req.params.id);
  res.json({ liked: true });
});

router.post('/:id/reply', auth, (req, res) => {
  const story = db.prepare('SELECT * FROM stories WHERE id=?').get(req.params.id);
  if (!story) return res.status(404).json({ error: 'Story not found' });
  if (story.user_id === req.user.id) return res.status(400).json({ error: "Can't reply to yourself" });

  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Reply required' });

  // Find or create conversation
  const [a, b] = [req.user.id, story.user_id].sort();
  let conv = db.prepare('SELECT id FROM conversations WHERE (user1_id=? AND user2_id=?) OR (user1_id=? AND user2_id=?)').get(a, b, b, a);
  if (!conv) {
    const cid = uuidv4();
    db.prepare('INSERT INTO conversations (id, user1_id, user2_id) VALUES (?,?,?)').run(cid, a, b);
    conv = { id: cid };
  }

  const mid = uuidv4();
  const replyContent = `Replied to your story: ${content.trim()}`;
  db.prepare('INSERT INTO messages (id, conversation_id, sender_id, content) VALUES (?,?,?,?)').run(mid, conv.id, req.user.id, replyContent);
  db.prepare('UPDATE conversations SET last_message=?, last_message_at=CURRENT_TIMESTAMP WHERE id=?').run(replyContent.substring(0, 100), conv.id);

  res.json({ success: true });
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
  res.json(stories.map(s => enrichStory(s, req.user.id)));
});

router.delete('/:id', auth, (req, res) => {
  const story = db.prepare('SELECT 1 FROM stories WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!story) return res.status(404).json({ error: 'Story not found' });

  db.prepare('DELETE FROM stories WHERE id=?').run(req.params.id);
  res.json({ deleted: true });
});

module.exports = router;
