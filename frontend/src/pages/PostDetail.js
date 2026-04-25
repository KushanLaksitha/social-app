import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import PostCard from '../components/PostCard';
import { useAuth } from '../context/AuthContext';
import { Avatar } from '../components/PostCard';

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/posts/${id}`),
      api.get(`/posts/${id}/replies`)
    ]).then(([p, r]) => {
      setPost(p.data);
      setReplies(r.data);
    }).catch(() => navigate('/home'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const submitReply = async () => {
    if (!reply.trim() || !user) return;
    setPosting(true);
    try {
      const res = await api.post('/posts', { content: reply.trim(), parent_id: id });
      setReplies(prev => [...prev, res.data]);
      setReply('');
      setPost(prev => ({ ...prev, comments_count: prev.comments_count + 1 }));
    } catch {}
    setPosting(false);
  };

  if (loading) return <div className="loading"><div className="spinner" />Loading...</div>;
  if (!post) return null;

  return (
    <div>
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        Post
      </div>

      <PostCard post={post} onDelete={() => navigate('/home')} />

      {user && (
        <div className="compose-box" style={{ borderBottom: '1px solid var(--border)' }}>
          <Avatar user={user} />
          <div style={{ flex: 1 }}>
            <textarea
              className="compose-input"
              placeholder={`Reply to @${post.author?.username}...`}
              value={reply}
              onChange={e => setReply(e.target.value.slice(0, 280))}
              rows={2}
              style={{ width: '100%' }}
            />
            <div className="compose-footer">
              <span style={{ color: 'var(--text3)', fontSize: 13 }}>{280 - reply.length}</span>
              <button className="btn btn-primary" onClick={submitReply} disabled={!reply.trim() || posting}>
                {posting ? '...' : 'Reply'}
              </button>
            </div>
          </div>
        </div>
      )}

      {replies.length === 0 ? (
        <div className="empty-state" style={{ padding: '40px' }}>
          <div className="empty-state-icon">💬</div>
          <div className="empty-state-title">No replies yet</div>
          <p>Be the first to reply!</p>
        </div>
      ) : (
        replies.map(r => <PostCard key={r.id} post={r} onDelete={(rid) => setReplies(prev => prev.filter(x => x.id !== rid))} />)
      )}
    </div>
  );
}
