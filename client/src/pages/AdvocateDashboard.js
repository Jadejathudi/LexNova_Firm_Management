import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

const NAVY = '#1C2A40';
const GRAY = '#64748B';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_FULL = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' };
const TIME_OPTIONS = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'];

function fmt12h(t) {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${period}`;
}

const STATUS_BADGE = {
  intake: 'badge-draft', active: 'badge-active', hearing_pending: 'badge-pending',
  awaiting_docs: 'badge-pending', judgment: 'badge-sent', closed: 'badge-closed',
};
const STATUS_LABEL = {
  intake: 'INTAKE', active: 'ACTIVE', hearing_pending: 'HEARING PENDING',
  awaiting_docs: 'AWAITING DOCS', judgment: 'JUDGMENT', closed: 'CLOSED',
};

function MeetLinkBadge({ link }) {
  if (!link) return null;
  return (
    <a
      href={link}
      target="_blank"
      rel="noreferrer"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        marginTop: '10px',
        padding: '10px 16px',
        background: '#1A73E8',
        color: '#FFFFFF',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: 700,
        textDecoration: 'none',
      }}
      onClick={e => e.stopPropagation()}
    >
      📹 Join Video Meeting
    </a>
  );
}

export default function AdvocateDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('overview');

  const [scheduleData, setScheduleData] = useState(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleSaved, setScheduleSaved] = useState(false);
  const [scheduleError, setScheduleError] = useState('');

  const loadData = useCallback(() => {
    setLoading(true);
    api.getAdvocateDashboard()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (view !== 'schedule' || !data?.advocate?.advocate_id) return;
    if (scheduleData) return;
    setScheduleLoading(true);
    api.getAdvocateAvailability(data.advocate.advocate_id)
      .then(rows => {
        const map = {};
        rows.forEach(r => { map[r.day_of_week] = r; });
        setScheduleData(DAYS.map(day => ({
          day_of_week: day,
          is_available: map[day] ? Boolean(map[day].is_available) : day !== 'Sun',
          start_time: map[day]?.start_time || '09:00',
          end_time: map[day]?.end_time || '18:00',
        })));
      })
      .catch(() => setScheduleError('Failed to load schedule'))
      .finally(() => setScheduleLoading(false));
  }, [view, data, scheduleData]);

  function updateScheduleDay(idx, field, value) {
    setScheduleData(prev => prev.map((d, i) => i === idx ? { ...d, [field]: value } : d));
  }

  async function saveSchedule() {
    if (!scheduleData || !data?.advocate?.advocate_id) return;
    setScheduleSaving(true);
    setScheduleError('');
    setScheduleSaved(false);
    try {
      await api.updateAdvocateAvailability(data.advocate.advocate_id, scheduleData);
      setScheduleSaved(true);
      setTimeout(() => setScheduleSaved(false), 3000);
    } catch (err) {
      setScheduleError(err.message || 'Failed to save schedule');
    } finally {
      setScheduleSaving(false);
    }
  }

  if (loading) return <div className="loading">Loading your dashboard...</div>;
  if (!data) return <div className="loading">Unable to load dashboard</div>;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const todaySessions = data.consultation_sessions.filter(
    s => s.scheduled_date === new Date().toISOString().split('T')[0]
  );
  const upcomingSessions = data.consultation_sessions.filter(
    s => s.scheduled_date >= new Date().toISOString().split('T')[0]
  );

  return (
    <div className="dashboard page-with-nav">
      <div className="greeting">{greeting}, Adv. {user?.full_name?.split(' ')[0]} 👋</div>
      <div className="sub-greeting">
        {data.stats.active_matters} active cases · {upcomingSessions.length} upcoming sessions · {todaySessions.length} today
      </div>

      {/* Quick Stats */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-value">{data.stats.active_matters}</div>
          <div className="stat-label">Active Cases</div>
        </div>
        <div className="stat-card" style={{ cursor: upcomingSessions.length > 0 ? 'pointer' : 'default' }} onClick={() => upcomingSessions.length > 0 && setView('sessions')}>
          <div className="stat-value" style={{ color: upcomingSessions.length > 0 ? '#1C2A40' : 'inherit' }}>{upcomingSessions.length}</div>
          <div className="stat-label">Upcoming Sessions</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{todaySessions.length}</div>
          <div className="stat-label">Today's Sessions</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">₹{data.stats.earnings_this_month.toLocaleString('en-IN')}</div>
          <div className="stat-label">Earnings This Month</div>
        </div>
      </div>

      {/* View Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[
          { key: 'overview', label: '📊 Overview' },
          { key: 'sessions', label: `📹 Sessions (${data.consultation_sessions.length})` },
          { key: 'schedule', label: '📅 Schedule' },
        ].map(tab => (
          <button
            key={tab.key}
            className={`btn ${view === tab.key ? 'btn-navy' : 'btn-outline'}`}
            onClick={() => setView(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ─────────────────────────────────────────────────────── */}
      {view === 'overview' && (
        <>
          {/* Today's Sessions */}
          {todaySessions.length > 0 && (
            <>
              <h3 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: 700 }}>📅 Today's Sessions</h3>
              {todaySessions.map(session => {
                const modeIcon = session.session_mode === 'video' ? '📹' : session.session_mode === 'phone' ? '📞' : '🏢';
                return (
                  <div key={session.session_id} className="case-card" style={{ cursor: 'pointer' }} onClick={() => setView('sessions')}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div className="case-number">{modeIcon} {session.session_mode === 'video' ? 'Video' : session.session_mode === 'phone' ? 'Phone' : 'In-Person'} Consultation</div>
                        <div className="case-title">{session.client_name}</div>
                        <div className="case-advocate">🕐 {session.scheduled_time} · {session.duration_minutes} min</div>
                      </div>
                      <span className="badge badge-active">SCHEDULED</span>
                    </div>
                    {session.meeting_link && <MeetLinkBadge link={session.meeting_link} />}
                    <span className="view-link">View Details →</span>
                  </div>
                );
              })}
            </>
          )}

          {todaySessions.length === 0 && (
            <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '20px', marginBottom: '20px', textAlign: 'center', color: GRAY, fontSize: '14px' }}>
              No sessions scheduled for today.
            </div>
          )}

          {/* Pending Consultation Requests */}
          {data.consultation_requests && data.consultation_requests.filter(r => r.status === 'pending').length > 0 && (
            <>
              <h3 style={{ marginTop: '24px', marginBottom: '12px', fontSize: '16px', fontWeight: 700 }}>⏳ Pending Consultation Requests</h3>
              {data.consultation_requests.filter(r => r.status === 'pending').map(req => {
                const modeIcon = req.preferred_mode === 'video' ? '📹' : req.preferred_mode === 'phone' ? '📞' : '🏢';
                return (
                  <div key={req.request_id} style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '14px', color: '#1C2A40' }}>👤 {req.client_name || 'Client'}</div>
                        {req.client_phone && (
                          <div style={{ fontSize: '12px', color: GRAY }}>📞 {req.client_phone}</div>
                        )}
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px', background: '#FEF3C7', color: '#92400E' }}>AWAITING RESPONSE</span>
                    </div>
                    <div style={{ fontSize: '13px', color: GRAY, marginBottom: '4px' }}>
                      {req.matter_type && req.matter_type.charAt(0).toUpperCase() + req.matter_type.slice(1)} · {req.urgency === 'high' ? '⚡ Urgent' : 'Standard'} · {modeIcon} {req.preferred_mode === 'video' ? 'Video' : req.preferred_mode === 'phone' ? 'Phone' : 'In-Person'}
                    </div>
                    <div style={{ fontSize: '13px', color: GRAY }}>Preferred: {req.preferred_date || '—'} at {req.preferred_time || '—'}</div>
                    {req.brief && (
                      <div style={{ fontSize: '12px', color: GRAY, marginTop: '6px', fontStyle: 'italic' }}>
                        "{req.brief.length > 100 ? req.brief.substring(0, 100) + '…' : req.brief}"
                      </div>
                    )}
                    <div style={{ fontSize: '12px', color: '#92400E', marginTop: '8px', fontWeight: 600 }}>
                      Review the request and accept or decline. The client will be notified of your response.
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* Active Cases */}
          <h3 style={{ marginTop: '24px', marginBottom: '12px', fontSize: '16px', fontWeight: 700 }}>📋 Your Active Cases</h3>
          {data.active_matters.map(matter => (
            <div key={matter.matter_id} className="case-card" onClick={() => navigate('/crm/matters')} style={{ cursor: 'pointer' }}>
              <div className="case-number">📁 MATTER #{matter.matter_number}</div>
              <div className="case-title">{matter.title}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <span className={`badge ${STATUS_BADGE[matter.status] || 'badge-draft'}`}>
                  ● {STATUS_LABEL[matter.status] || matter.status}
                </span>
                <span className="badge badge-active">{matter.role_on_matter}</span>
              </div>
              <div className="case-advocate">Priority: {matter.urgency} · {matter.upcoming_hearings} upcoming hearings</div>
              <span className="view-link">View Details →</span>
            </div>
          ))}
          {data.active_matters.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: 40 }}>
              <p style={{ fontSize: 16, color: GRAY }}>No active cases assigned yet.</p>
            </div>
          )}
        </>
      )}

      {/* ── SESSIONS TAB ─────────────────────────────────────────────────────── */}
      {view === 'sessions' && (
        <>
          <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 700 }}>📹 Scheduled Sessions</h3>
          {data.consultation_sessions.map(session => {
            const modeIcon = session.session_mode === 'video' ? '📹' : session.session_mode === 'phone' ? '📞' : '🏢';
            const dateFormatted = session.scheduled_date
              ? new Date(String(session.scheduled_date).split('T')[0] + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
              : '—';
            const timeFormatted = (() => {
              if (!session.scheduled_time) return '—';
              const [h, m] = session.scheduled_time.split(':').map(Number);
              const period = h >= 12 ? 'PM' : 'AM';
              return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${period}`;
            })();
            return (
              <div key={session.session_id} style={{ background: '#FFFFFF', border: '2px solid #E2E8F0', borderLeft: '4px solid #3D6FB0', borderRadius: '12px', padding: '18px 20px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: '#1C2A40' }}>{modeIcon} {session.client_name || 'Client'}</div>
                    <div style={{ fontSize: '13px', color: GRAY, marginTop: '4px' }}>
                      {session.matter_type ? session.matter_type.charAt(0).toUpperCase() + session.matter_type.slice(1) : 'Consultation'} · {session.session_mode === 'video' ? 'Video Call' : session.session_mode === 'phone' ? 'Phone Call' : 'In-Person'}
                    </div>
                  </div>
                  <span className={`badge ${session.status === 'scheduled' ? 'badge-pending' : session.status === 'active' ? 'badge-active' : session.status === 'completed' ? 'badge-sent' : 'badge-closed'}`}>
                    {session.status.toUpperCase()}
                  </span>
                </div>

                {/* Date & Time */}
                <div style={{ background: '#F8FAFC', borderRadius: '9px', padding: '12px 14px', marginBottom: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                  <div><span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '2px' }}>DATE</span><span style={{ fontWeight: 600, color: '#1C2A40' }}>{dateFormatted}</span></div>
                  <div><span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '2px' }}>TIME</span><span style={{ fontWeight: 600, color: '#1C2A40' }}>{timeFormatted} · {session.duration_minutes} min</span></div>
                </div>

                {/* Mode-specific client contact block */}
                {session.session_mode === 'video' ? (
                  session.meeting_link ? (
                    <div style={{ borderRadius: '9px', overflow: 'hidden', border: '1px solid #BFDBFE' }}>
                      <div style={{ padding: '12px 16px', background: '#EFF6FF', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#1D4ED8' }}>📹 Video Meeting Room</div>
                          <div style={{ fontSize: '11px', color: '#3B82F6', marginTop: '3px' }}>
                            📅 Please join on <strong>{new Date(String(session.scheduled_date).split('T')[0] + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</strong> at <strong>{(() => { const [h, m] = session.scheduled_time.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`; })()}</strong>
                          </div>
                          <div style={{ fontSize: '11px', color: '#3B82F6', marginTop: '2px' }}>
                            Sign in with your Google account to enter the meeting
                          </div>
                        </div>
                        <a href={session.meeting_link} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ padding: '9px 18px', background: '#1A73E8', color: '#FFF', borderRadius: '8px', fontSize: '13px', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                          Join Meet →
                        </a>
                      </div>
                      <div style={{ padding: '8px 14px', background: '#F0F7FF', borderTop: '1px solid #BFDBFE', fontSize: '11px', color: '#60A5FA', fontFamily: 'monospace', wordBreak: 'break-all', letterSpacing: '0.02em' }}>
                        {session.meeting_link}
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '12px 14px', background: '#FEF9C3', borderRadius: '9px', fontSize: '13px', color: '#92400E', fontWeight: 600 }}>
                      🔄 Video Meeting link pending — will appear here once generated
                    </div>
                  )
                ) : session.session_mode === 'phone' ? (
                  <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '9px', padding: '12px 16px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#166534', marginBottom: '6px' }}>📞 Phone Consultation — Call the Client</div>
                    {session.client_phone ? (
                      <div style={{ fontSize: '14px', color: '#15803D', fontWeight: 700 }}>
                        <a href={`tel:${session.client_phone}`} style={{ color: '#15803D', textDecoration: 'none' }}>{session.client_phone}</a>
                      </div>
                    ) : (
                      <div style={{ fontSize: '13px', color: '#15803D' }}>Client phone not available</div>
                    )}
                    {session.client_email && (
                      <div style={{ fontSize: '12px', color: '#166534', marginTop: '4px' }}>{session.client_email}</div>
                    )}
                    <div style={{ fontSize: '12px', color: '#15803D', marginTop: '6px', fontStyle: 'italic' }}>You initiate the call at the scheduled time.</div>
                  </div>
                ) : (
                  <div style={{ background: '#FFF8E8', border: '1px solid #FDE68A', borderRadius: '9px', padding: '12px 16px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#92400E', marginBottom: '6px' }}>🏢 In-Person Meeting</div>
                    <div style={{ fontSize: '13px', color: '#92400E' }}>Client will visit your chambers at the scheduled time.</div>
                    {session.client_phone && (
                      <div style={{ marginTop: '6px', fontSize: '13px', color: '#92400E', fontWeight: 600 }}>
                        Client: <a href={`tel:${session.client_phone}`} style={{ color: '#92400E' }}>{session.client_phone}</a>
                      </div>
                    )}
                    {session.client_email && (
                      <div style={{ fontSize: '12px', color: '#92400E', marginTop: '3px' }}>{session.client_email}</div>
                    )}
                  </div>
                )}

                {session.notes && (
                  <div style={{ marginTop: '10px', fontSize: '12px', color: GRAY, fontStyle: 'italic', paddingLeft: '4px' }}>"{session.notes.length > 120 ? session.notes.slice(0, 120) + '…' : session.notes}"</div>
                )}
              </div>
            );
          })}
          {data.consultation_sessions.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: 40 }}>
              <p style={{ fontSize: 16, color: GRAY }}>No scheduled sessions yet. Clients can book consultations directly from your public profile.</p>
            </div>
          )}
        </>
      )}

      {/* ── SCHEDULE TAB ─────────────────────────────────────────────────────── */}
      {view === 'schedule' && (
        <div className="card">
          <h3 style={{ marginBottom: '8px', fontSize: '18px', fontWeight: 700 }}>📅 Weekly Availability</h3>
          <p style={{ color: GRAY, fontSize: '13px', marginBottom: '20px' }}>
            Toggle days on or off and set your working hours. Clients can only book slots within your available windows.
          </p>

          {scheduleLoading && (
            <div style={{ textAlign: 'center', color: GRAY, padding: '30px', fontSize: '14px' }}>Loading schedule…</div>
          )}

          {!scheduleLoading && scheduleData && (
            <>
              {scheduleData.map((day, idx) => (
                <div
                  key={day.day_of_week}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
                    padding: '14px 16px', borderRadius: '10px', marginBottom: '10px',
                    background: day.is_available ? '#F8FAFC' : '#F1F5F9',
                    border: `1px solid ${day.is_available ? '#CBD5E1' : '#E2E8F0'}`,
                    opacity: day.is_available ? 1 : 0.7,
                    transition: 'opacity 0.15s',
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', minWidth: '120px' }}>
                    <input
                      type="checkbox"
                      checked={day.is_available}
                      onChange={e => updateScheduleDay(idx, 'is_available', e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: NAVY }}
                    />
                    <span style={{ fontWeight: 700, fontSize: '14px', color: '#1C2A40' }}>{DAY_FULL[day.day_of_week]}</span>
                  </label>

                  {day.is_available ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: GRAY, fontWeight: 600 }}>FROM</span>
                        <select
                          value={day.start_time}
                          onChange={e => updateScheduleDay(idx, 'start_time', e.target.value)}
                          style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', background: '#FFF', color: '#1C2A40' }}
                        >
                          {TIME_OPTIONS.map(t => <option key={t} value={t}>{fmt12h(t)}</option>)}
                        </select>
                        <span style={{ fontSize: '12px', color: GRAY, fontWeight: 600 }}>TO</span>
                        <select
                          value={day.end_time}
                          onChange={e => updateScheduleDay(idx, 'end_time', e.target.value)}
                          style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', background: '#FFF', color: '#1C2A40' }}
                        >
                          {TIME_OPTIONS.map(t => <option key={t} value={t}>{fmt12h(t)}</option>)}
                        </select>
                      </div>
                      <span style={{ fontSize: '12px', color: '#059669', fontWeight: 600, marginLeft: 'auto' }}>✓ Available</span>
                    </>
                  ) : (
                    <span style={{ fontSize: '13px', color: '#94A3B8', fontStyle: 'italic' }}>
                      Day off — clients cannot book on this day
                    </span>
                  )}
                </div>
              ))}

              {scheduleError && (
                <div style={{ padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', color: '#DC2626', fontSize: '13px', marginBottom: '14px' }}>
                  {scheduleError}
                </div>
              )}
              {scheduleSaved && (
                <div style={{ padding: '12px 16px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', color: '#15803D', fontSize: '13px', fontWeight: 600, marginBottom: '14px' }}>
                  ✓ Schedule saved! Clients will see your updated availability immediately.
                </div>
              )}

              <button
                className="btn btn-navy"
                onClick={saveSchedule}
                disabled={scheduleSaving}
                style={{ marginTop: '8px', width: '100%', padding: '14px', fontSize: '15px', fontWeight: 700 }}
              >
                {scheduleSaving ? 'Saving…' : '💾 Save Schedule'}
              </button>
            </>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="quick-actions">
        <div className="quick-action" onClick={() => navigate('/crm/matters')}>
          <span className="icon">📁</span>
          <span className="label">My Cases</span>
        </div>
        <div className="quick-action" onClick={() => setView('sessions')}>
          <span className="icon">📹</span>
          <span className="label">My Sessions</span>
        </div>
        <div className="quick-action" onClick={() => navigate('/profile')}>
          <span className="icon">👤</span>
          <span className="label">Profile</span>
        </div>
      </div>
    </div>
  );
}
