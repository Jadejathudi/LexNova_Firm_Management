import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

const STATUS_BADGE = {
  intake: 'badge-draft', active: 'badge-active', hearing_pending: 'badge-pending',
  awaiting_docs: 'badge-pending', judgment: 'badge-sent', closed: 'badge-closed',
};
const STATUS_LABEL = {
  intake: 'INTAKE', active: 'ACTIVE', hearing_pending: 'HEARING PENDING',
  awaiting_docs: 'AWAITING DOCS', judgment: 'JUDGMENT', closed: 'CLOSED',
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getClientDashboard()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading your dashboard...</div>;
  if (!data) return <div className="loading">Unable to load dashboard</div>;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const activeCount = data.matters.filter(m => m.status !== 'closed').length;

  return (
    <div className="dashboard page-with-nav">
      <div className="greeting">{greeting}, {user?.full_name?.split(' ')[0]} 👋</div>
      <div className="sub-greeting">
        {activeCount} active matter{activeCount !== 1 ? 's' : ''}
        {data.upcoming_hearings.length > 0 && ` | Next hearing: ${new Date(data.upcoming_hearings[0].hearing_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
      </div>

      {data.pending_invoices.length > 0 && (
        <div style={{ background: '#fef3c7', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          💰 You have {data.pending_invoices.length} pending invoice{data.pending_invoices.length > 1 ? 's' : ''} totalling ₹{data.pending_invoices.reduce((s, i) => s + i.total_amount, 0).toLocaleString('en-IN')}
        </div>
      )}

      {data.matters.map(m => (
        <div key={m.matter_id} className="case-card" onClick={() => navigate(`/cases/${m.matter_id}`)}>
          <div className="case-number">📁 MATTER #{m.matter_number}</div>
          <div className="case-title">{m.title}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span className={`badge ${STATUS_BADGE[m.status] || 'badge-draft'}`}>● {STATUS_LABEL[m.status] || m.status}</span>
          </div>
          {m.lead_advocate && <div className="case-advocate">Advocate: {m.lead_advocate}</div>}
          {m.next_hearing && (
            <div className="case-next">📅 Next: {m.next_hearing.court_name}, {new Date(m.next_hearing.hearing_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
          )}
          <span className="view-link">View Details →</span>
        </div>
      ))}

      {data.matters.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ fontSize: 16, color: '#64748B', marginBottom: 16 }}>No active matters yet.</p>
          <button className="btn btn-gold" onClick={() => navigate('/book')}>Book a Consultation</button>
        </div>
      )}

      <div className="quick-actions">
        <div className="quick-action" onClick={() => navigate('/chat')}>
          <span className="icon">💬</span>
          <span className="label">Message Advocate</span>
        </div>
        <div className="quick-action" onClick={() => navigate('/documents')}>
          <span className="icon">📄</span>
          <span className="label">Doc Vault</span>
        </div>
        <div className="quick-action" onClick={() => navigate('/book')}>
          <span className="icon">📅</span>
          <span className="label">Book Consult</span>
        </div>
      </div>
    </div>
  );
}
