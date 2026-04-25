import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import PostCard from '../components/PostCard';

export default function Explore() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/posts/explore').then(r => setPosts(r.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">Explore</div>

      {loading ? (
        <div className="loading"><div className="spinner" />Loading...</div>
      ) : posts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <div className="empty-state-title">Nothing to explore yet</div>
        </div>
      ) : (
        posts.map(post => <PostCard key={post.id} post={post} onDelete={id => setPosts(prev => prev.filter(p => p.id !== id))} />)
      )}
    </div>
  );
}
