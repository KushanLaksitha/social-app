import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import ComposeModal from './ComposeModal';

const NAV = [
  { to: '/home', icon: '🏠', label: 'Home' },
  { to: '/explore', icon: '🔍', label: 'Explore' },
  { to: '/notifications', icon: '🔔', label: 'Notifications', badge: true },
  { to: '/messages', icon: '💬', label: 'Messages' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showCompose, setShowCompose] = useState(false);
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetch = () => api.get('/notifications/unread-count').then(r => setNotifCount(r.data.count)).catch(() => {});
    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <>
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-icon">✦</div>
          <span>Vibe</span>
        </div>

        {NAV.map(n => (
          <NavLink key={n.to} to={n.to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">{n.icon}</span>
            <span className="nav-label">{n.label}</span>
            {n.badge && notifCount > 0 && <span className="nav-badge">{notifCount > 99 ? '99+' : notifCount}</span>}
          </NavLink>
        ))}


        {user && (
          <NavLink to={`/profile/${user.username}`} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">👤</span>
            <span className="nav-label">Profile</span>
          </NavLink>
        )}

        <button className="btn-post" style={{ marginTop: 12 }} onClick={() => setShowCompose(true)}>
          + New Post
        </button>

        <div style={{ flex: 1 }} />

        {user && (
          <div className="nav-item" style={{ cursor: 'default', marginTop: 8 }}>
            <div className="avatar avatar-sm" style={{ background: user.avatar?.startsWith('#') ? user.avatar : '#6C63FF' }}>
              {user.avatar?.startsWith('#') ? user.display_name[0].toUpperCase() : <img src={user.avatar} alt="" />}
            </div>
            <div className="sidebar-user-info" style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.display_name}</div>
              <div style={{ color: 'var(--text3)', fontSize: 12 }}>@{user.username}</div>
            </div>
            <button onClick={handleLogout} title="Logout" style={{ color: 'var(--text3)', fontSize: 16, padding: '4px', borderRadius: '6px' }}>
              ↩
            </button>
          </div>
        )}
      </aside>

      {showCompose && <ComposeModal onClose={() => setShowCompose(false)} />}
    </>
  );
}
