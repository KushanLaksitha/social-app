import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow } from '../utils/time';

const Avatar = ({ user, size = '' }) => {
  const bg = user?.avatar?.startsWith('#') ? user.avatar : '#6C63FF';
  const isColor = user?.avatar?.startsWith('#') || !user?.avatar;
  return (
    <div className={`avatar ${size}`} style={{ background: isColor ? bg : 'transparent' }}>
      {isColor
        ? (user?.display_name?.[0] || '?').toUpperCase()
        : <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />}
    </div>
  );
};

export { Avatar };

export default function PostCard({ post: initialPost, onDelete, showThread = false }) {
  const [post, setPost] = useState(initialPost);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && post.id && !post.repost_of) {
      api.post(`/posts/${post.id}/view`).catch(() => {});
    }
  }, [post.id, user, post.repost_of]);

  const handleLike = async (e) => {
    e.stopPropagation();
    if (!user) return navigate('/login');
    const prev = { liked: post.liked, likes_count: post.likes_count };
    setPost(p => ({ ...p, liked: !p.liked, likes_count: p.liked ? p.likes_count - 1 : p.likes_count + 1 }));
    try { await api.post(`/posts/${post.id}/like`); }
    catch { setPost(p => ({ ...p, ...prev })); }
  };

  const handleRepost = async (e) => {
    e.stopPropagation();
    if (!user) return navigate('/login');
    const prev = { reposted: post.reposted, reposts_count: post.reposts_count };
    setPost(p => ({ ...p, reposted: !p.reposted, reposts_count: p.reposted ? p.reposts_count - 1 : p.reposts_count + 1 }));
    try { await api.post(`/posts/${post.id}/repost`); }
    catch { setPost(p => ({ ...p, ...prev })); }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this post?')) return;
    await api.delete(`/posts/${post.id}`);
    onDelete?.(post.id);
  };

  const goToPost = () => navigate(`/post/${post.id}`);
  const goToProfile = (e, username) => { e.stopPropagation(); navigate(`/profile/${username}`); };

  const timeAgo = formatDistanceToNow(post.created_at);

  return (
    <article className="post-card" onClick={goToPost}>
      {post.repostOf && !post.repost_of && (
        <div style={{ color: 'var(--text3)', fontSize: 12, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>🔁</span> <span>{post.author?.display_name} reposted</span>
        </div>
      )}

      {post.repost_of && post.repostOf ? (
        // This is a repost entry showing reposted content
        <>
          <div style={{ color: 'var(--text3)', fontSize: 12, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Avatar user={post.author} size="avatar-sm" />
            <span><strong style={{ color: 'var(--text2)' }}>{post.author?.display_name}</strong> reposted</span>
          </div>
          <div className="repost-card" onClick={e => { e.stopPropagation(); navigate(`/post/${post.repost_of}`); }}>
            <div className="post-header" style={{ marginBottom: 8 }}>
              <Avatar user={post.repostOf.author} size="avatar-sm" />
              <div className="post-author">
                <span className="display-name" onClick={e => goToProfile(e, post.repostOf.author?.username)}>{post.repostOf.author?.display_name}</span>
                <span className="username-tag">@{post.repostOf.author?.username}</span>
              </div>
            </div>
            <div className="post-content" style={{ fontSize: 14 }}>{post.repostOf.content}</div>
          </div>
        </>
      ) : (
        <>
          <div className="post-header">
            <div onClick={e => goToProfile(e, post.author?.username)}>
              <Avatar user={post.author} />
            </div>
            <div className="post-author">
              <span className="display-name" onClick={e => goToProfile(e, post.author?.username)}>{post.author?.display_name}</span>
              <span className="username-tag">@{post.author?.username}</span>
            </div>
            <span className="post-time" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span title={`Visible to: ${post.visibility || 'public'}`} style={{ fontSize: 11 }}>
                {post.visibility === 'onlyme' ? '🔒' : post.visibility === 'followers' ? '👥' : '🌐'}
              </span>
              {timeAgo}
            </span>
            {user?.id === post.user_id && (
              <button onClick={handleDelete} style={{ color: 'var(--red)', fontSize: 14, padding: '4px 8px', borderRadius: 6, marginLeft: 4 }}>🗑</button>
            )}
          </div>

          <div className="post-content">{post.content}</div>
          {post.image && <img src={post.image} alt="post" className="post-image" />}
          {post.video && (
            <video className="post-video" controls>
              <source src={post.video} />
              Your browser does not support the video tag.
            </video>
          )}
        </>
      )}

      <div className="post-actions" onClick={e => e.stopPropagation()}>
        <button className="action-btn" onClick={e => { e.stopPropagation(); goToPost(); }}>
          💬 <span>{post.comments_count}</span>
        </button>
        <button className={`action-btn ${post.reposted ? 'reposted' : ''}`} onClick={handleRepost}>
          🔁 <span>{post.reposts_count}</span>
        </button>
        <button className={`action-btn ${post.liked ? 'liked' : ''}`} onClick={handleLike}>
          {post.liked ? '❤️' : '🤍'} <span>{post.likes_count}</span>
        </button>
        <div className="action-btn" style={{ cursor: 'default' }}>
          👁️ <span>{post.views_count || 0}</span>
        </div>
      </div>
    </article>
  );
}
