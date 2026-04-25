import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Avatar } from './PostCard';
import api from '../utils/api';

export default function ComposeModal({ onClose, onPosted, replyTo = null }) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [media, setMedia] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const textRef = useRef();
  const fileRef = useRef();

  const handleMediaChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      setError('File too large (max 50MB)');
      return;
    }
    setMedia(file);
    setPreview(URL.createObjectURL(file));
  };

  const removeMedia = () => {
    setMedia(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!content.trim() && !media) return;
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('content', content.trim());
      if (replyTo) formData.append('parent_id', replyTo.id);
      if (media) formData.append('media', media);

      const res = await api.post('/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onPosted?.(res.data);
      onClose();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to post');
    } finally {
      setLoading(false);
    }
  };

  const charCount = content.length;
  const maxChars = 280;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <button className="back-btn" onClick={onClose}>✕</button>
          {replyTo ? 'Reply' : 'New Post'}
        </div>

        {replyTo && (
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', opacity: 0.7 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
              <Avatar user={replyTo.author} size="avatar-sm" />
              <strong style={{ fontSize: 13 }}>{replyTo.author?.display_name}</strong>
            </div>
            <div style={{ fontSize: 14, color: 'var(--text2)', paddingLeft: 42 }}>{replyTo.content}</div>
          </div>
        )}

        <div style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <Avatar user={user} />
            <div style={{ flex: 1 }}>
              <textarea
                ref={textRef}
                className="compose-input"
                placeholder={replyTo ? `Reply to ${replyTo.author?.display_name}...` : "What's happening?"}
                value={content}
                onChange={e => setContent(e.target.value.slice(0, maxChars))}
                rows={4}
                autoFocus
                style={{ width: '100%' }}
              />

              {preview && (
                <div className="media-preview">
                  {media.type.startsWith('image/') ? (
                    <img src={preview} alt="preview" />
                  ) : (
                    <video src={preview} />
                  )}
                  <button className="remove-media" onClick={removeMedia}>✕</button>
                </div>
              )}

              <div className="compose-actions">
                <button className="media-btn" onClick={() => fileRef.current?.click()} title="Add Photo or Video">
                  🖼️
                </button>
                <input
                  type="file"
                  ref={fileRef}
                  hidden
                  accept="image/*,video/*"
                  onChange={handleMediaChange}
                />
              </div>
            </div>
          </div>

          {error && <div className="form-error" style={{ marginTop: 8 }}>{error}</div>}

          <div className="compose-footer">
            <div style={{ fontSize: 13, color: charCount > 260 ? 'var(--yellow)' : 'var(--text3)' }}>
              {maxChars - charCount} left
            </div>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={(!content.trim() && !media) || loading}
            >
              {loading ? '...' : replyTo ? 'Reply' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
