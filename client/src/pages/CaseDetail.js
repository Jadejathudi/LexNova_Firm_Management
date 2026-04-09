import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

const STATUS_BADGE = {
  intake: 'badge-draft', active: 'badge-active', hearing_pending: 'badge-pending',
  awaiting_docs: 'badge-pending', judgment: 'badge-sent', closed: 'badge-closed',
};

export default function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [matter, setMatter] = useState(null);
  const [tab, setTab] = useState('timeline');
  const [timeline, setTimeline] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    Promise.all([
      api.getMatter(id),
      api.getMatterTimeline(id),
      api.getMatterDocuments(id).catch(() => []),
      api.getMatterMessages(id).catch(() => []),
      api.getInvoices().catch(() => []),
    ]).then(([m, t, d, msg, inv]) => {
      setMatter(m);
      setTimeline(t);
      setDocuments(d);
      setMessages(msg);
      setInvoices(inv.filter(i => i.matter_id === id));
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      await api.sendMessage({ matter_id: id, content: newMessage });
      setNewMessage('');
      const msgs = await api.getMatterMessages(id);
      setMessages(msgs);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="loading">Loading case details...</div>;
  if (!matter) return <div className="loading">Case not found</div>;

  const leadAdvocate = matter.advocates?.find(a => a.role_on_matter === 'lead_senior');

  return (
    <div className="case-detail page-with-nav">
      <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>

      <div className="case-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1>MATTER #{matter.matter_number}</h1>
          <span className={`badge ${STATUS_BADGE[matter.status]}`}>{matter.status?.replace('_', ' ').toUpperCase()}</span>
        </div>
        <div className="case-info">{matter.title}</div>
        {matter.court_name && <div className="case-info">📍 {matter.court_name}</div>}
        <div className="case-info">Filed: {new Date(matter.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
      </div>

      <div className="tabs">
        {['timeline', 'documents', 'messages', 'billing'].map(t => (
          <div key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </div>
        ))}
      </div>

      {tab === 'timeline' && (
        <div>
          <div className="timeline">
            {timeline.map((h, i) => {
              const isPast = new Date(h.hearing_date) < new Date();
              const isNext = !isPast && (i === 0 || new Date(timeline[i - 1]?.hearing_date) < new Date());
              return (
                <div key={h.hearing_id} className={`timeline-item ${isPast ? 'completed' : isNext ? 'upcoming' : ''}`}>
                  <div className="tl-date">
                    {isPast ? '✅' : isNext ? '🔵' : '○'} {new Date(h.hearing_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {h.hearing_time && ` at ${h.hearing_time}`}
                  </div>
                  <div className="tl-event">{h.purpose || 'Hearing'} — {h.court_name}</div>
                  {h.outcome && <div className="tl-outcome">{h.outcome}</div>}
                </div>
              );
            })}
          </div>

          {timeline.length === 0 && <p style={{ color: '#94A3B8', textAlign: 'center', padding: 20 }}>No hearings scheduled yet.</p>}

          {leadAdvocate && (
            <div className="card" style={{ marginTop: 24 }}>
              <h3 style={{ marginBottom: 8 }}>Your Advocate</h3>
              <p>👤 {leadAdvocate.full_name}</p>
              <p style={{ fontSize: 13, color: '#64748B' }}>📞 Available: Mon–Sat 9AM–7PM</p>
              <button className="btn btn-gold btn-sm" style={{ marginTop: 12 }} onClick={() => setTab('messages')}>
                💬 Message Now
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'documents' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ fontSize: 12, color: '#94A3B8' }}>🔒 All documents encrypted end-to-end</p>
          </div>
          {documents.map(d => (
            <div key={d.document_id} className="doc-item">
              <div className="doc-info">
                <div className="doc-name">📄 {d.filename}</div>
                <div className="doc-meta">
                  {(d.file_size_bytes / 1024 / 1024).toFixed(1)} MB • Uploaded {new Date(d.uploaded_at).toLocaleDateString('en-IN')} by {d.uploader_name}
                </div>
              </div>
            </div>
          ))}
          {documents.length === 0 && <p style={{ color: '#94A3B8', textAlign: 'center', padding: 20 }}>No documents yet.</p>}
        </div>
      )}

      {tab === 'messages' && (
        <div>
          <div style={{ maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16, padding: '10px 0' }}>
            {messages.map(m => (
              <div key={m.message_id} className={`chat-msg ${m.sender_id === user?.user_id ? 'sent' : 'received'}`}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{m.sender_name}</div>
                {m.content}
                <div className="msg-time">{new Date(m.sent_at).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            ))}
            {messages.length === 0 && <p style={{ color: '#94A3B8', textAlign: 'center' }}>No messages yet. Start a conversation.</p>}
          </div>
          <div className="chat-input-area">
            <input placeholder="Type a message..." value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()} />
            <button onClick={sendMessage}>➤</button>
          </div>
        </div>
      )}

      {tab === 'billing' && (
        <div>
          {invoices.map(inv => (
            <div key={inv.invoice_id} className="card" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{inv.invoice_number}</strong>
                  <div style={{ fontSize: 13, color: '#64748B' }}>Due: {new Date(inv.due_date).toLocaleDateString('en-IN')}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>₹{inv.total_amount?.toLocaleString('en-IN')}</div>
                  <span className={`badge badge-${inv.status}`}>{inv.status}</span>
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 8 }}>
                Base: ₹{inv.amount_base?.toLocaleString('en-IN')} + GST: ₹{inv.gst_amount?.toLocaleString('en-IN')}
              </div>
            </div>
          ))}
          {invoices.length === 0 && <p style={{ color: '#94A3B8', textAlign: 'center', padding: 20 }}>No invoices yet.</p>}
        </div>
      )}
    </div>
  );
}
