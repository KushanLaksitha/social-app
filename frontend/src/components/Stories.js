import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { Avatar } from './PostCard';
import { useAuth } from '../context/AuthContext';
import StoryViewer from './StoryViewer';

export default function Stories() {
  const { user } = useAuth();
  const [groupedStories, setGroupedStories] = useState([]);
  const [viewing, setViewing] = useState(null); // { userIndex: number, storyIndex: number }
  const fileInputRef = useRef();

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      const res = await api.get('/stories/feed');
      setGroupedStories(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('media', file);

    try {
      await api.post('/stories', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchStories();
    } catch (e) {
      alert('Failed to upload story');
    }
  };

  return (
    <div className="stories-bar">
      <div className="story-item" onClick={() => fileInputRef.current.click()}>
        <div className="story-add-btn">+</div>
        <div className="story-username">Your Story</div>
        <input type="file" ref={fileInputRef} onChange={handleFileSelect} hidden accept="image/*,video/*" />
      </div>

      {groupedStories.map((group, index) => (
        <div key={group.user_id} className="story-item" onClick={() => setViewing({ userIndex: index, storyIndex: 0 })}>
          <div className="story-circle">
            <Avatar user={group} />
          </div>
          <div className="story-username">{group.display_name}</div>
        </div>
      ))}

      {viewing && (
        <StoryViewer 
          groupedStories={groupedStories} 
          initialUserIndex={viewing.userIndex} 
          onClose={() => { setViewing(null); fetchStories(); }} 
        />
      )}
    </div>
  );
}


