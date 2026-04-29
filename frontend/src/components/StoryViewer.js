import React, { useState, useEffect, useRef } from 'react';
import { Avatar } from './PostCard';

export default function StoryViewer({ groupedStories, initialUserIndex, onClose }) {
  const [userIndex, setUserIndex] = useState(initialUserIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const currentUser = groupedStories[userIndex];
  const currentStory = currentUser.stories[storyIndex];

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
      </div>
    </div>
  );
}
