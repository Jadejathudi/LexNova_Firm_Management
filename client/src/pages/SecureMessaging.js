import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

export default function SecureMessaging() {
  const { user } = useAuth();
  const [matters, setMatters] = useState([]);
  const [selectedMatter, setSelectedMatter] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const chatEndRef = useRef(null);

  useEffect(() => {
    api.getMatters()
      .then(m => {
        setMatters(m);
        if (m.length > 0) setSelectedMatter(m[0]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedMatter) {
      api.getMatterMessages(selectedMatter.matter_id)
        .then(setMessages)
        .catch(() => setMessages([]));
    }
  }, [selectedMatter]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedMatter) return;
    try {
      await api.sendMessage({ matter_id: selectedMatter.matter_id, content: newMessage });
      setNewMessage('');
      const msgs = await api.getMatterMessages(selectedMatter.matter_id);
      setMessages(msgs);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="loading">Loading messages...</div>;

  const leadAdvocate = selectedMatter?.advocates?.find(a => a.role_on_matter === 'lead_senior');

  return (
    <div className="page-with-nav" style={{ height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column' }}>
      {/* Matter selector */}
      {matters.length > 1 && (
        <div style={{ display: 'flex', gap: 8, padding: '12px 20px', background: 'white', borderBottom: '1px solid #e2e8f0', overflowX: 'auto' }}>
          {matters.map(m => (
            <div key={m.matter_id}
              className={`doc-filter ${selectedMatter?.matter_id === m.matter_id ? 'active' : ''}`}
              onClick={() => setSelectedMatter(m)}>
              {m.matter_number}
            </div>
          ))}
        </div>
      )}

      {/* Chat header */}
      <div className="chat-header">
        <div>
          <div className="name">{leadAdvocate?.full_name || 'Team'}</div>
          <div className="status">● Online</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="encrypted">🔒 End-to-end encrypted</div>
          <div style={{ fontSize: 12, color: '#94A3B8' }}>{selectedMatter?.matter_number}</div>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages" style={{ flex: 1, overflowY: 'auto' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#94A3B8', padding: 40 }}>
            No messages yet. Start a conversation about your case.
          </div>
        )}
        {messages.map(m => (
          <div key={m.message_id} className={`chat-msg ${m.sender_id === user?.user_id ? 'sent' : 'received'}`}>
            {m.sender_id !== user?.user_id && (
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, opacity: 0.8 }}>{m.sender_name}</div>
            )}
            {m.content}
            <div className="msg-time">
              {new Date(m.sent_at).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              {m.sender_id === user?.user_id && (m.is_read ? ' ✓✓' : ' ✓')}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="chat-input-area">
        <input placeholder="Type a message..." value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()} />
        <button onClick={sendMessage}>➤</button>
      </div>
    </div>
  );
}
