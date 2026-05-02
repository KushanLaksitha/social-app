import React, { useState } from 'react';
import api from '../utils/api';

const Support = () => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', text: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject || !message) return;

    setLoading(true);
    setStatus({ type: '', text: '' });

    try {
      await api.post('/admin/request', { subject, message });
      setStatus({ type: 'success', text: 'Your message has been sent to the admin team. We will get back to you soon.' });
      setSubject('');
      setMessage('');
    } catch (error) {
      setStatus({ type: 'error', text: 'Failed to send message. Please try again later.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="support-page">
      <div className="support-card">
        <h1>Contact Support</h1>
        <p>Have a question or a request? Send a message to the admin team.</p>

        {status.text && (
          <div className={`status-msg ${status.type}`}>
            {status.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Subject</label>
            <input 
              type="text" 
              value={subject} 
              onChange={(e) => setSubject(e.target.value)} 
              placeholder="What is this regarding?"
              required
            />
          </div>
          <div className="form-group">
            <label>Message</label>
            <textarea 
              value={message} 
              onChange={(e) => setMessage(e.target.value)} 
              placeholder="Describe your issue or request in detail..."
              rows="6"
              required
            />
          </div>
          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      </div>

      <style jsx>{`
        .support-page {
          padding: 40px 20px;
          display: flex;
          justify-content: center;
        }
        .support-card {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          padding: 40px;
          border-radius: 20px;
          width: 100%;
          max-width: 600px;
        }
        .support-card h1 {
          font-size: 2rem;
          margin-bottom: 10px;
          background: linear-gradient(45deg, #6C63FF, #FA709A);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .support-card p {
          color: rgba(255,255,255,0.6);
          margin-bottom: 30px;
        }
        .form-group {
          margin-bottom: 20px;
        }
        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: rgba(255,255,255,0.8);
        }
        .form-group input, .form-group textarea {
          width: 100%;
          background: rgba(0,0,0,0.2);
          border: 1px solid rgba(255,255,255,0.1);
          padding: 12px;
          border-radius: 10px;
          color: white;
          font-family: inherit;
        }
        .form-group input:focus, .form-group textarea:focus {
          outline: none;
          border-color: #6C63FF;
          box-shadow: 0 0 10px rgba(108,99,255,0.2);
        }
        .btn-submit {
          width: 100%;
          background: #6C63FF;
          color: white;
          border: none;
          padding: 14px;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }
        .btn-submit:hover {
          background: #5a52d4;
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(108,99,255,0.3);
        }
        .btn-submit:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }
        .status-msg {
          padding: 15px;
          border-radius: 10px;
          margin-bottom: 25px;
          font-size: 0.9rem;
        }
        .status-msg.success {
          background: rgba(67,233,123,0.1);
          color: #43E97B;
          border: 1px solid rgba(67,233,123,0.2);
        }
        .status-msg.error {
          background: rgba(255,101,132,0.1);
          color: #FF6584;
          border: 1px solid rgba(255,101,132,0.2);
        }
      `}</style>
    </div>
  );
};

export default Support;
