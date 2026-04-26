const express = require('express');
const db = require('../db/database');
const { auth, optionalAuth } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

const enrichPost = (post, userId) => {
  if (!post) return null;
  const author = db.prepare('SELECT id, username, display_name, avatar FROM users WHERE id=?').get(post.user_id);
  let liked = false, reposted = false;
  if (userId) {
    liked = !!db.prepare('SELECT 1 FROM likes WHERE user_id=? AND post_id=?').get(userId, post.id);
    reposted = !!db.prepare('SELECT 1 FROM reposts WHERE user_id=? AND post_id=?').get(userId, post.id);
  }
  let repostOf = null;
  if (post.repost_of) {
    const original = db.prepare('SELECT * FROM posts WHERE id=?').get(post.repost_of);
    if (original) {
      const origAuthor = db.prepare('SELECT id, username, display_name, avatar FROM users WHERE id=?').get(original.user_id);
      repostOf = { ...original, author: origAuthor };
    }
  }
  return { ...post, author, liked, reposted, repostOf };
};

// Feed - posts from followed users + own posts
router.get('/feed', auth, (req, res) => {
  const { cursor, limit = 20 } = req.query;
  let query = `
    SELECT p.* FROM posts p
    WHERE p.is_reply = 0 AND (
      p.user_id = ? OR
      (p.user_id IN (SELECT following_id FROM follows WHERE follower_id = ?) AND p.visibility != 'onlyme')
    )
    ${cursor ? 'AND p.created_at < ?' : ''}
    ORDER BY p.created_at DESC LIMIT ?
  `;
  const params = cursor ? [req.user.id, req.user.id, cursor, parseInt(limit)] : [req.user.id, req.user.id, parseInt(limit)];
  const posts = db.prepare(query).all(...params).map(p => enrichPost(p, req.user.id));
  res.json(posts);
});

// Explore / trending
router.get('/explore', optionalAuth, (req, res) => {
  const { cursor, limit = 20 } = req.query;
  const userId = req.user?.id;
  let query = `SELECT * FROM posts WHERE is_reply=0 AND visibility='public' ${cursor ? 'AND created_at < ?' : ''} ORDER BY likes_count DESC, created_at DESC LIMIT ?`;
  const params = cursor ? [cursor, parseInt(limit)] : [parseInt(limit)];
  const posts = db.prepare(query).all(...params).map(p => enrichPost(p, userId));
  res.json(posts);
});

// Create post
const path = require('path');
const fs = require('fs');
const { saveEncrypted } = require('../utils/encryption');

router.post('/', auth, (req, res, next) => {
  const upload = req.app.get('upload');
  const encryptUpload = req.app.get('encryptUpload');
  upload.single('media')(req, res, (uploadErr) => {
    if (uploadErr) return res.status(400).json({ error: 'File upload failed' });
    
    const { content, parent_id, visibility = 'public' } = req.body;
    if (!content?.trim() && !req.file) return res.status(400).json({ error: 'Content or media required' });

    let image = null;
    let video = null;

    if (req.file) {
      // Generate mime-prefixed .enc filename so server knows how to serve it
      const mime = req.file.mimetype;
      let prefix = 'img';
      if (mime === 'image/png') prefix = 'png';
      else if (mime === 'image/gif') prefix = 'gif';
      else if (mime === 'image/webp') prefix = 'webp';
      else if (mime.startsWith('video/webm')) prefix = 'webm';
      else if (mime.startsWith('video/')) prefix = 'vid';

      const encFilename = `${prefix}-${uuidv4()}.enc`;
      const encPath = path.join(__dirname, '../uploads', encFilename);
      saveEncrypted(req.file.buffer, encPath);
      req.file.buffer = null; // free memory

      const filePath = `/api/media/${encFilename}`;
      if (mime.startsWith('image/')) image = filePath;
      else if (mime.startsWith('video/')) video = filePath;
    }

    const id = uuidv4();
    const is_reply = parent_id ? 1 : 0;
    db.prepare('INSERT INTO posts (id, user_id, content, image, video, parent_id, is_reply, visibility) VALUES (?,?,?,?,?,?,?,?)')
      .run(id, req.user.id, (content || '').trim(), image, video, parent_id || null, is_reply, visibility);
    
    db.prepare('UPDATE users SET posts_count = posts_count+1 WHERE id=?').run(req.user.id);

    if (parent_id) {
      db.prepare('UPDATE posts SET comments_count = comments_count+1 WHERE id=?').run(parent_id);
      const parentPost = db.prepare('SELECT user_id FROM posts WHERE id=?').get(parent_id);
      if (parentPost && parentPost.user_id !== req.user.id) {
        db.prepare('INSERT INTO notifications (id, user_id, actor_id, type, post_id) VALUES (?,?,?,?,?)').run(uuidv4(), parentPost.user_id, req.user.id, 'reply', id);
      }
    }

    const post = db.prepare('SELECT * FROM posts WHERE id=?').get(id);
    res.json(enrichPost(post, req.user.id));
  });
});

