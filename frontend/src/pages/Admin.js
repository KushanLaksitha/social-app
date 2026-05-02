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
  const [searchPosts, setSearchPosts] = useState([]);
  const [searching, setSearching] = useState(false);

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
    try {
      const res = await api.get(`/admin/user/${searchQuery.trim()}/posts`);
      setSearchPosts(res.data);
    } catch (e) {
      alert('User not found or has no posts');
      setSearchPosts([]);
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
      // Update stats
      setStats(prev => ({ ...prev, postsCount: Math.max(0, prev.postsCount - 1) }));
    } catch (e) {
      alert('Failed to delete post');
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
          <button className={activeTab === 'search' ? 'active' : ''} onClick={() => setActiveTab('search')}>🔍 Review Posts</button>
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
                placeholder="Enter username to review posts..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="admin-search-input"
              />
              <button type="submit" className="btn-search-submit">Search</button>
            </form>

            <div className="search-results" style={{ marginTop: 20 }}>
              {searching ? <p>Searching...</p> : searchPosts.length === 0 ? <p className="empty-msg">Enter a username and click search to view posts.</p> : (
                searchPosts.map(p => (
                  <div key={p.id} className="report-card">
                    <div className="report-header">
                      <span className="timestamp">{new Date(p.created_at).toLocaleString()} | Visibility: {p.visibility}</span>
                    </div>
                    <div className="report-body">
                      <p>{p.content}</p>
                      {p.image && <img src={p.image} alt="post" style={{ maxWidth: '200px', borderRadius: 8, marginTop: 10 }} />}
                      {p.video && <video src={p.video} controls style={{ maxWidth: '200px', borderRadius: 8, marginTop: 10 }} />}
                    </div>
                    <div className="report-actions">
                      <button className="btn-remove" onClick={() => handleDeleteAnyPost(p.id)}>Delete Post</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Admin;
