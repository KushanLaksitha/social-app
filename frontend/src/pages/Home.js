import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import PostCard from '../components/PostCard';
import { useAuth } from '../context/AuthContext';
import { Avatar } from '../components/PostCard';
import ComposeModal from '../components/ComposeModal';
import Stories from '../components/Stories';

export default function Home() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [tab, setTab] = useState('for-you');

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = tab === 'following' ? '/posts/feed' : '/posts/explore';
      const res = await api.get(endpoint);
      setPosts(res.data);
    } catch {}
    setLoading(false);
  }, [tab]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handlePosted = (newPost) => setPosts(prev => [newPost, ...prev]);
  const handleDelete = (id) => setPosts(prev => prev.filter(p => p.id !== id));

  return (
    <div>
      <div className="page-header">
        <span style={{ fontFamily: 'var(--font-display)' }}>Home</span>
      </div>

      <Stories />

      <div className="tabs">
        <button className={`tab ${tab === 'for-you' ? 'active' : ''}`} onClick={() => setTab('for-you')}>For You</button>
        <button className={`tab ${tab === 'following' ? 'active' : ''}`} onClick={() => setTab('following')}>Following</button>
      </div>

      {user && (
        <div className="compose-box" onClick={() => setShowCompose(true)} style={{ cursor: 'pointer' }}>
          <Avatar user={user} />
          <div style={{ flex: 1, color: 'var(--text3)', fontSize: 16, padding: '8px 0', userSelect: 'none' }}>
            What's on your mind?
          </div>
          <button className="btn btn-primary" style={{ flexShrink: 0 }}>Post</button>
        </div>
      )}

      {loading ? (
        <div className="loading"><div className="spinner" /> Loading...</div>
      ) : posts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">✦</div>
          <div className="empty-state-title">Nothing here yet</div>
          <p>Follow some people to see their posts!</p>
        </div>
      ) : (
        posts.map(post => <PostCard key={post.id} post={post} onDelete={handleDelete} />)
      )}

      {showCompose && <ComposeModal onClose={() => setShowCompose(false)} onPosted={handlePosted} />}
    </div>
  );
}
