import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BenchNav from '../../components/bench/BenchNav';
import { C, TIERS, SERVICES } from './benchConstants';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const STATUS_META = {
  pending:            { label: 'Awaiting Intake', color: C.gold,    bg: 'rgba(196,152,42,.1)'  },
  intake_scheduled:   { label: 'Intake Scheduled', color: '#60A5FA', bg: 'rgba(96,165,250,.1)'  },
  intake_done:        { label: 'Ready for Session', color: '#A78BFA', bg: 'rgba(167,139,250,.1)' },
  session_scheduled:  { label: 'Scheduled', color: '#34D399', bg: 'rgba(52,211,153,.1)'  },
  completed:          { label: 'Completed',        color: '#15803D', bg: 'rgba(21,128,61,.1)'   },
  cancelled:          { label: 'Cancelled',        color: C.gray,    bg: 'rgba(255,255,255,.04)' },
};

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 6, padding: '18px 22px', borderLeft: `3px solid ${color}` }}>
      <div style={{ fontSize: 12, color: C.gray, marginBottom: 4, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.06em' }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color: color }}>{value}</div>
    </div>
  );
}

export default function JudgeDashboard() {
  const navigate = useNavigate();
  const [judge, setJudge] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const token = localStorage.getItem('clearcase_token');

  useEffect(() => {
    if (!token) {
      navigate('/judge/login');
      return;
    }

    const fetchData = async () => {
      try {
        const [judgeRes, sessionsRes] = await Promise.all([
          fetch(`${API_BASE}/bench/judge/me`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE}/bench/judge/sessions?status=${statusFilter}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!judgeRes.ok || !sessionsRes.ok) {
          throw new Error('Failed to fetch data');
        }

        const judgeData = await judgeRes.json();
        const sessionsData = await sessionsRes.json();

        setJudge(judgeData);
        setSessions(sessionsData || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, navigate, statusFilter]);

  if (loading) {
    return (
      <div style={{ fontFamily: "'Jost',sans-serif", background: C.ink, color: C.parchment, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: C.gray }}>Loading your dashboard…</div>
      </div>
    );
  }

  if (!judge) {
    return (
      <div style={{ fontFamily: "'Jost',sans-serif", background: C.ink, color: C.parchment, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: C.red, fontSize: 16 }}>{error || 'Unable to load judge profile'}</p>
          <button onClick={() => navigate('/judge/login')} style={{ marginTop: 16, padding: '10px 20px', background: C.gold, color: C.ink, border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}>
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  const t = TIERS[judge.tier] || TIERS.junior;
  const stats = {
    total: sessions.length,
    pending: sessions.filter(s => s.status === 'pending').length,
    scheduled: sessions.filter(s => s.status === 'session_scheduled').length,
    completed: sessions.filter(s => s.status === 'completed').length,
  };

  return (
    <div style={{ fontFamily: "'Jost',sans-serif", background: C.ink, color: C.parchment, minHeight: '100vh' }}>
      <BenchNav />

      {/* Header with logout */}
      <div style={{ background: C.charcoal, padding: '20px 80px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: t.bg, border: `2px solid ${t.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: t.color }}>
            {judge.initials}
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.parchment }}>{judge.name}</div>
            <div style={{ fontSize: 12, color: C.gray, marginTop: 2 }}>{t.badge}</div>
          </div>
        </div>
        <button
          onClick={() => {
            localStorage.removeItem('clearcase_token');
            localStorage.removeItem('judge_info');
            navigate('/judge/login');
          }}
          style={{ padding: '9px 18px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 4, color: C.gray, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
        >
          Sign Out
        </button>
      </div>

      {/* Dashboard title */}
      <div style={{ background: C.charcoal, padding: '32px 80px 20px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: C.gold, marginBottom: 8 }}>Your Bench</div>
        <h1 style={{ fontFamily: "'EB Garamond',serif", fontSize: 36, fontWeight: 700, marginBottom: 4 }}>Session Dashboard</h1>
        <p style={{ color: C.grayLight, fontSize: 14, fontFamily: "'EB Garamond',serif" }}>Manage your consultation bookings, view client details, and add session notes.</p>
      </div>

      {/* Stats */}
      <div style={{ background: C.ink, padding: '36px 80px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, maxWidth: 1100 }}>
          <StatCard label="Total Sessions" value={stats.total} color={C.gold} />
          <StatCard label="Pending Intake" value={stats.pending} color="#60A5FA" />
          <StatCard label="Scheduled" value={stats.scheduled} color="#34D399" />
          <StatCard label="Completed" value={stats.completed} color="#15803D" />
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: C.ink, padding: '20px 80px' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {['all', 'pending', 'intake_done', 'session_scheduled', 'completed'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '9px 16px',
                background: statusFilter === s ? C.gold : 'transparent',
                color: statusFilter === s ? C.ink : C.gold,
                border: `1px solid ${C.borderGold}`,
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'Jost',sans-serif",
              }}
            >
              {s === 'all' ? 'All Sessions' : STATUS_META[s]?.label || s}
            </button>
          ))}
        </div>
      </div>

      {/* Sessions list */}
      <div style={{ background: C.ink, padding: '36px 80px', minHeight: '60vh' }}>
        {error && (
          <div style={{ background: 'rgba(220,38,38,.1)', border: '1px solid rgba(220,38,38,.3)', borderRadius: 4, padding: 16, color: '#FCA5A5', fontSize: 13, marginBottom: 24 }}>
            {error}
          </div>
        )}

        {sessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 40px' }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>📅</div>
            <h3 style={{ fontFamily: "'EB Garamond',serif", fontSize: 24, fontWeight: 600, color: C.parchment, marginBottom: 10 }}>No sessions</h3>
            <p style={{ color: C.gray, fontSize: 14 }}>You don't have any sessions with the {statusFilter === 'all' ? '' : STATUS_META[statusFilter]?.label?.toLowerCase()} status.</p>
          </div>
        ) : (
          <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {sessions.map(s => {
              const statusMeta = STATUS_META[s.status] || STATUS_META.pending;
              const service = SERVICES.find(sv => sv.id === s.service_type) || SERVICES[0];

              return (
                <div key={s.booking_id} style={{ background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 4, padding: 22 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 16 }}>
                    {/* Left column */}
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>Client</div>
                      <div style={{ fontFamily: "'EB Garamond',serif", fontSize: 18, fontWeight: 600, color: C.parchment, marginBottom: 4 }}>
                        {s.client_name || s.guest_name || 'Guest Client'}
                      </div>
                      <div style={{ fontSize: 12, color: C.gray }}>
                        {s.client_email || s.guest_email || '—'} · {s.client_phone || s.guest_phone || '—'}
                      </div>
                    </div>

                    {/* Right column */}
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>Booking Ref</div>
                          <div style={{ fontSize: 13, color: C.parchment, fontFamily: 'monospace', fontWeight: 700 }}>{s.booking_ref}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>Service</div>
                          <div style={{ fontSize: 13, color: C.parchment }}>{service.icon} {service.name}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Date/time and status */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
                    <div style={{ background: C.charcoalMid, borderRadius: 3, padding: '10px 13px' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 3 }}>Session Date</div>
                      <div style={{ fontSize: 12, color: C.parchment }}>{fmt(s.confirmed_date || s.preferred_date)}</div>
                    </div>
                    <div style={{ background: C.charcoalMid, borderRadius: 3, padding: '10px 13px' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 3 }}>Time Slot</div>
                      <div style={{ fontSize: 12, color: C.parchment }}>{s.confirmed_slot || s.preferred_slot}</div>
                    </div>
                    <div style={{ background: C.charcoalMid, borderRadius: 3, padding: '10px 13px' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 3 }}>Format</div>
                      <div style={{ fontSize: 12, color: C.parchment }}>{s.session_format === 'video' ? '📹 Video' : '📞 Phone'}</div>
                    </div>
                  </div>

                  {/* Status badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 2, padding: '4px 10px', background: statusMeta.bg, color: statusMeta.color }}>
                      {statusMeta.label}
                    </span>
                  </div>

                  {/* Notes preview */}
                  {(s.intake_notes || s.judge_notes) && (
                    <div style={{ display: 'grid', gridTemplateColumns: s.intake_notes && s.judge_notes ? '1fr 1fr' : '1fr', gap: 10, marginBottom: 14 }}>
                      {s.intake_notes && (
                        <div style={{ background: 'rgba(196,152,42,.06)', border: `1px solid ${C.borderGold}`, borderRadius: 3, padding: '10px 14px' }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>📋 Intake Notes</div>
                          <div style={{ fontSize: 12, color: C.grayLight, lineHeight: 1.5 }}>{s.intake_notes.substring(0, 100)}…</div>
                        </div>
                      )}
                      {s.judge_notes && (
                        <div style={{ background: 'rgba(212,212,16,.06)', border: '1px solid rgba(212,212,16,.3)', borderRadius: 3, padding: '10px 14px' }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#D4D410', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>🔍 Your Notes</div>
                          <div style={{ fontSize: 12, color: C.grayLight, lineHeight: 1.5 }}>{s.judge_notes.substring(0, 100)}…</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action button */}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={() => navigate(`/judge/session/${s.booking_id}`)}
                      style={{
                        background: C.gold,
                        color: C.ink,
                        border: 'none',
                        borderRadius: 3,
                        padding: '9px 16px',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: "'Jost',sans-serif",
                      }}
                    >
                      View & Manage Session →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
