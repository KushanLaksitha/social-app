import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Avatar } from './PostCard';

export default function RightPanel() {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/users/suggestions').then(r => setSuggestions(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!query.trim()) { setSearchResults([]); return; }
    const t = setTimeout(() => {
      api.get(`/users/search?q=${encodeURIComponent(query)}`).then(r => setSearchResults(r.data)).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const handleFollow = async (userId) => {
    await api.post(`/users/${userId}/follow`);
    setSuggestions(prev => prev.filter(u => u.id !== userId));
  };

  return (
    <aside className="right-panel">
      <div className="search-input-wrap">
        <span className="search-icon">🔍</span>
        <input
          className="search-input"
          placeholder="Search people..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      {searchResults.length > 0 && (
        <div className="widget" style={{ marginBottom: 16 }}>
          <div className="widget-title">Results</div>
          {searchResults.slice(0, 6).map(u => (
            <div key={u.id} className="user-card" onClick={() => navigate(`/profile/${u.username}`)} style={{ cursor: 'pointer' }}>
              <Avatar user={u} size="avatar-sm" />
              <div className="user-card-info">
                <div className="user-card-name">{u.display_name}</div>
                <div className="user-card-username">@{u.username}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="widget">
          <div className="widget-title">Who to Follow</div>
          {suggestions.map(u => (
            <div key={u.id} className="user-card" style={{ marginBottom: 8 }}>
              <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, flex: 1 }} onClick={() => navigate(`/profile/${u.username}`)}>
                <Avatar user={u} size="avatar-sm" />
                <div className="user-card-info">
                  <div className="user-card-name">{u.display_name}</div>
                  <div className="user-card-username">{u.followers_count} followers</div>
                </div>
              </div>
              <button className="btn-follow" onClick={() => handleFollow(u.id)}>Follow</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ color: 'var(--text3)', fontSize: 12, marginTop: 8 }}>
        © 2026 Vibe · Built by Kushan Kumarasiri
      </div>
    </aside>
  );
}
