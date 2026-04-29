import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import RightPanel from './components/RightPanel';
import Home from './pages/Home';
import Explore from './pages/Explore';
import Profile from './pages/Profile';
import PostDetail from './pages/PostDetail';
import Messages from './pages/Messages';
import Notifications from './pages/Notifications';
import Login from './pages/Login';
import Register from './pages/Register';
import Settings from './pages/Settings';
import './index.css';
import './stories.css';

function Layout({ children, hideRight = false }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
      {!hideRight && <RightPanel />}
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/home" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/home" /> : <Register />} />

      <Route path="/home" element={
        <ProtectedRoute>
          <Layout><Home /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/explore" element={
        <ProtectedRoute>
          <Layout><Explore /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/notifications" element={
        <ProtectedRoute>
          <Layout><Notifications /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/messages" element={
        <ProtectedRoute>
          <Layout hideRight><Messages /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/messages/:convId" element={
        <ProtectedRoute>
          <Layout hideRight><Messages /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/profile/:username" element={
        <ProtectedRoute>
          <Layout><Profile /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/post/:id" element={
        <ProtectedRoute>
          <Layout><PostDetail /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/settings" element={
        <ProtectedRoute>
          <Layout><Settings /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/" element={<Navigate to={user ? "/home" : "/login"} />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  React.useEffect(() => {
    const handleContext = (e) => {
      if (e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO' || e.target.closest('.media-protected')) {
        e.preventDefault();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'PrintScreen') {
        document.body.classList.add('blurred-screen');
        setTimeout(() => document.body.classList.remove('blurred-screen'), 1000);
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
      }
    };

    const handleBlur = () => document.body.classList.add('blurred-screen');
    const handleFocus = () => document.body.classList.remove('blurred-screen');

    document.addEventListener('contextmenu', handleContext);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('contextmenu', handleContext);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
