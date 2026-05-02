import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Avatar } from '../components/PostCard';
import { formatDistanceToNow } from '../utils/time';

  repost: 'reposted your post',
  ban: 'Your account has been banned',
  post_removed: 'Your post was removed',
};
const NOTIF_ICONS = { like: '❤️', reply: '💬', follow: '👤', repost: '🔁', ban: '🚫', post_removed: '🗑️' };

export default function Notifications() {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/notifications').then(r => setNotifs(r.data)).finally(() => setLoading(false));
    api.put('/notifications/read').catch(() => {});
  }, []);

  const handleClick = (n) => {
    if (n.type === 'follow') navigate(`/profile/${n.actor_username}`);
    else if (n.post_id) navigate(`/post/${n.post_id}`);
  };

  return (
    <div>
      <div className="page-header">Notifications</div>

      {loading ? (
        <div className="loading"><div className="spinner" />Loading...</div>
      ) : notifs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔔</div>
          <div className="empty-state-title">No notifications</div>
          <p>When someone likes or replies, you'll see it here.</p>
        </div>
      ) : (
        notifs.map(n => (
          <div key={n.id} className={`notif-item ${!n.read ? 'unread' : ''}`} onClick={() => handleClick(n)} style={{ cursor: 'pointer' }}>
            <span className="notif-icon">{NOTIF_ICONS[n.type] || '🔔'}</span>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Avatar user={{ display_name: n.actor_name, avatar: n.actor_avatar, username: n.actor_username }} size="avatar-sm" />
              <div>
                <div className="notif-text">
                  <strong>{n.actor_name}</strong> {NOTIF_TEXT[n.type] || 'interacted with you'}
                </div>
                {n.message && (
                  <div className="notif-message" style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4, background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: 4 }}>
                    {n.message}
                  </div>
                )}
                <div className="notif-time">
                  {formatDistanceToNow(n.created_at)}
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
