import React, { useState, useEffect, useRef } from 'react';
import { Avatar } from './PostCard';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function StoryViewer({ groupedStories, initialUserIndex, onClose }) {
  const { user } = useAuth();
  const [userIndex, setUserIndex] = useState(initialUserIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  
  const currentUser = groupedStories[userIndex];
  const currentStory = currentUser.stories[storyIndex];

  useEffect(() => {
    // Record view
    if (currentStory) {
      api.post(`/stories/${currentStory.id}/view`).catch(() => {});
    }
  }, [currentStory]);

  const handleLike = async (e) => {
    e.stopPropagation();
    try {
      const res = await api.post(`/stories/${currentStory.id}/like`);
      currentStory.liked = res.data.liked;
      currentStory.likes_count = res.data.liked ? (currentStory.likes_count || 0) + 1 : (currentStory.likes_count || 0) - 1;
      // Trigger re-render (hacky for this local state)
      setStoryIndex(storyIndex);
    } catch (e) {
      alert('Failed to like story');
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      await api.post(`/stories/${currentStory.id}/reply`, { content: reply });
      setReply('');
      alert('Reply sent!');
    } catch (e) {
      alert('Failed to send reply');
    }
    setSending(false);
  };

  const handleDelete = async () => {
    if (window.confirm('Delete this story?')) {
      try {
        await api.delete(`/stories/${currentStory.id}`);
        // For simplicity, just close the viewer and let parent refresh
        onClose();
      } catch (e) {
        alert('Failed to delete story');
      }
    }
  };

  useEffect(() => {
    let timer;
    if (currentStory.media_type === 'image') {
      timer = setTimeout(handleNext, 5000);
    }
    return () => clearTimeout(timer);
  }, [userIndex, storyIndex, currentStory]);

  const handleNext = () => {
    if (storyIndex < currentUser.stories.length - 1) {
      setStoryIndex(storyIndex + 1);
    } else if (userIndex < groupedStories.length - 1) {
      setUserIndex(userIndex + 1);
      setStoryIndex(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (storyIndex > 0) {
      setStoryIndex(storyIndex - 1);
    } else if (userIndex > 0) {
      setUserIndex(userIndex - 1);
      setStoryIndex(groupedStories[userIndex - 1].stories.length - 1);
    }
  };

  if (!currentStory) return null;

  return (
    <div className="story-viewer-overlay" onClick={onClose}>
      <div className="story-viewer-content" onClick={e => e.stopPropagation()}>
        <div className="story-progress-bar">
          {currentUser.stories.map((_, i) => (
            <div key={i} className="progress-bg">
              <div 
                className={`progress-fill ${i < storyIndex ? 'filled' : i === storyIndex ? 'active' : ''}`} 
                style={{ animationDuration: currentStory.media_type === 'image' ? '5s' : 'auto' }}
              />
            </div>
          ))}
        </div>
        <div className="story-header">
          <Avatar user={currentUser} size="avatar-sm" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>{currentUser.display_name}</div>
          </div>
          {user?.id === currentUser.user_id && (
            <button onClick={handleDelete} style={{ color: 'var(--red)', fontSize: 14, marginRight: 10, fontWeight: 600 }}>Delete</button>
          )}
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="story-media">
          {currentStory.media_type === 'image' ? (
            <img src={currentStory.media_url} alt="" />
          ) : (
            <video 
              src={currentStory.media_url} 
              autoPlay 
              playsInline 
              onEnded={handleNext} 
            />
          )}
        </div>
        <div className="story-nav">
          <div className="nav-area left" onClick={handlePrev} />
          <div className="nav-area right" onClick={handleNext} />
        </div>

        {/* Footer actions */}
        <div className="story-footer" onClick={e => e.stopPropagation()}>
          <div className="story-stats">
            <div className="story-stat">
              <span style={{ fontSize: 18 }}>👁️</span> {currentStory.views_count || 0}
            </div>
            <button className={`story-stat ${currentStory.liked ? 'liked' : ''}`} onClick={handleLike}>
              <span style={{ fontSize: 18 }}>{currentStory.liked ? '❤️' : '🤍'}</span> {currentStory.likes_count || 0}
            </button>
          </div>
          
          {user?.id !== currentUser.user_id && (
            <form className="story-reply-form" onSubmit={handleReply}>
              <input 
                placeholder="Reply to story..." 
                value={reply} 
                onChange={e => setReply(e.target.value)}
                disabled={sending}
              />
              <button type="submit" disabled={sending || !reply.trim()}>Send</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
