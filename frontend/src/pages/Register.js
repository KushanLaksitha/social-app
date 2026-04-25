import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [form, setForm] = useState({ username: '', display_name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const set = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register(form);
      navigate('/home');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, var(--accent), var(--pink))', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>✦</div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22 }}>Vibe</span>
        </div>
        <div className="auth-title">Join Vibe</div>
        <div className="auth-subtitle">Create an account and start connecting</div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Display Name</label>
            <input className="form-input" value={form.display_name} onChange={set('display_name')} placeholder="Your name" required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input className="form-input" value={form.username} onChange={set('username')} placeholder="@username (no spaces)" pattern="[a-zA-Z0-9_]+" required />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" value={form.password} onChange={set('password')} placeholder="At least 6 characters" minLength={6} required />
          </div>
          {error && <div className="form-error">{error}</div>}
          <button className="btn-auth" type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, color: 'var(--text3)', fontSize: 14 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent2)', fontWeight: 600 }}>Sign in</Link>
        </div>
      </div>
    </div>
  );
}
