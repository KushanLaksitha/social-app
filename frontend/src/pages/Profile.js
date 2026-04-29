import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../utils/api';
import PostCard from '../components/PostCard';
import { useAuth } from '../context/AuthContext';
import { Avatar } from '../components/PostCard';
import StoryViewer from '../components/StoryViewer';

export default function Profile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: me, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('posts');
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(`/users/${username}`).then(r => {
      setProfile(r.data);
      setEditData({ 
        display_name: r.data.display_name, 
        bio: r.data.bio || '', 
        education: r.data.education || '' 
      });
      return api.get(`/posts/user/${r.data.id}`);
    }).then(r => setPosts(r.data))
      .catch(() => navigate('/home'))
      .finally(() => setLoading(false));
  }, [username, navigate]);

  const handleFollow = async () => {
    const res = await api.post(`/users/${profile.id}/follow`);
    setProfile(prev => ({
      ...prev,
      isFollowing: res.data.following,
      followers_count: res.data.following ? prev.followers_count + 1 : prev.followers_count - 1
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('display_name', editData.display_name);
      formData.append('bio', editData.bio);
      formData.append('education', editData.education);
      if (editData.avatarFile) formData.append('avatar', editData.avatarFile);
      if (editData.coverFile) formData.append('cover', editData.coverFile);

      const res = await api.put('/auth/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setProfile(prev => ({ ...prev, ...res.data }));
      updateUser(res.data);
      setEditMode(false);
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to update profile');
    }
    setSaving(false);
  };

  const [pwData, setPwData] = useState({ old: '', new: '' });
  const [changingPw, setChangingPw] = useState(false);

  const handlePasswordChange = async () => {
    setChangingPw(true);
    try {
      await api.post('/auth/change-password', { 
        old_password: pwData.old, 
        new_password: pwData.new 
      });
      alert('Password changed successfully');
      setPwData({ old: '', new: '' });
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to change password');
    }
    setChangingPw(false);
  };

  const [viewImage, setViewImage] = useState(null);

  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);

  useEffect(() => {
    if (tab === 'followers' && profile) {
      api.get(`/users/${profile.id}/followers`).then(r => setFollowers(r.data));
    } else if (tab === 'following' && profile) {
      api.get(`/users/${profile.id}/following`).then(r => setFollowing(r.data));
    }
  }, [tab, profile]);

  if (loading) return <div className="loading"><div className="spinner" />Loading...</div>;
  if (!profile) return null;

  const isMe = me?.id === profile.id;

  const UserList = ({ users }) => (
    <div className="user-list">
      {users.length === 0 ? (
        <div className="empty-state" style={{ padding: 40 }}>No users found</div>
      ) : (
        users.map(u => (
          <div key={u.id} className="user-item" onClick={() => { navigate(`/profile/${u.username}`); setTab('posts'); }} style={{ cursor: 'pointer', padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center' }}>
            <Avatar user={u} size="avatar-sm" />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{u.display_name}</div>
              <div style={{ color: 'var(--text3)', fontSize: 13 }}>@{u.username}</div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div style={{ paddingBottom: 100 }}>
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <div>
          <div>{profile.display_name}</div>
          <div style={{ color: 'var(--text3)', fontSize: 12, fontWeight: 400 }}>{posts.length} posts</div>
        </div>
      </div>

      {/* Cover */}
      <div 
        onClick={() => profile.cover?.startsWith('/') && setViewImage(profile.cover)}
        style={{
          width: '100%', height: 160,
          background: profile.cover?.startsWith('/') ? `url(${profile.cover})` : profile.cover || 'linear-gradient(135deg, var(--accent), var(--pink))',
          backgroundSize: 'cover', backgroundPosition: 'center',
          cursor: profile.cover?.startsWith('/') ? 'pointer' : 'default'
        }} 
      />

      <div className="profile-info">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div className="profile-avatar-wrap" onClick={() => !profile.avatar?.startsWith('#') && setViewImage(profile.avatar)} style={{ cursor: profile.avatar?.startsWith('#') ? 'default' : 'pointer' }}>
            <Avatar user={profile} size="avatar-xl" />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {isMe ? (
              <button className="btn btn-outline" onClick={() => setEditMode(true)}>Edit Profile</button>
            ) : (
              <>
                <button className="btn btn-outline" onClick={() => {
                  api.post(`/chat/conversations/${profile.id}`).then(r => navigate(`/messages/${r.data.id}`));
                }}>Message</button>
                <button className={`btn-follow ${profile.isFollowing ? 'following' : ''}`} onClick={handleFollow}>
                  {profile.isFollowing ? 'Following' : 'Follow'}
                </button>
                <button 
                  className="btn btn-outline" 
                  style={{ color: profile.isBlocked ? 'var(--accent)' : 'inherit' }}
                  onClick={async () => {
                    if (window.confirm(`Are you sure you want to ${profile.isBlocked ? 'unblock' : 'block'} this user?`)) {
                      const res = await api.post(`/users/${profile.id}/block`);
                      setProfile(prev => ({ ...prev, isBlocked: res.data.blocked, isFollowing: false }));
                    }
                  }}
                >
                  {profile.isBlocked ? 'Unblock' : 'Block'}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="profile-name">{profile.display_name}</div>
        <div className="profile-username">@{profile.username}</div>
        
        {profile.bio && <div className="profile-bio" style={{ marginTop: 8 }}>{profile.bio}</div>}
        
        {profile.education && (
          <div style={{ marginTop: 8, fontSize: 14, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🎓</span> {profile.education}
          </div>
        )}

        <div style={{ color: 'var(--text3)', fontSize: 13, marginTop: 8, marginBottom: 12 }}>
          📅 Joined {format(new Date(profile.created_at), 'MMMM yyyy')}
        </div>

        <div className="profile-stats">
          <div className="stat-item" onClick={() => setTab('following')} style={{ cursor: 'pointer' }}>
            <span className="stat-num">{profile.following_count}</span>
            <span className="stat-label">Following</span>
          </div>
          <div className="stat-item" onClick={() => setTab('followers')} style={{ cursor: 'pointer' }}>
            <span className="stat-num">{profile.followers_count}</span>
            <span className="stat-label">Followers</span>
          </div>
        </div>
      </div>

      <HighlightsSection userId={profile.id} isMe={isMe} />

      <div className="tabs">
        <button className={`tab ${tab === 'posts' ? 'active' : ''}`} onClick={() => setTab('posts')}>Posts</button>
        <button className={`tab ${tab === 'followers' ? 'active' : ''}`} onClick={() => setTab('followers')}>Followers</button>
        <button className={`tab ${tab === 'following' ? 'active' : ''}`} onClick={() => setTab('following')}>Following</button>
      </div>

      {tab === 'posts' ? (
        posts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">✍️</div>
            <div className="empty-state-title">No posts yet</div>
          </div>
        ) : (
          posts.map(post => <PostCard key={post.id} post={post} onDelete={id => setPosts(prev => prev.filter(p => p.id !== id))} />)
        )
      ) : tab === 'followers' ? (
        <UserList users={followers} />
      ) : (
        <UserList users={following} />
      )}

      {/* Edit Modal */}
      {editMode && (
        <div className="modal-overlay" onClick={() => setEditMode(false)}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <button className="back-btn" onClick={() => setEditMode(false)}>✕</button>
              Edit Profile
              <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={handleSave} disabled={saving}>
                {saving ? '...' : 'Save'}
              </button>
            </div>
            <div style={{ padding: '20px', maxHeight: '80vh', overflowY: 'auto' }}>
              <div className="form-group">
                <label className="form-label">Avatar Photo</label>
                <input type="file" accept="image/*" onChange={e => setEditData(p => ({ ...p, avatarFile: e.target.files[0] }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Cover Photo</label>
                <input type="file" accept="image/*" onChange={e => setEditData(p => ({ ...p, coverFile: e.target.files[0] }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Display Name</label>
                <input className="form-input" value={editData.display_name} onChange={e => setEditData(p => ({ ...p, display_name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Bio</label>
                <textarea className="form-input" rows={2} value={editData.bio} onChange={e => setEditData(p => ({ ...p, bio: e.target.value.slice(0, 200) }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Education / Qualifications</label>
                <input className="form-input" placeholder="e.g. BS in Computer Science at MIT" value={editData.education} onChange={e => setEditData(p => ({ ...p, education: e.target.value }))} />
              </div>

              <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                <h4 style={{ marginBottom: 12 }}>Change Password</h4>
                <div className="form-group">
                  <label className="form-label">Current Password</label>
                  <input className="form-input" type="password" value={pwData.old} onChange={e => setPwData(p => ({ ...p, old: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input className="form-input" type="password" value={pwData.new} onChange={e => setPwData(p => ({ ...p, new: e.target.value }))} />
                </div>
                <button className="btn btn-outline" style={{ width: '100%' }} onClick={handlePasswordChange} disabled={changingPw || !pwData.old || !pwData.new}>
                  {changingPw ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer */}
      {viewImage && (
        <div className="modal-overlay" onClick={() => setViewImage(null)} style={{ background: 'rgba(0,0,0,0.9)' }}>
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <button className="back-btn" onClick={() => setViewImage(null)} style={{ position: 'absolute', top: -40, right: 0, color: 'white' }}>✕</button>
            <img src={viewImage} alt="Full size" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 12 }} />
          </div>
        </div>
      )}
    </div>
  );
}

function HighlightsSection({ userId, isMe }) {
  const [highlights, setHighlights] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedStories, setSelectedStories] = useState([]);
  const [allStories, setAllStories] = useState([]);
  const [title, setTitle] = useState('');
  const [activeHighlight, setActiveHighlight] = useState(null);

  useEffect(() => {
    api.get(`/highlights/user/${userId}`).then(r => setHighlights(r.data));
  }, [userId]);

  const openCreate = () => {
    api.get(`/stories/user/${userId}`).then(r => {
      setAllStories(r.data);
      setShowCreate(true);
    });
  };

  const handleCreate = async () => {
    if (!title || !selectedStories.length) return alert('Please enter a title and select stories');
    try {
      const res = await api.post('/highlights', {
        title,
        story_ids: selectedStories,
        cover_url: allStories.find(s => s.id === selectedStories[0])?.media_url || ''
      });
      setHighlights([res.data, ...highlights]);
      setShowCreate(false);
      setTitle('');
      setSelectedStories([]);
    } catch (e) {
      alert('Failed to create highlight');
    }
  };

  const handleDeleteHighlight = async (e, id) => {
    e.stopPropagation();
    if (window.confirm('Delete this highlight?')) {
      try {
        await api.delete(`/highlights/${id}`);
        setHighlights(prev => prev.filter(h => h.id !== id));
      } catch (e) {
        alert('Failed to delete highlight');
      }
    }
  };

  return (
    <div className="highlights-container" style={{ padding: '0 20px', marginBottom: 20, display: 'flex', gap: 16, overflowX: 'auto', scrollbarWidth: 'none' }}>
      {isMe && (
        <div className="highlight-item" onClick={openCreate} style={{ textAlign: 'center', cursor: 'pointer' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', border: '1px dashed var(--text3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>+</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>New</div>
        </div>
      )}
      {highlights.map(h => (
        <div key={h.id} className="highlight-item" onClick={() => setActiveHighlight(h)} style={{ textAlign: 'center', cursor: 'pointer', position: 'relative' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', border: '2px solid var(--border)', overflow: 'hidden', padding: 2 }}>
            <img src={h.cover_url || '/placeholder-avatar.png'} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
          </div>
          <div style={{ fontSize: 12, marginTop: 4, maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.title}</div>
          {isMe && (
            <button 
              onClick={(e) => handleDeleteHighlight(e, h.id)} 
              style={{ position: 'absolute', top: -5, right: -5, background: 'var(--red)', color: 'white', border: 'none', borderRadius: '50%', width: 20, height: 20, fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              ✕
            </button>
          )}
        </div>
      ))}

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <button className="back-btn" onClick={() => setShowCreate(false)}>✕</button>
              New Highlight
              <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={handleCreate}>Create</button>
            </div>
            <div style={{ padding: 20 }}>
              <input className="form-input" placeholder="Highlight Title" value={title} onChange={e => setTitle(e.target.value)} style={{ marginBottom: 16 }} />
              <div style={{ maxHeight: 300, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {allStories.map(s => (
                  <div key={s.id} onClick={() => {
                    setSelectedStories(prev => prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]);
                  }} style={{ aspectRatio: '9/16', position: 'relative', cursor: 'pointer', opacity: selectedStories.includes(s.id) ? 1 : 0.6 }}>
                    {s.media_type === 'image' ? (
                      <img src={s.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }} alt="" />
                    ) : (
                      <video src={s.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }} />
                    )}
                    {selectedStories.includes(s.id) && <div style={{ position: 'absolute', top: 4, right: 4, background: 'var(--accent)', color: 'white', borderRadius: '50%', width: 18, height: 18, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeHighlight && <StoryViewer groupedStories={[{ ...activeHighlight, stories: activeHighlight.stories }]} initialUserIndex={0} onClose={() => setActiveHighlight(null)} />}
    </div>
  );
}
