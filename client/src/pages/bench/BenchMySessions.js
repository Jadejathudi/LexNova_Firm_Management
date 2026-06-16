import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import BenchNav from '../../components/bench/BenchNav';
import { C, TIERS, SERVICES, BenchAvatar, benchFetch } from './benchConstants';

const STATUS_META = {
  pending:            { label: 'Awaiting Intake Call', color: C.gold,    bg: 'rgba(196,152,42,.1)'  },
  intake_scheduled:   { label: 'Intake Call Scheduled', color: '#60A5FA', bg: 'rgba(96,165,250,.1)'  },
  intake_done:        { label: 'Brief Submitted to Judge', color: '#A78BFA', bg: 'rgba(167,139,250,.1)' },
  session_scheduled:  { label: 'Session Confirmed',    color: '#34D399', bg: 'rgba(52,211,153,.1)'  },
  completed:          { label: 'Completed',             color: '#15803D', bg: 'rgba(21,128,61,.1)'   },
  cancelled:          { label: 'Cancelled',             color: C.gray,    bg: 'rgba(255,255,255,.04)' },
};

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function BenchMySessions() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedSession, setExpandedSession] = useState(null);
  const [clientNotes, setClientNotes] = useState({});
  const [savingNotes, setSavingNotes] = useState({});
  const [cancelling, setCancelling] = useState({});

  const token = localStorage.getItem('clearcase_token');

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    benchFetch('/my-sessions')
      .then(data => {
        setSessions(data);
        const notesMap = {};
        data.forEach(s => {
          notesMap[s.booking_id] = s.client_notes || '';
        });
        setClientNotes(notesMap);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, navigate]);

  const saveClientNotes = async (bookingId) => {
    setSavingNotes(prev => ({ ...prev, [bookingId]: true }));
    try {
      const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
      const res = await fetch(`${API_BASE}/bench/bookings/${bookingId}/client-notes`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ client_notes: clientNotes[bookingId] || null }),
      });

      if (!res.ok) throw new Error('Failed to save notes');

      setSessions(sessions.map(s =>
        s.booking_id === bookingId ? { ...s, client_notes: clientNotes[bookingId] } : s
      ));
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingNotes(prev => ({ ...prev, [bookingId]: false }));
    }
  };

  const cancelSession = async (bookingId) => {
    if (!window.confirm('Cancel this session request?')) return;
    setCancelling(prev => ({ ...prev, [bookingId]: true }));
    try {
      const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
      const res = await fetch(`${API_BASE}/bench/bookings/${bookingId}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to cancel session');
      }
      setSessions(prev => prev.map(s => s.booking_id === bookingId ? { ...s, status: 'cancelled' } : s));
    } catch (err) {
      setError(err.message);
    } finally {
      setCancelling(prev => ({ ...prev, [bookingId]: false }));
    }
  };

  return (
    <div style={{ fontFamily: "'Jost',sans-serif", background: C.ink, color: C.parchment, minHeight: '100vh' }}>
      <BenchNav />

      <div style={{ background: C.charcoal, padding: '36px 80px 28px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: C.gold, marginBottom: 8 }}>Your Bench Activity</div>
        <h1 style={{ fontFamily: "'EB Garamond',serif", fontSize: 36, fontWeight: 700, marginBottom: 6 }}>My Sessions</h1>
        <p style={{ color: C.grayLight, fontSize: 14, fontFamily: "'EB Garamond',serif" }}>Track your judicial consultation bookings and session history.</p>
      </div>

      <div style={{ background: C.ink, padding: '36px 80px', minHeight: '70vh' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 80, color: C.gray }}>Loading your sessions…</div>
        )}
        {error && (
          <div style={{ background: 'rgba(220,38,38,.1)', border: '1px solid rgba(220,38,38,.3)', borderRadius: 4, padding: 16, color: '#FCA5A5', fontSize: 13, marginBottom: 24 }}>{error}</div>
        )}
        {!loading && !error && sessions.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 40px' }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>⚖️</div>
            <h3 style={{ fontFamily: "'EB Garamond',serif", fontSize: 24, fontWeight: 600, color: C.parchment, marginBottom: 10 }}>No sessions yet</h3>
            <p style={{ color: C.gray, fontSize: 14, marginBottom: 28 }}>You haven't booked a session with any judge on The Bench.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => navigate('/bench/directory')} style={{ background: C.gold, color: C.ink, border: 'none', borderRadius: 3, padding: '13px 32px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Jost',sans-serif" }}>
                Browse Judges →
              </button>
              <button onClick={() => navigate('/matters')} style={{ background: 'transparent', color: C.gold, border: `1.5px solid ${C.gold}`, borderRadius: 3, padding: '13px 32px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Jost',sans-serif" }}>
                Check My Matters →
              </button>
            </div>
          </div>
        )}
        {!loading && sessions.length > 0 && (
          <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {sessions.map(s => {
              const t = TIERS[s.tier] || TIERS.junior;
              const statusMeta = STATUS_META[s.status] || STATUS_META.pending;
              const service = SERVICES.find(sv => sv.id === s.service_type) || SERVICES[0];
              const judge = { judge_id: s.judge_id, name: s.judge_name, tier: s.tier, initials: s.initials };

              return (
                <div key={s.booking_id} style={{ background: C.charcoal, border: `1px solid ${t.border}`, borderRadius: 4, padding: 22 }}>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
                    <BenchAvatar judge={judge} size={52} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                        <div>
                          <div style={{ fontFamily: "'EB Garamond',serif", fontSize: 17, fontWeight: 600, color: C.parchment, lineHeight: 1.3 }}>{s.judge_name}</div>
                          <div style={{ fontSize: 12, color: C.gray, marginTop: 2 }}>{t.badge} · {s.city}</div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 2, padding: '4px 10px', background: statusMeta.bg, color: statusMeta.color, whiteSpace: 'nowrap' }}>
                          {statusMeta.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
                    {[
                      ['Booking Ref', s.booking_ref],
                      ['Service', `${service.icon} ${service.name}`],
                      ['Format', s.session_format === 'video' ? '📹 Video' : '📞 Phone'],
                      ['Preferred Date', fmt(s.preferred_date)],
                      ['Preferred Time', s.preferred_slot],
                      ['Confirmed Date', s.confirmed_date ? fmt(s.confirmed_date) : '—'],
                    ].map(([label, value]) => (
                      <div key={label} style={{ background: C.charcoalMid, borderRadius: 3, padding: '10px 13px' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 3 }}>{label}</div>
                        <div style={{ fontSize: 12, color: C.parchment }}>{value}</div>
                      </div>
                    ))}
                  </div>

                  {s.intake_notes && (
                    <div style={{ background: 'rgba(196,152,42,.06)', border: `1px solid ${C.borderGold}`, borderRadius: 3, padding: '10px 14px', marginBottom: 10 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>Intake Notes</div>
                      <div style={{ fontSize: 13, color: C.grayLight, lineHeight: 1.65, fontFamily: "'EB Garamond',serif" }}>{s.intake_notes}</div>
                    </div>
                  )}

                  {s.session_notes && (
                    <div style={{ background: C.charcoalMid, borderRadius: 3, padding: '10px 14px', marginBottom: 10 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>Session Notes</div>
                      <div style={{ fontSize: 13, color: C.grayLight, lineHeight: 1.65, fontFamily: "'EB Garamond',serif" }}>{s.session_notes}</div>
                    </div>
                  )}

                  {s.status === 'completed' && s.case_summary && (
                    <div style={{ background: C.charcoalMid, border: `1px solid ${C.border}`, borderRadius: 3, padding: '10px 14px', marginBottom: 10 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>📋 Case Summary</div>
                      <div style={{ fontSize: 13, color: C.grayLight, lineHeight: 1.65, fontFamily: "'EB Garamond',serif" }}>{s.case_summary}</div>
                    </div>
                  )}

                  {s.status === 'completed' && s.judge_notes && (
                    <div style={{ background: 'rgba(212,212,16,.06)', border: '1px solid rgba(212,212,16,.3)', borderRadius: 3, padding: '10px 14px', marginBottom: 10 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#D4D410', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>🔍 Judge's Observations</div>
                      <div style={{ fontSize: 13, color: C.grayLight, lineHeight: 1.65, fontFamily: "'EB Garamond',serif" }}>{s.judge_notes}</div>
                    </div>
                  )}

                  {/* Client notes section */}
                  <div style={{ background: 'rgba(52,211,153,.06)', border: '1px solid rgba(52,211,153,.3)', borderRadius: 3, padding: '10px 14px', marginBottom: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#34D399', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>📝 Your Notes</div>
                    <textarea
                      value={clientNotes[s.booking_id] || ''}
                      onChange={e => setClientNotes(prev => ({ ...prev, [s.booking_id]: e.target.value }))}
                      placeholder="Add your own notes about this consultation…"
                      style={{
                        width: '100%',
                        minHeight: '80px',
                        background: C.charcoalMid,
                        border: '1px solid rgba(52,211,153,.2)',
                        borderRadius: 2,
                        color: C.parchment,
                        padding: '8px 10px',
                        fontSize: 12,
                        fontFamily: "'EB Garamond',serif",
                        boxSizing: 'border-box',
                        resize: 'vertical',
                      }}
                    />
                    <button
                      onClick={() => saveClientNotes(s.booking_id)}
                      disabled={savingNotes[s.booking_id]}
                      style={{
                        marginTop: 6,
                        fontSize: 11,
                        padding: '6px 12px',
                        background: '#34D399',
                        color: C.ink,
                        border: 'none',
                        borderRadius: 2,
                        fontWeight: 700,
                        cursor: savingNotes[s.booking_id] ? 'not-allowed' : 'pointer',
                        opacity: savingNotes[s.booking_id] ? 0.6 : 1,
                        fontFamily: "'Jost',sans-serif",
                      }}
                    >
                      {savingNotes[s.booking_id] ? 'Saving…' : 'Save Notes'}
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                    <button onClick={() => navigate(`/bench/judges/${s.judge_id}`)}
                      style={{ background: 'transparent', color: C.gold, border: `1px solid ${C.borderGold}`, borderRadius: 3, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Jost',sans-serif" }}>
                      View Judge Profile →
                    </button>
                    {s.matter_id && (
                      <Link
                        to={`/matters/${s.matter_id}`}
                        style={{
                          background: 'rgba(196,152,42,.12)', color: C.gold,
                          border: `1px solid ${C.borderGold}`, borderRadius: 3,
                          padding: '7px 14px', fontSize: 12, fontWeight: 600,
                          textDecoration: 'none', fontFamily: "'Jost',sans-serif", display: 'inline-block',
                        }}
                      >
                        📁 {s.matter_ref || 'View Matter Record'}
                      </Link>
                    )}
                    {s.status === 'completed' && (
                      <button onClick={() => navigate(`/bench/schedule/${s.judge_id}`)}
                        style={{ background: C.gold, color: C.ink, border: 'none', borderRadius: 3, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Jost',sans-serif" }}>
                        Book Another Session →
                      </button>
                    )}
                    {(s.status === 'pending' || s.status === 'intake_scheduled') && (
                      <>
                        <button onClick={() => navigate(`/bench/schedule/${s.judge_id}`)}
                          style={{ background: 'transparent', color: C.grayLight, border: `1px solid ${C.border}`, borderRadius: 3, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Jost',sans-serif" }}>
                          Reschedule
                        </button>
                        <button onClick={() => cancelSession(s.booking_id)} disabled={cancelling[s.booking_id]}
                          style={{ background: 'transparent', color: '#FCA5A5', border: '1px solid rgba(220,38,38,.4)', borderRadius: 3, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: cancelling[s.booking_id] ? 'not-allowed' : 'pointer', opacity: cancelling[s.booking_id] ? 0.6 : 1, fontFamily: "'Jost',sans-serif" }}>
                          {cancelling[s.booking_id] ? 'Cancelling…' : 'Cancel Session'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 36 }}>
          <button onClick={() => navigate('/bench/directory')} style={{ background: 'transparent', color: C.gold, border: `1.5px solid ${C.gold}`, borderRadius: 3, padding: '11px 28px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Jost',sans-serif" }}>
            Browse More Judges →
          </button>
        </div>
      </div>
    </div>
  );
}
