import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';

export default function CRMConsultations() {
  const [consultations, setConsultations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('guest');
  const [actionMessage, setActionMessage] = useState('');

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.getConsultations().catch(() => []),
      api.getConsultationRequests().catch(() => []),
      api.getAllConsultationSessions().catch(() => []),
    ]).then(([guestData, requestData, sessionData]) => {
      setConsultations(guestData || []);
      setRequests(requestData || []);
      setSessions(sessionData || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const scheduleRequest = async (requestId) => {
    setActionMessage('');
    try {
      const session = await api.scheduleConsultationRequest(requestId, { instant_service: true });
      setActionMessage(`Session created: ${session.meeting_link ? 'Google Meet link generated' : 'Scheduled successfully'}`);
      loadData();
    } catch (error) {
      console.error('Error scheduling request:', error);
      setActionMessage('Unable to schedule the session automatically. Please try again.');
    }
  };

  if (loading) return <div className="loading">Loading bookings...</div>;

  return (
    <div>
      <h2 style={{ color: '#1C2A40', marginBottom: 20 }}>Consultation Bookings</h2>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <button
          className={`btn ${tab === 'guest' ? 'btn-navy' : 'btn-outline'}`}
          onClick={() => setTab('guest')}
          style={{ padding: '10px 20px' }}
        >
          Guest Bookings ({consultations.length})
        </button>
        <button
          className={`btn ${tab === 'advocate' ? 'btn-navy' : 'btn-outline'}`}
          onClick={() => setTab('advocate')}
          style={{ padding: '10px 20px' }}
        >
          Advocate Requests ({requests.length})
        </button>
        <button
          className={`btn ${tab === 'sessions' ? 'btn-navy' : 'btn-outline'}`}
          onClick={() => setTab('sessions')}
          style={{ padding: '10px 20px' }}
        >
          Sessions ({sessions.length})
        </button>
      </div>

      {actionMessage && (
        <div style={{ marginBottom: '18px', padding: '14px 18px', borderRadius: '12px', background: '#E0F2FE', color: '#0369A1' }}>
          {actionMessage}
        </div>
      )}

      {tab === 'guest' && (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Matter Type</th>
                <th>Urgency</th>
                <th>Mode</th>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
                <th>Booked On</th>
              </tr>
            </thead>
            <tbody>
              {consultations.map(c => (
                <tr key={c.consultation_id}>
                  <td><strong>{c.guest_name}</strong></td>
                  <td>{c.guest_phone}</td>
                  <td><span className="badge badge-active">{c.matter_type}</span></td>
                  <td><span className={`badge ${c.urgency === 'urgent' ? 'badge-urgent' : 'badge-draft'}`}>{c.urgency}</span></td>
                  <td>{c.consultation_mode === 'video' ? '📹' : c.consultation_mode === 'phone' ? '📞' : '🏢'} {c.consultation_mode}</td>
                  <td>{c.preferred_date || '—'}</td>
                  <td>{c.preferred_time || '—'}</td>
                  <td><span className={`badge ${c.status === 'booked' ? 'badge-sent' : c.status === 'confirmed' ? 'badge-active' : 'badge-draft'}`}>{c.status}</span></td>
                  <td>{new Date(c.created_at).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {consultations.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>No guest bookings yet.</div>
          )}
        </>
      )}

      {tab === 'advocate' && (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Phone</th>
                <th>Advocate</th>
                <th>Matter</th>
                <th>Urgency</th>
                <th>Mode</th>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(r => (
                <tr key={r.request_id}>
                  <td><strong>{r.client_name}</strong></td>
                  <td>{r.client_phone}</td>
                  <td>{r.advocate_name || '—'}</td>
                  <td><span className="badge badge-active">{r.matter_type}</span></td>
                  <td><span className={`badge ${r.urgency === 'urgent' || r.urgency === 'high' ? 'badge-urgent' : 'badge-draft'}`}>{r.urgency}</span></td>
                  <td>{r.preferred_mode === 'video' ? '📹' : r.preferred_mode === 'phone' ? '📞' : '🏢'} {r.preferred_mode}</td>
                  <td>{r.preferred_date || '—'}</td>
                  <td>{r.preferred_time || '—'}</td>
                  <td><span className={`badge ${r.status === 'pending' ? 'badge-pending' : r.status === 'accepted' ? 'badge-active' : r.status === 'completed' ? 'badge-sent' : 'badge-draft'}`}>{r.status}</span></td>
                  <td>
                    {r.status === 'pending' ? (
                      <button className="btn btn-outline" onClick={() => scheduleRequest(r.request_id)} style={{ padding: '8px 12px' }}>Schedule Now</button>
                    ) : (
                      <span style={{ color: '#64748B', fontSize: '12px' }}>No action</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {requests.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>No advocate consultation requests yet.</div>
          )}
        </>
      )}

      {tab === 'sessions' && (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Advocate</th>
                <th>Mode</th>
                <th>Date</th>
                <th>Time</th>
                <th>Duration</th>
                <th>Meeting Link</th>
                <th>Instant</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.session_id}>
                  <td><strong>{session.client_name}</strong></td>
                  <td>{session.advocate_name || '—'}</td>
                  <td>{session.session_mode === 'video' ? '📹' : session.session_mode === 'phone' ? '📞' : '🏢'} {session.session_mode}</td>
                  <td>{session.scheduled_date}</td>
                  <td>{session.scheduled_time}</td>
                  <td>{session.duration_minutes} min</td>
                  <td>{session.meeting_link ? <a href={session.meeting_link} target="_blank" rel="noreferrer">Join</a> : '—'}</td>
                  <td>{session.instant_service ? <span className="badge badge-active">Instant</span> : 'Scheduled'}</td>
                  <td><span className={`badge ${session.status === 'scheduled' ? 'badge-pending' : session.status === 'active' ? 'badge-active' : session.status === 'completed' ? 'badge-sent' : 'badge-closed'}`}>{session.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {sessions.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>No scheduled sessions available.</div>
          )}
        </>
      )}
    </div>
  );
}
