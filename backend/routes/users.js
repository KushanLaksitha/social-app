const express = require('express');
const db = require('../db/database');
const { auth, optionalAuth } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

router.get('/search', optionalAuth, (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);
  const users = db.prepare(`SELECT id, username, display_name, bio, avatar, followers_count, following_count FROM users WHERE username LIKE ? OR display_name LIKE ? LIMIT 20`).all(`%${q}%`, `%${q}%`);
  res.json(users);
});

router.get('/suggestions', auth, (req, res) => {
  const users = db.prepare(`
    SELECT id, username, display_name, bio, avatar, followers_count
    FROM users WHERE id != ?
    AND id NOT IN (SELECT following_id FROM follows WHERE follower_id = ?)
    ORDER BY followers_count DESC LIMIT 5
  `).all(req.user.id, req.user.id);
  res.json(users);
});

router.get('/:username', optionalAuth, (req, res) => {
  const user = db.prepare('SELECT id, username, display_name, bio, education, avatar, cover, followers_count, following_count, posts_count, created_at FROM users WHERE username=?').get(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found' });

  let isFollowing = false;
  let isBlocked = false;
  if (req.user) {
    const follow = db.prepare('SELECT 1 FROM follows WHERE follower_id=? AND following_id=?').get(req.user.id, user.id);
    isFollowing = !!follow;

    const block = db.prepare('SELECT 1 FROM blocks WHERE blocker_id=? AND blocked_id=?').get(req.user.id, user.id);
    isBlocked = !!block;

    // If the viewing user is blocked by the profile owner, hide profile or return error
    const amIBlocked = db.prepare('SELECT 1 FROM blocks WHERE blocker_id=? AND blocked_id=?').get(user.id, req.user.id);
    if (amIBlocked) return res.status(403).json({ error: 'You are blocked by this user' });
  }
  res.json({ ...user, isFollowing, isBlocked });
});
router.post('/:id/follow', auth, (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: "Can't follow yourself" });

  const isBlockedByMe = db.prepare('SELECT 1 FROM blocks WHERE blocker_id=? AND blocked_id=?').get(req.user.id, req.params.id);
  const amIBlocked = db.prepare('SELECT 1 FROM blocks WHERE blocker_id=? AND blocked_id=?').get(req.params.id, req.user.id);
  if (isBlockedByMe || amIBlocked) return res.status(403).json({ error: "Cannot follow while blocked" });

  const existing = db.prepare('SELECT 1 FROM follows WHERE follower_id=? AND following_id=?').get(req.user.id, req.params.id);
  if (existing) {
    db.prepare('DELETE FROM follows WHERE follower_id=? AND following_id=?').run(req.user.id, req.params.id);
    db.prepare('UPDATE users SET followers_count = MAX(0, followers_count-1) WHERE id=?').run(req.params.id);
    db.prepare('UPDATE users SET following_count = MAX(0, following_count-1) WHERE id=?').run(req.user.id);
    return res.json({ following: false });
  }

  db.prepare('INSERT INTO follows (follower_id, following_id) VALUES (?,?)').run(req.user.id, req.params.id);
  db.prepare('UPDATE users SET followers_count = followers_count+1 WHERE id=?').run(req.params.id);
  db.prepare('UPDATE users SET following_count = following_count+1 WHERE id=?').run(req.user.id);

  // Notification
  db.prepare('INSERT INTO notifications (id, user_id, actor_id, type) VALUES (?,?,?,?)').run(uuidv4(), req.params.id, req.user.id, 'follow');

  res.json({ following: true });
});

router.get('/:id/followers', (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.username, u.display_name, u.avatar, u.bio, u.followers_count
    FROM follows f JOIN users u ON f.follower_id = u.id WHERE f.following_id=?
  `).all(req.params.id);
  res.json(users);
});

router.get('/:id/following', (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.username, u.display_name, u.avatar, u.bio, u.followers_count
    FROM follows f JOIN users u ON f.following_id = u.id WHERE f.follower_id=?
  `).all(req.params.id);
  res.json(users);
});

router.post('/:id/block', auth, (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: "Can't block yourself" });

  const existing = db.prepare('SELECT 1 FROM blocks WHERE blocker_id=? AND blocked_id=?').get(req.user.id, req.params.id);
  if (existing) {
    db.prepare('DELETE FROM blocks WHERE blocker_id=? AND blocked_id=?').run(req.user.id, req.params.id);
    return res.json({ blocked: false });
  }

  // Unfollow both ways if blocking
  const follow1 = db.prepare('SELECT 1 FROM follows WHERE follower_id=? AND following_id=?').get(req.user.id, req.params.id);
  if (follow1) {
    db.prepare('DELETE FROM follows WHERE follower_id=? AND following_id=?').run(req.user.id, req.params.id);
    db.prepare('UPDATE users SET followers_count = MAX(0, followers_count-1) WHERE id=?').run(req.params.id);
    db.prepare('UPDATE users SET following_count = MAX(0, following_count-1) WHERE id=?').run(req.user.id);
  }

  const follow2 = db.prepare('SELECT 1 FROM follows WHERE follower_id=? AND following_id=?').get(req.params.id, req.user.id);
  if (follow2) {
    db.prepare('DELETE FROM follows WHERE follower_id=? AND following_id=?').run(req.params.id, req.user.id);
    db.prepare('UPDATE users SET followers_count = MAX(0, followers_count-1) WHERE id=?').run(req.user.id);
    db.prepare('UPDATE users SET following_count = MAX(0, following_count-1) WHERE id=?').run(req.params.id);
  }

  db.prepare('INSERT INTO blocks (blocker_id, blocked_id) VALUES (?,?)').run(req.user.id, req.params.id);
  res.json({ blocked: true });
});

router.get('/settings/blocked', auth, (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.username, u.display_name, u.avatar
    FROM blocks b JOIN users u ON b.blocked_id = u.id WHERE b.blocker_id=?
  `).all(req.user.id);
  res.json(users);
});

module.exports = router;
