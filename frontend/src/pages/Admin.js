import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchUser, setSearchUser] = useState(null);
  const [searchPosts, setSearchPosts] = useState([]);
  const [searchFollowers, setSearchFollowers] = useState([]);
  const [searchFollowing, setSearchFollowing] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchTab, setSearchTab] = useState('posts');

  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/home');
    } else if (user) {
      fetchData();
    }
  }, [user, navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/admin/reports'),
        api.get('/admin/requests')
      ]);
      
      if (results[0].status === 'fulfilled') setStats(results[0].value.data);
      if (results[1].status === 'fulfilled') setUsers(results[1].value.data);
      if (results[2].status === 'fulfilled') setReports(results[2].value.data);
      if (results[3].status === 'fulfilled') setRequests(results[3].value.data);

    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (userId, isBanned) => {
    const reason = isBanned ? prompt('Enter reason for ban:') : '';
    if (isBanned && !reason) return;

    try {
      const res = await api.post(`/admin/users/${userId}/ban`, { is_banned: isBanned, reason });
      if (res.status === 200) {
        setUsers(users.map(u => u.id === userId ? { ...u, is_banned: isBanned ? 1 : 0, ban_reason: reason } : u));
        alert(isBanned ? 'User banned' : 'User unbanned');
      }
    } catch (error) {
      console.error('Error banning user:', error);
    }
  };

  const handleReportAction = async (reportId, action) => {
    const reason = action === 'remove_post' ? prompt('Enter reason for post removal (user will see this):') : '';
    if (action === 'remove_post' && !reason) return;

    try {
      const res = await api.post(`/admin/reports/${reportId}/action`, { action, reason });
      if (res.status === 200) {
        setReports(reports.map(r => r.id === reportId ? { ...r, status: action === 'dismiss' ? 'dismissed' : 'resolved' } : r));
        alert('Action completed');
      }
    } catch (error) {
      console.error('Error taking report action:', error);
    }
  };

  const handleResolveRequest = async (requestId) => {
    try {
      const res = await api.post(`/admin/requests/${requestId}/resolve`);
      if (res.status === 200) {
        setRequests(requests.map(r => r.id === requestId ? { ...r, status: 'resolved' } : r));
        alert('Request marked as resolved');
      }
    } catch (error) {
      console.error('Error resolving request:', error);
    }
  };

  const handleAnnouncement = async () => {
    const message = prompt('Enter announcement message (this will be sent as a notification to ALL users):');
    if (!message) return;
    try {
      await api.post('/admin/announcement', { message });
      alert('Announcement sent successfully!');
    } catch (e) {
      alert('Failed to send announcement');
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchUser(null);
    try {
      // First find user by username to get ID
      const userRes = await api.get(`/users/${searchQuery.trim()}`);
      const foundUser = userRes.data;
      setSearchUser(foundUser);

      const [postsRes, followersRes, followingRes] = await Promise.all([
        api.get(`/admin/user/${foundUser.username}/posts`),
        api.get(`/users/${foundUser.id}/followers`),
        api.get(`/users/${foundUser.id}/following`)
      ]);
      
      setSearchPosts(postsRes.data);
      setSearchFollowers(followersRes.data);
      setSearchFollowing(followingRes.data);
    } catch (e) {
      alert('User not found or error fetching data');
      setSearchPosts([]);
      setSearchFollowers([]);
      setSearchFollowing([]);
    } finally {
      setSearching(false);
    }
  };

  const handleDeleteAnyPost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await api.post(`/admin/posts/${postId}/delete`);
      setSearchPosts(searchPosts.filter(p => p.id !== postId));
      alert('Post deleted');
      setStats(prev => ({ ...prev, postsCount: Math.max(0, prev.postsCount - 1) }));
    } catch (e) {
      alert('Failed to delete post');
    }
  };

  const handleRemoveFollow = async (followerId, followingId, type) => {
    if (!window.confirm('Are you sure you want to remove this follow relationship?')) return;
    try {
      await api.post('/admin/follows/remove', { follower_id: followerId, following_id: followingId });
      if (type === 'follower') {
        setSearchFollowers(searchFollowers.filter(f => f.id !== followerId));
      } else {
        setSearchFollowing(searchFollowing.filter(f => f.id !== followingId));
      }
      alert('Follow relationship removed');
    } catch (e) {
      alert('Failed to remove follow');
    }
  };

  if (loading) return <div className="admin-loading">Loading Admin Panel...</div>;

  return (
    <div className="admin-panel">
      <header className="admin-header">
        <h1>Admin Control Center</h1>
        <div className="admin-tabs">
          <button className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>📊 Dashboard</button>
          <button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>👥 Users</button>
          <button className={activeTab === 'reports' ? 'active' : ''} onClick={() => setActiveTab('reports')}>🚩 Reports {stats?.reportsCount > 0 && <span className="badge">{stats.reportsCount}</span>}</button>
          <button className={activeTab === 'requests' ? 'active' : ''} onClick={() => setActiveTab('requests')}>🆘 Requests {stats?.requestsCount > 0 && <span className="badge">{stats.requestsCount}</span>}</button>
          <button className={activeTab === 'search' ? 'active' : ''} onClick={() => setActiveTab('search')}>🔍 User Management</button>
        </div>
      </header>

      <main className="admin-content">
        {activeTab === 'dashboard' && (
          <div className="admin-dashboard">
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Total Users</h3>
                <p>{stats?.usersCount}</p>
              </div>
              <div className="stat-card">
                <h3>Total Posts</h3>
                <p>{stats?.postsCount}</p>
              </div>
              <div className="stat-card urgent">
                <h3>Pending Reports</h3>
                <p>{stats?.reportsCount}</p>
              </div>
              <div className="stat-card">
                <h3>Open Requests</h3>
                <p>{stats?.requestsCount}</p>
              </div>
            </div>
            
            <div className="admin-actions-section" style={{ marginTop: 40 }}>
              <h2>Quick Actions</h2>
              <button className="btn-announcement" onClick={handleAnnouncement}>
                📢 Send Global Announcement
              </button>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="user-info">
                        <span className="username">@{u.username}</span>
                        <span className="display-name">{u.display_name}</span>
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td><span className={`role-tag ${u.role}`}>{u.role}</span></td>
                    <td>
                      {u.is_banned ? <span className="status-tag banned">Banned</span> : <span className="status-tag active">Active</span>}
                    </td>
                    <td>
                      {u.role !== 'admin' && (
                        u.is_banned ? 
                        <button className="btn-unban" onClick={() => handleBanUser(u.id, false)}>Unban</button> :
                        <button className="btn-ban" onClick={() => handleBanUser(u.id, true)}>Ban</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="admin-reports">
            {reports.length === 0 ? <p className="empty-msg">No reports found.</p> : (
              reports.map(r => (
                <div key={r.id} className={`report-card ${r.status}`}>
                  <div className="report-header">
                    <span className="reporter">Reported by: @{r.reporter_username}</span>
                    <span className="timestamp">{new Date(r.created_at).toLocaleString()}</span>
                  </div>
                  <div className="report-body">
                    <p><strong>Reason:</strong> {r.reason}</p>
                    <div className="reported-post">
                      <p><strong>Post Content:</strong></p>
                      <blockquote className="post-preview">{r.post_content}</blockquote>
                    </div>
                  </div>
                  {r.status === 'pending' && (
                    <div className="report-actions">
                      <button className="btn-remove" onClick={() => handleReportAction(r.id, 'remove_post')}>Remove Post & Notify</button>
                      <button className="btn-dismiss" onClick={() => handleReportAction(r.id, 'dismiss')}>Dismiss</button>
                    </div>
                  )}
                  {r.status !== 'pending' && <span className={`status-badge ${r.status}`}>{r.status}</span>}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="admin-requests">
            {requests.length === 0 ? <p className="empty-msg">No requests found.</p> : (
              requests.map(r => (
                <div key={r.id} className={`request-card ${r.status}`}>
                  <div className="request-header">
                    <span className="sender">From: @{r.username} ({r.display_name})</span>
                    <span className="timestamp">{new Date(r.created_at).toLocaleString()}</span>
                  </div>
                  <div className="request-body">
                    <h3>{r.subject}</h3>
                    <p>{r.message}</p>
                  </div>
                  {r.status === 'open' && (
                    <div className="request-actions">
                      <button className="btn-resolve" onClick={() => handleResolveRequest(r.id)}>Mark as Resolved</button>
                    </div>
                  )}
                  {r.status !== 'open' && <span className={`status-badge ${r.status}`}>{r.status}</span>}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'search' && (
          <div className="admin-search">
            <form onSubmit={handleSearch} className="search-form">
              <input 
                type="text" 
                placeholder="Enter username to manage (e.g. testuser)..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="admin-search-input"
              />
              <button type="submit" className="btn-search-submit">Manage User</button>
            </form>

            {searching ? <p style={{ marginTop: 20 }}>Fetching user data...</p> : searchUser && (
              <div className="search-results" style={{ marginTop: 30 }}>
                <div className="user-profile-header" style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 20 }}>
                  <div className="avatar" style={{ width: 80, height: 80, borderRadius: '50%', background: searchUser.avatar?.startsWith('#') ? searchUser.avatar : '#6C63FF', fontSize: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {searchUser.avatar?.startsWith('#') ? searchUser.display_name[0].toUpperCase() : <img src={searchUser.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />}
                  </div>
                  <div>
                    <h2 style={{ margin: 0 }}>{searchUser.display_name}</h2>
                    <p style={{ color: 'var(--text3)', margin: 0 }}>@{searchUser.username}</p>
                  </div>
                </div>

                <div className="admin-tabs" style={{ marginBottom: 20 }}>
                  <button className={searchTab === 'posts' ? 'active' : ''} onClick={() => setSearchTab('posts')}>Posts ({searchPosts.length})</button>
                  <button className={searchTab === 'followers' ? 'active' : ''} onClick={() => setSearchTab('followers')}>Followers ({searchFollowers.length})</button>
                  <button className={searchTab === 'following' ? 'active' : ''} onClick={() => setSearchTab('following')}>Following ({searchFollowing.length})</button>
                </div>

                {searchTab === 'posts' && (
                  <div className="posts-review">
                    {searchPosts.length === 0 ? <p className="empty-msg">No posts found.</p> : (
                      searchPosts.map(p => (
                        <div key={p.id} className="report-card">
                          <div className="report-header">
                            <span className="timestamp">{new Date(p.created_at).toLocaleString()}</span>
                          </div>
                          <div className="report-body">
                            <p>{p.content}</p>
                            {p.image && <img src={p.image} alt="post" style={{ maxWidth: '200px', borderRadius: 8, marginTop: 10 }} />}
                          </div>
                          <div className="report-actions">
                            <button className="btn-remove" onClick={() => handleDeleteAnyPost(p.id)}>Delete Post</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {searchTab === 'followers' && (
                  <div className="follows-review">
                    {searchFollowers.length === 0 ? <p className="empty-msg">No followers found.</p> : (
                      searchFollowers.map(f => (
                        <div key={f.id} className="user-item-admin" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="avatar avatar-sm" style={{ background: f.avatar?.startsWith('#') ? f.avatar : '#6C63FF', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                              {f.avatar?.startsWith('#') ? f.display_name[0].toUpperCase() : <img src={f.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />}
                            </div>
                            <span>@{f.username} ({f.display_name})</span>
                          </div>
                          <button className="btn-remove" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => handleRemoveFollow(f.id, searchUser.id, 'follower')}>Remove Follower</button>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {searchTab === 'following' && (
                  <div className="follows-review">
                    {searchFollowing.length === 0 ? <p className="empty-msg">Not following anyone.</p> : (
                      searchFollowing.map(f => (
                        <div key={f.id} className="user-item-admin" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="avatar avatar-sm" style={{ background: f.avatar?.startsWith('#') ? f.avatar : '#6C63FF', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                              {f.avatar?.startsWith('#') ? f.display_name[0].toUpperCase() : <img src={f.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />}
                            </div>
                            <span>@{f.username} ({f.display_name})</span>
                          </div>
                          <button className="btn-remove" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => handleRemoveFollow(searchUser.id, f.id, 'following')}>Unfollow User</button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
            {!searching && !searchUser && searchQuery && <p className="empty-msg">Search for a user to manage their content and connections.</p>}
          </div>
        )}
      </main>
    </div>
  );
};

export default Admin;
