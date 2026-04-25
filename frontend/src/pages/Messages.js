import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Avatar } from '../components/PostCard';
import { formatDistanceToNow } from '../utils/time';

export default function Messages() {
  const { convId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef();
  const pollRef = useRef();

  useEffect(() => {
    api.get('/chat/conversations').then(r => {
      setConversations(r.data);
      if (convId) {
        const found = r.data.find(c => c.id === convId);
        if (found) { setActiveConv(found); loadMessages(found.id); }
      }
    });
  }, [convId]);

  const loadMessages = async (cid) => {
    const res = await api.get(`/chat/conversations/${cid}/messages`);
    setMessages(res.data);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const selectConv = (conv) => {
    setActiveConv(conv);
    loadMessages(conv.id);
    navigate(`/messages/${conv.id}`, { replace: true });
    // Clear unread
    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread: 0 } : c));
  };

  // Poll for new messages
  useEffect(() => {
    if (!activeConv) return;
    pollRef.current = setInterval(() => loadMessages(activeConv.id), 5000);
    return () => clearInterval(pollRef.current);
  }, [activeConv]);

  const sendMessage = async () => {
    if (!newMsg.trim() || !activeConv || sending) return;
    setSending(true);
    const content = newMsg.trim();
    setNewMsg('');
    try {
      const res = await api.post(`/chat/conversations/${activeConv.id}/messages`, { content });
      setMessages(prev => [...prev, res.data]);
      setConversations(prev => prev.map(c => c.id === activeConv.id ? { ...c, last_message: content } : c));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch {}
    setSending(false);
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Conversation list */}
      <div style={{ width: activeConv ? 280 : '100%', borderRight: '1px solid var(--border)', flexShrink: 0, overflowY: 'auto' }}>
        <div className="page-header">Messages</div>
        {conversations.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">💬</div>
            <div className="empty-state-title">No conversations</div>
            <p>Visit someone's profile and click Message!</p>
          </div>
        ) : (
          conversations.map(conv => (
            <div key={conv.id} className={`chat-item ${activeConv?.id === conv.id ? 'active' : ''}`} onClick={() => selectConv(conv)}>
              <Avatar user={conv.other} size="avatar-sm" />
              <div className="chat-item-info">
                <div className="chat-item-name">{conv.other.display_name}</div>
                <div className="chat-item-preview">{conv.last_message || 'Start a conversation'}</div>
              </div>
              {conv.unread > 0 && <div className="chat-unread">{conv.unread}</div>}
            </div>
          ))
        )}
      </div>

      {/* Chat window */}
      {activeConv ? (
        <div className="chat-window" style={{ flex: 1 }}>
          <div className="page-header" style={{ position: 'sticky', top: 0 }}>
            <Avatar user={activeConv.other} size="avatar-sm" />
            <div onClick={() => navigate(`/profile/${activeConv.other.username}`)} style={{ cursor: 'pointer' }}>
              <div style={{ fontWeight: 700 }}>{activeConv.other.display_name}</div>
              <div style={{ color: 'var(--text3)', fontSize: 12 }}>@{activeConv.other.username}</div>
            </div>
          </div>

          <div className="chat-messages">
            {messages.map(msg => {
              const isMine = msg.sender_id === user.id;
              return (
                <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                  <div className={`message-bubble ${isMine ? 'mine' : 'theirs'}`}>
                    {msg.content}
                  </div>
                  <div className="message-time">
                    {formatDistanceToNow(msg.created_at)}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-wrap">
            <input
              className="chat-input"
              placeholder="Type a message..."
              value={newMsg}
              onChange={e => setNewMsg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            />
            <button className="btn-send" onClick={sendMessage} disabled={!newMsg.trim() || sending}>➤</button>
          </div>
        </div>
      ) : (
        <div className="empty-state" style={{ flex: 1 }}>
          <div className="empty-state-icon">💬</div>
          <div className="empty-state-title">Select a conversation</div>
        </div>
      )}
    </div>
  );
}
