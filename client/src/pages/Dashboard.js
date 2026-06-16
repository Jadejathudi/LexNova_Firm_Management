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


function formatTime12h(time24) {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = String(dateStr).split('T')[0];
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

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

  if (loading) return <div className="loading">Loading your dashboard…</div>;
  if (!data) return <div className="loading">Unable to load dashboard</div>;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const matters = data.matters || [];
  const consultationRequests = data.consultation_requests || [];
  const consultationSessions = data.consultation_sessions || [];
  const upcomingHearings = data.upcoming_hearings || [];
  const pendingInvoices = data.pending_invoices || [];
  const lightMatters = data.light_matters || [];

  const activeCount = matters.filter(m => m.status !== 'closed').length;
  const pendingConsultations = consultationRequests.filter(r => r.status === 'pending').length;

  return (
    <div className="dashboard page-with-nav">
      <div className="greeting">{greeting}, {user?.full_name?.split(' ')[0]} 👋</div>
      <div className="sub-greeting">
        {activeCount > 0 ? `${activeCount} active case${activeCount !== 1 ? 's' : ''}` : 'No active cases'}
        {pendingConsultations > 0 && ` · ${pendingConsultations} pending consultation${pendingConsultations !== 1 ? 's' : ''}`}
        {upcomingHearings.length > 0 && ` · Next hearing: ${new Date(String(upcomingHearings[0].hearing_date).split('T')[0] + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
      </div>

      {pendingInvoices.length > 0 && (
        <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', padding: '12px 16px', borderRadius: 10, marginBottom: 20, fontSize: 14, color: '#92400E', fontWeight: 500 }}>
          💰 You have {pendingInvoices.length} pending invoice{pendingInvoices.length > 1 ? 's' : ''} totalling ₹{pendingInvoices.reduce((s, i) => s + Number(i.total_amount || 0), 0).toLocaleString('en-IN')}
        </div>
      )}

      {/* ── Confirmed Sessions ─────────────────────────────────────────────── */}
      {consultationSessions.length > 0 && (
        <>
          <h3>📅 Confirmed Appointments</h3>
          {consultationSessions.map(session => {
            const modeIcon = session.session_mode === 'video' ? '📹' : session.session_mode === 'phone' ? '📞' : '🏢';
            const statusColors = {
              scheduled: { bg: '#DCFCE7', color: '#166534' },
              completed: { bg: '#E0E7FF', color: '#3730A3' },
              cancelled: { bg: '#FEE2E2', color: '#B91C1C' },
            };
            const sc = statusColors[session.status] || { bg: '#F1F5F9', color: '#334155' };
            return (
              <div key={session.session_id} style={{ background: '#FFFFFF', border: '2px solid #E2E8F0', borderLeft: '4px solid #C9A84C', borderRadius: '12px', padding: '18px 20px', marginBottom: '14px' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: '#1B2559' }}>
                      {modeIcon} {session.advocate_name || 'Advocate'}
                    </div>
                    {session.advocate_bar_number && (
                      <div style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'monospace', marginTop: '2px' }}>{session.advocate_bar_number}</div>
                    )}
                    <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
                      {session.matter_type ? session.matter_type.charAt(0).toUpperCase() + session.matter_type.slice(1) : 'Consultation'} · {session.session_mode === 'video' ? 'Video Call' : session.session_mode === 'phone' ? 'Phone Call' : 'In-Person'}
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px', background: sc.bg, color: sc.color }}>{session.status.toUpperCase()}</span>
                </div>

                {/* Date & Time */}
                <div style={{ background: '#F8FAFC', borderRadius: '9px', padding: '12px 14px', marginBottom: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                  <div><span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '2px' }}>DATE</span><span style={{ fontWeight: 600, color: '#1B2559' }}>{formatDate(session.scheduled_date)}</span></div>
                  <div><span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '2px' }}>TIME</span><span style={{ fontWeight: 600, color: '#1B2559' }}>{formatTime12h(session.scheduled_time)} · {session.duration_minutes} min</span></div>
                </div>

                {/* Mode-specific join/contact block */}
                {session.session_mode === 'video' && (
                  session.meeting_link ? (
                    <div style={{ borderRadius: '9px', overflow: 'hidden', border: '1px solid #BFDBFE' }}>
                      <div style={{ padding: '12px 16px', background: '#EFF6FF', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#1D4ED8' }}>📹 Video Meeting Room</div>
                          <div style={{ fontSize: '11px', color: '#3B82F6', marginTop: '3px' }}>
                            📅 Please join on <strong>{formatDate(session.scheduled_date)}</strong> at <strong>{formatTime12h(session.scheduled_time)}</strong>
                          </div>
                          <div style={{ fontSize: '11px', color: '#3B82F6', marginTop: '2px' }}>
                            Sign in with your Google account to enter the meeting
                          </div>
                        </div>
                        <a
                          href={session.meeting_link}
                          target="_blank"
                          rel="noreferrer"
                          style={{ padding: '9px 18px', background: '#1A73E8', color: '#fff', borderRadius: '8px', fontWeight: 700, fontSize: '13px', textDecoration: 'none', whiteSpace: 'nowrap' }}
                        >
                          Join Meet →
                        </a>
                      </div>
                      <div style={{ padding: '8px 14px', background: '#F0F7FF', borderTop: '1px solid #BFDBFE', fontSize: '11px', color: '#60A5FA', fontFamily: 'monospace', wordBreak: 'break-all', letterSpacing: '0.02em' }}>
                        {session.meeting_link}
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '12px 16px', background: '#FEF9C3', borderRadius: '9px', fontSize: '13px', color: '#92400E', fontWeight: 600 }}>
                      ⏳ Meet link is being generated — refresh in a moment
                    </div>
                  )
                )}

                {session.session_mode === 'phone' && (
                  <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '9px', padding: '12px 16px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#166534', marginBottom: '6px' }}>📞 Phone Consultation</div>
                    <div style={{ fontSize: '13px', color: '#15803D' }}>The advocate will call you at your registered phone number at the scheduled time.</div>
                    {session.advocate_phone && (
                      <div style={{ marginTop: '8px', fontSize: '13px', color: '#15803D' }}>
                        Advocate contact: <a href={`tel:${session.advocate_phone}`} style={{ fontWeight: 700, color: '#15803D' }}>{session.advocate_phone}</a>
                      </div>
                    )}
                  </div>
                )}

                {session.session_mode === 'office' && (
                  <div style={{ background: '#FFF8E8', border: '1px solid #FDE68A', borderRadius: '9px', padding: '12px 16px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#92400E', marginBottom: '6px' }}>🏢 In-Person Appointment</div>
                    <div style={{ fontSize: '13px', color: '#92400E' }}>
                      Visit the advocate's chambers at the scheduled time.
                      {session.advocate_city && ` Location: ${session.advocate_city}.`}
                    </div>
                    {session.advocate_phone && (
                      <div style={{ marginTop: '6px', fontSize: '13px', color: '#92400E' }}>
                        Contact: <a href={`tel:${session.advocate_phone}`} style={{ fontWeight: 700, color: '#92400E' }}>{session.advocate_phone}</a>
                      </div>
                    )}
                    {session.advocate_email && (
                      <div style={{ fontSize: '12px', color: '#92400E', marginTop: '3px' }}>{session.advocate_email}</div>
                    )}
                  </div>
                )}

                {session.notes && (
                  <div style={{ marginTop: '10px', fontSize: '12px', color: '#64748B', fontStyle: 'italic', paddingLeft: '4px' }}>"{session.notes.length > 120 ? session.notes.slice(0, 120) + '…' : session.notes}"</div>
                )}
              </div>
            );
          })}
        </>
      )}

      {/* ── Pending Consultation Requests ────────────────────────────────── */}
      {consultationRequests.filter(r => r.status === 'pending').length > 0 && (
        <>
          <h3>⏳ Pending Requests</h3>
          {consultationRequests.filter(r => r.status === 'pending').map(cr => (
            <div key={cr.request_id} style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#1B2559' }}>🎯 {cr.advocate_name}</div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>{cr.advocate_location}</div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px', background: '#FEF3C7', color: '#92400E' }}>AWAITING CONFIRMATION</span>
              </div>
              <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '4px' }}>
                {cr.matter_type} · {cr.urgency === 'high' ? '⚡ Urgent' : 'Standard'} · {cr.preferred_mode === 'video' ? '📹 Video' : cr.preferred_mode === 'phone' ? '📞 Phone' : '🏢 Office'}
              </div>
              <div style={{ fontSize: '13px', color: '#64748B' }}>Preferred: {formatDate(cr.preferred_date)} at {cr.preferred_time}</div>
              <div style={{ fontSize: '12px', color: '#92400E', marginTop: '8px', fontWeight: 600 }}>
                Once the advocate accepts, your appointment details and {cr.preferred_mode === 'video' ? 'Video Meeting link' : 'contact details'} will appear above.
              </div>
            </div>
          ))}
        </>
      )}

      {/* ── My Matters ──────────────────────────────────────────────── */}
      {lightMatters.length > 0 && (
        <>
          <h3>📁 My Matters</h3>
          {lightMatters.map(m => {
            const typeColors = { bench: '#1B2559', corporate: '#0E7490', tax: '#7C3AED', immigration: '#0369A1', criminal: '#DC2626', civil: '#16A34A', family: '#D97706', real_estate: '#78716C' };
            const typeLabels = { bench: 'Bench Session', corporate: 'Corporate', tax: 'Income Tax', immigration: 'Immigration', criminal: 'Criminal', civil: 'Civil', family: 'Family', real_estate: 'Real Estate' };
            const col = typeColors[m.matter_type] || '#64748B';
            return (
              <div key={m.matter_id} onClick={() => navigate(`/matters/${m.matter_id}`)}
                style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderLeft: `4px solid ${col}`, borderRadius: '12px', padding: '14px 18px', marginBottom: '10px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#1B2559', marginBottom: '3px' }}>{m.title}</div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>
                      <span style={{ background: col + '18', color: col, padding: '1px 7px', borderRadius: 10, fontSize: 11, fontWeight: 600, marginRight: 8 }}>{typeLabels[m.matter_type] || m.matter_type}</span>
                      {m.advocate_name && `Advocate: ${m.advocate_name} · `}
                      <span style={{ fontFamily: 'monospace' }}>{m.matter_ref}</span>
                    </div>
                  </div>
                  <span style={{ fontSize: '13px', color: '#94A3B8' }}>›</span>
                </div>
              </div>
            );
          })}
          <div style={{ marginBottom: '8px' }}>
            <button onClick={() => navigate('/matters')} style={{ background: 'transparent', border: '1.5px solid #1B2559', borderRadius: '8px', color: '#1B2559', padding: '7px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
              View All Matters →
            </button>
          </div>
        </>
      )}

      <h3>⚖ Filed Cases</h3>

      {matters.map(m => (
        <div key={m.matter_id} className="case-card" onClick={() => navigate(`/cases/${m.matter_id}`)}>
          <div className="case-number">⚖ {m.matter_number || 'CC-—'}</div>
          <div className="case-title">{m.title}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <span className={`badge ${STATUS_BADGE[m.status] || 'badge-draft'}`}>{STATUS_LABEL[m.status] || m.status}</span>
          </div>
          {m.lead_advocate && <div className="case-advocate">👤 Advocate: {m.lead_advocate}</div>}
          {m.next_hearing && (
            <div className="case-next">📅 Next: {m.next_hearing.court_name}, {new Date(String(m.next_hearing.hearing_date).split('T')[0] + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
          )}
          <span className="view-link">View Details →</span>
        </div>
      ))}

      {matters.length === 0 && lightMatters.length === 0 && consultationSessions.length === 0 && (
        <div className="empty-state" style={{ marginTop: 8 }}>
          <div className="empty-icon">⚖️</div>
          <div className="empty-title">No legal matters yet</div>
          <div className="empty-sub">Book a consultation with a verified advocate or explore The Bench to get started.</div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-gold" onClick={() => navigate('/book')}>Book a Consultation</button>
            <button className="btn btn-outline" onClick={() => navigate('/bench/directory')}>⚖ The Bench</button>
          </div>
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