// Get single post
router.get('/:id', optionalAuth, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id=?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  
  if (post.user_id !== req.user?.id) {
    if (post.visibility === 'onlyme') return res.status(403).json({ error: 'Private post' });
    if (post.visibility === 'followers') {
      if (!req.user) return res.status(403).json({ error: 'Followers only' });
      const follow = db.prepare('SELECT 1 FROM follows WHERE follower_id=? AND following_id=?').get(req.user.id, post.user_id);
      if (!follow) return res.status(403).json({ error: 'Followers only' });
    }
  }

  res.json(enrichPost(post, req.user?.id));
});

// Get replies to a post
router.get('/:id/replies', optionalAuth, (req, res) => {
  const posts = db.prepare('SELECT * FROM posts WHERE parent_id=? ORDER BY created_at ASC').all(req.params.id);
  res.json(posts.map(p => enrichPost(p, req.user?.id)));
});

// Like / Unlike
router.post('/:id/like', auth, (req, res) => {
  const existing = db.prepare('SELECT 1 FROM likes WHERE user_id=? AND post_id=?').get(req.user.id, req.params.id);
  if (existing) {
    db.prepare('DELETE FROM likes WHERE user_id=? AND post_id=?').run(req.user.id, req.params.id);
    db.prepare('UPDATE posts SET likes_count = MAX(0, likes_count-1) WHERE id=?').run(req.params.id);
    return res.json({ liked: false });
  }
  db.prepare('INSERT INTO likes (user_id, post_id) VALUES (?,?)').run(req.user.id, req.params.id);
  db.prepare('UPDATE posts SET likes_count = likes_count+1 WHERE id=?').run(req.params.id);

  const post = db.prepare('SELECT user_id FROM posts WHERE id=?').get(req.params.id);
  if (post && post.user_id !== req.user.id) {
    db.prepare('INSERT INTO notifications (id, user_id, actor_id, type, post_id) VALUES (?,?,?,?,?)').run(uuidv4(), post.user_id, req.user.id, 'like', req.params.id);
  }
  res.json({ liked: true });
});

// Repost
router.post('/:id/repost', auth, (req, res) => {
  const existing = db.prepare('SELECT 1 FROM reposts WHERE user_id=? AND post_id=?').get(req.user.id, req.params.id);
  if (existing) {
    db.prepare('DELETE FROM reposts WHERE user_id=? AND post_id=?').run(req.user.id, req.params.id);
    db.prepare('UPDATE posts SET reposts_count = MAX(0, reposts_count-1) WHERE id=?').run(req.params.id);
    // Remove repost post
    db.prepare('DELETE FROM posts WHERE user_id=? AND repost_of=?').run(req.user.id, req.params.id);
    return res.json({ reposted: false });
  }

  db.prepare('INSERT INTO reposts (user_id, post_id) VALUES (?,?)').run(req.user.id, req.params.id);
  db.prepare('UPDATE posts SET reposts_count = reposts_count+1 WHERE id=?').run(req.params.id);

  const original = db.prepare('SELECT * FROM posts WHERE id=?').get(req.params.id);
  const repostId = uuidv4();
  db.prepare('INSERT INTO posts (id, user_id, content, repost_of, is_reply) VALUES (?,?,?,?,0)').run(repostId, req.user.id, original.content, req.params.id);

  res.json({ reposted: true });
});

// Delete post
router.delete('/:id', auth, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!post) return res.status(404).json({ error: 'Not found or unauthorized' });
  db.prepare('DELETE FROM posts WHERE id=?').run(req.params.id);
  db.prepare('UPDATE users SET posts_count = MAX(0, posts_count-1) WHERE id=?').run(req.user.id);
  res.json({ deleted: true });
});

// User posts
router.get('/user/:userId', optionalAuth, (req, res) => {
  const isMe = req.user?.id === req.params.userId;
  let isFollowing = false;
  if (!isMe && req.user) {
    isFollowing = !!db.prepare('SELECT 1 FROM follows WHERE follower_id=? AND following_id=?').get(req.user.id, req.params.userId);
  }

  let query = 'SELECT * FROM posts WHERE user_id=? AND is_reply=0 ';
  if (!isMe) {
    if (isFollowing) query += "AND visibility != 'onlyme' ";
    else query += "AND visibility = 'public' ";
  }
  query += 'ORDER BY created_at DESC LIMIT 50';

  const posts = db.prepare(query).all(req.params.userId);
  res.json(posts.map(p => enrichPost(p, req.user?.id)));
});

// Record view
router.post('/:id/view', optionalAuth, (req, res) => {
  if (!req.user) return res.json({ viewed: false });
  
  const existing = db.prepare('SELECT 1 FROM post_views WHERE post_id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!existing) {
    db.prepare('INSERT INTO post_views (post_id, user_id) VALUES (?,?)').run(req.params.id, req.user.id);
    db.prepare('UPDATE posts SET views_count = views_count + 1 WHERE id=?').run(req.params.id);
    return res.json({ viewed: true });
  }
  res.json({ viewed: false });
});

module.exports = router;
