const express = require('express');
const { adminAuth, auth } = require('../middleware/auth');
const db = require('../db/database');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// --- Reports (User reporting posts) ---
router.post('/report', auth, (req, res) => {
  try {
    const { post_id, reason } = req.body;
    if (!post_id || !reason) return res.status(400).json({ error: 'Post ID and reason required' });

    const id = uuidv4();
    db.prepare('INSERT INTO reports (id, reporter_id, post_id, reason) VALUES (?, ?, ?, ?)')
      .run(id, req.user.id, post_id, reason);

    res.json({ message: 'Report submitted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Admin Requests (User messaging admin) ---
router.post('/request', auth, (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) return res.status(400).json({ error: 'Subject and message required' });

    const id = uuidv4();
    db.prepare('INSERT INTO admin_requests (id, user_id, subject, message) VALUES (?, ?, ?, ?)')
      .run(id, req.user.id, subject, message);

    res.json({ message: 'Request sent to admin successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Admin Dashboard Stats ---
router.get('/stats', adminAuth, (req, res) => {
  try {
    const usersCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const postsCount = db.prepare('SELECT COUNT(*) as count FROM posts').get().count;
    const reportsCount = db.prepare('SELECT COUNT(*) as count FROM reports WHERE status="pending"').get().count;
    const requestsCount = db.prepare('SELECT COUNT(*) as count FROM admin_requests WHERE status="open"').get().count;

    res.json({ usersCount, postsCount, reportsCount, requestsCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- User Management ---
router.get('/users', adminAuth, (req, res) => {
  try {
    const users = db.prepare('SELECT id, username, display_name, email, role, is_banned, ban_reason, created_at FROM users ORDER BY created_at DESC').all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/users/:id/ban', adminAuth, (req, res) => {
  try {
    const { is_banned, reason } = req.body;
    const userId = req.params.id;

    db.prepare('UPDATE users SET is_banned = ?, ban_reason = ? WHERE id = ?')
      .run(is_banned ? 1 : 0, reason || '', userId);

    if (is_banned) {
      // Create notification for ban
      const notifId = uuidv4();
      db.prepare('INSERT INTO notifications (id, user_id, actor_id, type, message) VALUES (?, ?, ?, ?, ?)')
        .run(notifId, userId, req.user.id, 'ban', reason || 'Your account has been banned for violating community guidelines.');
    }

    res.json({ message: is_banned ? 'User banned' : 'User unbanned' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Report Management ---
router.get('/reports', adminAuth, (req, res) => {
  try {
    const reports = db.prepare(`
      SELECT r.*, u.username as reporter_username, p.content as post_content, p.user_id as post_author_id
      FROM reports r
      JOIN users u ON r.reporter_id = u.id
      JOIN posts p ON r.post_id = p.id
      ORDER BY r.created_at DESC
    `).all();
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/reports/:id/action', adminAuth, (req, res) => {
  try {
    const { action, reason } = req.body; // action: 'remove_post', 'dismiss'
    const reportId = req.params.id;

    const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(reportId);
    if (!report) return res.status(404).json({ error: 'Report not found' });

    if (action === 'remove_post') {
      const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(report.post_id);
      if (post) {
        // Notify user about post removal
        const notifId = uuidv4();
        db.prepare('INSERT INTO notifications (id, user_id, actor_id, type, post_id, message) VALUES (?, ?, ?, ?, ?, ?)')
          .run(notifId, post.user_id, req.user.id, 'post_removed', report.post_id, reason || 'Your post was removed for violating community guidelines.');
        
        // Delete physical files
        const mediaUrls = [post.image, post.video].filter(Boolean);
        mediaUrls.forEach(url => {
          const filename = url.split('/').pop();
          const filePath = path.join(__dirname, '../uploads', filename);
          if (fs.existsSync(filePath)) {
            try { fs.unlinkSync(filePath); } catch (e) { console.error('Failed to delete file:', filePath, e); }
          }
        });

        // Delete post
        db.prepare('DELETE FROM posts WHERE id = ?').run(report.post_id);
      }
      db.prepare('UPDATE reports SET status = "resolved" WHERE id = ?').run(reportId);
    } else if (action === 'dismiss') {
      db.prepare('UPDATE reports SET status = "dismissed" WHERE id = ?').run(reportId);
    }

    res.json({ message: 'Action taken' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Admin Request Management ---
router.get('/requests', adminAuth, (req, res) => {
  try {
    const requests = db.prepare(`
      SELECT r.*, u.username, u.display_name
      FROM admin_requests r
      JOIN users u ON r.user_id = u.id
      ORDER BY r.created_at DESC
    `).all();
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/requests/:id/resolve', adminAuth, (req, res) => {
  try {
    const requestId = req.params.id;
    db.prepare('UPDATE admin_requests SET status = "resolved" WHERE id = ?').run(requestId);
    res.json({ message: 'Request resolved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Announcements ---
router.post('/announcement', adminAuth, (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    const users = db.prepare('SELECT id FROM users WHERE role != "admin"').all();
    const insertNotif = db.prepare('INSERT INTO notifications (id, user_id, actor_id, type, message) VALUES (?, ?, ?, ?, ?)');
    
    users.forEach(u => {
      insertNotif.run(uuidv4(), u.id, req.user.id, 'announcement', message);
    });

    res.json({ message: 'Announcement sent to all users' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Admin Post Review (Search & View Any User Posts) ---
router.get('/user/:username/posts', adminAuth, (req, res) => {
  try {
    const user = db.prepare('SELECT id FROM users WHERE username = ?').get(req.params.username);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const posts = db.prepare('SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC').all(user.id);
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Direct Post Deletion by Admin ---
router.post('/posts/:id/delete', adminAuth, (req, res) => {
  try {
    const postId = req.params.id;
    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    // Delete physical files
    const mediaUrls = [post.image, post.video].filter(Boolean);
    mediaUrls.forEach(url => {
      const filename = url.split('/').pop();
      const filePath = path.join(__dirname, '../uploads', filename);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) { console.error('Failed to delete file:', filePath, e); }
      }
    });

    // Delete post
    db.prepare('DELETE FROM posts WHERE id = ?').run(postId);
    
    res.json({ message: 'Post deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
