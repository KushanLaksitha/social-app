import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../components/PostCard';

export default function Settings() {
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/users/settings/blocked')
      .then(r => setBlockedUsers(r.data))
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const handleUnblock = async (userId) => {
    if (window.confirm('Are you sure you want to unblock this user?')) {
      try {
        await api.post(`/users/${userId}/block`);
        setBlockedUsers(prev => prev.filter(u => u.id !== userId));
      } catch (e) {
        alert('Failed to unblock user');
      }
    }
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <div>Settings</div>
      </div>

      <div style={{ padding: 20 }}>
        <h3 style={{ marginBottom: 20 }}>Blocked Users</h3>
        {loading ? (
          <div className="spinner" />
        ) : blockedUsers.length === 0 ? (
          <div className="empty-state">No blocked users</div>
        ) : (
          <div className="user-list">
            {blockedUsers.map(u => (
              <div key={u.id} className="user-item" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <Avatar user={u} size="avatar-md" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{u.display_name}</div>
                  <div style={{ color: 'var(--text3)', fontSize: 13 }}>@{u.username}</div>
                </div>
                <button className="btn btn-outline" onClick={() => handleUnblock(u.id)}>Unblock</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
