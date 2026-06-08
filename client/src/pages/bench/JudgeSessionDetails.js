import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BenchNav from '../../components/bench/BenchNav';
import { C, TIERS, SERVICES } from './benchConstants';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const STATUS_TRANSITIONS = {
  pending: ['intake_scheduled'],
  intake_scheduled: ['intake_done'],
  intake_done: ['session_scheduled'],
  session_scheduled: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

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

export default function JudgeSessionDetails() {
  const navigate = useNavigate();
  const { bookingId } = useParams();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [judgeNotes, setJudgeNotes] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem('clearcase_token');

  useEffect(() => {
    if (!token) {
      navigate('/judge/login');
      return;
    }

    const fetchSession = async () => {
      try {
        const res = await fetch(`${API_BASE}/bench/judge/sessions`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error('Failed to fetch sessions');

        const sessions = await res.json();
        const current = sessions.find(s => s.booking_id === bookingId);

        if (!current) throw new Error('Session not found');

        setSession(current);
        setJudgeNotes(current.judge_notes || '');
        setNewStatus(current.status);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [bookingId, token, navigate]);

  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/bench/judge/sessions/${bookingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: newStatus,
          judge_notes: judgeNotes || null,
        }),
      });

      if (!res.ok) throw new Error('Failed to save changes');

      setSession({ ...session, judge_notes: judgeNotes, status: newStatus });
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ fontFamily: "'Jost',sans-serif", background: C.ink, color: C.parchment, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: C.gray }}>Loading session details…</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ fontFamily: "'Jost',sans-serif", background: C.ink, color: C.parchment, minHeight: '100vh' }}>
        <BenchNav />
        <div style={{ padding: '80px 48px', textAlign: 'center' }}>
          <p style={{ color: C.red, fontSize: 16 }}>{error || 'Session not found'}</p>
          <button
            onClick={() => navigate('/judge/dashboard')}
            style={{ marginTop: 16, padding: '10px 20px', background: C.gold, color: C.ink, border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const t = TIERS[session.tier] || TIERS.junior;
  const statusMeta = STATUS_META[session.status] || STATUS_META.pending;
  const service = SERVICES.find(sv => sv.id === session.service_type) || SERVICES[0];
  const possibleTransitions = STATUS_TRANSITIONS[session.status] || [];

  return (
    <div style={{ fontFamily: "'Jost',sans-serif", background: C.ink, color: C.parchment, minHeight: '100vh' }}>
      <BenchNav />

      {/* Header */}
      <div style={{ background: C.charcoal, padding: '32px 80px 20px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <button
            onClick={() => navigate('/judge/dashboard')}
            style={{ background: 'transparent', color: C.gold, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0 }}
          >
            ← Back to Dashboard
          </button>
          <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 2, padding: '4px 10px', background: statusMeta.bg, color: statusMeta.color }}>
            {statusMeta.label}
          </span>
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: C.gold, marginBottom: 8 }}>Session Details</div>
        <h1 style={{ fontFamily: "'EB Garamond',serif", fontSize: 36, fontWeight: 700, marginBottom: 4 }}>Booking {session.booking_ref}</h1>
        <p style={{ color: C.grayLight, fontSize: 14 }}>Review client information, manage status, and add your judicial notes.</p>
      </div>

      {error && (
        <div style={{ background: C.ink, padding: '20px 80px' }}>
          <div style={{ background: 'rgba(220,38,38,.1)', border: '1px solid rgba(220,38,38,.3)', borderRadius: 4, padding: 16, color: '#FCA5A5', fontSize: 13 }}>
            {error}
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ background: C.ink, padding: '36px 80px', minHeight: '70vh' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          {/* Client info */}
          <div style={{ background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 6, padding: 28, marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>📋 Client Information</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.gray, marginBottom: 6 }}>Client Name</div>
                <div style={{ fontSize: 16, color: C.parchment, fontWeight: 600 }}>{session.client_name || session.guest_name || 'Guest Client'}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.gray, marginBottom: 6 }}>Contact</div>
                <div style={{ fontSize: 14, color: C.parchment }}>
                  {session.client_email || session.guest_email || '—'}<br />
                  {session.client_phone || session.guest_phone || '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Session info */}
          <div style={{ background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 6, padding: 28, marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>⚖️ Session Information</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.gray, marginBottom: 6 }}>Service Type</div>
                <div style={{ fontSize: 15, color: C.parchment }}>{service.icon} {service.name}</div>
                <div style={{ fontSize: 12, color: C.gray, marginTop: 4 }}>{service.dur}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.gray, marginBottom: 6 }}>Session Format</div>
                <div style={{ fontSize: 15, color: C.parchment }}>{session.session_format === 'video' ? '📹 Video Call' : '📞 Phone Call'}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.gray, marginBottom: 6 }}>Preferred Date & Time</div>
                <div style={{ fontSize: 15, color: C.parchment }}>{fmt(session.preferred_date)} at {session.preferred_slot}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.gray, marginBottom: 6 }}>Confirmed Date & Time</div>
                <div style={{ fontSize: 15, color: session.confirmed_date ? C.parchment : C.gray }}>
                  {session.confirmed_date ? `${fmt(session.confirmed_date)} at ${session.confirmed_slot}` : 'Pending confirmation'}
                </div>
              </div>
            </div>
          </div>

          {/* Intake notes */}
          {session.intake_notes && (
            <div style={{ background: 'rgba(196,152,42,.06)', border: `1px solid ${C.borderGold}`, borderRadius: 6, padding: 28, marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>📝 Intake Notes (from ClearCase team)</div>
              <div style={{ fontSize: 14, color: C.grayLight, lineHeight: 1.75, whiteSpace: 'pre-wrap', fontFamily: "'EB Garamond',serif" }}>
                {session.intake_notes}
              </div>
            </div>
          )}

          {/* Judge notes section */}
          <div style={{ background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 6, padding: 28, marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>🔍 Your Judicial Notes</div>
            <textarea
              value={judgeNotes}
              onChange={e => setJudgeNotes(e.target.value)}
              placeholder="Add your observations, assessment, recommendations, and guidance for this consultation..."
              style={{
                width: '100%',
                minHeight: '200px',
                background: C.charcoalMid,
                border: `1px solid ${C.border}`,
                borderRadius: 4,
                color: C.parchment,
                padding: '14px 16px',
                fontSize: 13,
                fontFamily: "'EB Garamond',serif",
                lineHeight: 1.75,
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
            <p style={{ fontSize: 11, color: C.gray, marginTop: 8 }}>These notes will be saved and visible to the client after the session is completed.</p>
          </div>

          {/* Status management */}
          {possibleTransitions.length > 0 && (
            <div style={{ background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 6, padding: 28, marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>⚙️ Session Status</div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.gray, marginBottom: 8 }}>Update Session Status</label>
                <select
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: C.charcoalMid,
                    border: `1px solid ${C.border}`,
                    borderRadius: 4,
                    color: C.parchment,
                    fontSize: 13,
                    fontFamily: "'Jost',sans-serif",
                    boxSizing: 'border-box',
                  }}
                >
                  <option value={session.status}>{STATUS_META[session.status]?.label}</option>
                  {possibleTransitions.map(t => (
                    <option key={t} value={t}>{STATUS_META[t]?.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: 11, color: C.gray }}>
                <div>✓ Intake Scheduled</div>
                <div>→ Notes Submitted to Judge</div>
                <div>→ Session Confirmed</div>
                <div>→ Completed</div>
              </div>
            </div>
          )}

          {/* Save button */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={handleSaveChanges}
              disabled={saving}
              style={{
                flex: 1,
                padding: '14px 24px',
                background: C.gold,
                color: C.ink,
                border: 'none',
                borderRadius: 4,
                fontSize: 14,
                fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
                fontFamily: "'Jost',sans-serif",
              }}
            >
              {saving ? 'Saving…' : 'Save Changes & Notes →'}
            </button>
            <button
              onClick={() => navigate('/judge/dashboard')}
              style={{
                flex: 1,
                padding: '14px 24px',
                background: 'transparent',
                color: C.gold,
                border: `1px solid ${C.borderGold}`,
                borderRadius: 4,
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: "'Jost',sans-serif",
              }}
            >
              Discard Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
