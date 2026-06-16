import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import BenchNav from '../../components/bench/BenchNav';
import { C, TIERS, SERVICES, JudgeName } from './benchConstants';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const STATUS_META = {
  pending:           { label: 'Awaiting Intake',   color: C.gold,    bg: 'rgba(196,152,42,.1)'  },
  intake_scheduled:  { label: 'Intake Scheduled',  color: '#60A5FA', bg: 'rgba(96,165,250,.1)'  },
  intake_done:       { label: 'Ready for Session', color: '#A78BFA', bg: 'rgba(167,139,250,.1)' },
  session_scheduled: { label: 'Scheduled',         color: '#34D399', bg: 'rgba(52,211,153,.1)'  },
  completed:         { label: 'Completed',          color: '#15803D', bg: 'rgba(21,128,61,.1)'   },
  cancelled:         { label: 'Cancelled',          color: C.gray,   bg: 'rgba(255,255,255,.04)' },
};

const STATUS_TRANSITIONS = {
  pending:           ['intake_scheduled'],
  intake_scheduled:  ['intake_done'],
  intake_done:       ['session_scheduled'],
  session_scheduled: ['completed', 'cancelled'],
  completed:         [],
  cancelled:         [],
};

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 6, padding: '18px 22px', borderLeft: `3px solid ${color}` }}>
      <div style={{ fontSize: 12, color: C.gray, marginBottom: 4, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.06em' }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

export default function JudgeDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const token = localStorage.getItem('clearcase_token');

  const [judge, setJudge] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Per-card expanded state
  const [expandedCard, setExpandedCard] = useState(null);
  const [expandedTab, setExpandedTab] = useState('notes'); // 'notes' | 'case'

  // Notes editing state maps (keyed by booking_id)
  const [judgeNotesMap, setJudgeNotesMap] = useState({});
  const [statusMap, setStatusMap] = useState({});
  const [savingNotes, setSavingNotes] = useState({});
  const [notesSaved, setNotesSaved] = useState({});

  // Case details state maps (keyed by booking_id)
  const [caseDetailsMap, setCaseDetailsMap] = useState({});
  const [caseSummaryMap, setCaseSummaryMap] = useState({});
  const [matterRefMap, setMatterRefMap] = useState({});
  const [savingCase, setSavingCase] = useState({});
  const [caseSaved, setCaseSaved] = useState({});
  const [loadingCase, setLoadingCase] = useState({});

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const [judgeRes, sessionsRes] = await Promise.all([
        fetch(`${API_BASE}/bench/judge/me`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/bench/judge/sessions?status=${statusFilter}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (!judgeRes.ok || !sessionsRes.ok) throw new Error('Failed to fetch data');
      const judgeData = await judgeRes.json();
      const sessionsData = await sessionsRes.json();
      setJudge(judgeData);
      const list = sessionsData || [];
      setSessions(list);
      // Seed local notes/status maps from fetched data
      const notes = {}, statuses = {};
      list.forEach(s => {
        notes[s.booking_id] = s.judge_notes || '';
        statuses[s.booking_id] = s.status;
      });
      setJudgeNotesMap(notes);
      setStatusMap(statuses);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchCaseDetails = async (bookingId) => {
    if (caseDetailsMap[bookingId] !== undefined) return; // already loaded
    setLoadingCase(p => ({ ...p, [bookingId]: true }));
    try {
      const res = await fetch(`${API_BASE}/bench/judge/sessions/${bookingId}/case-details`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setCaseDetailsMap(p => ({ ...p, [bookingId]: data }));
      setCaseSummaryMap(p => ({ ...p, [bookingId]: data.case_summary || '' }));
      setMatterRefMap(p => ({ ...p, [bookingId]: data.linked_matter_ref || '' }));
    } catch {
      setCaseDetailsMap(p => ({ ...p, [bookingId]: {} }));
    } finally {
      setLoadingCase(p => ({ ...p, [bookingId]: false }));
    }
  };

  const handleToggleCard = (bookingId, tab) => {
    const same = expandedCard === bookingId && expandedTab === tab;
    setExpandedCard(same ? null : bookingId);
    setExpandedTab(tab);
    if (tab === 'case' && !same) fetchCaseDetails(bookingId);
  };

  const handleSaveNotes = async (bookingId) => {
    setSavingNotes(p => ({ ...p, [bookingId]: true }));
    try {
      await fetch(`${API_BASE}/bench/judge/sessions/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ judge_notes: judgeNotesMap[bookingId] || null, status: statusMap[bookingId] }),
      });
      setSessions(prev => prev.map(s =>
        s.booking_id === bookingId
          ? { ...s, judge_notes: judgeNotesMap[bookingId] ?? s.judge_notes, status: statusMap[bookingId] ?? s.status }
          : s
      ));
      setNotesSaved(p => ({ ...p, [bookingId]: true }));
      setTimeout(() => {
        setNotesSaved(p => ({ ...p, [bookingId]: false }));
        setExpandedCard(null);
      }, 1200);
    } catch {
      // keep panel open on error
    } finally {
      setSavingNotes(p => ({ ...p, [bookingId]: false }));
    }
  };

  const handleSaveCase = async (bookingId) => {
    setSavingCase(p => ({ ...p, [bookingId]: true }));
    try {
      await fetch(`${API_BASE}/bench/judge/sessions/${bookingId}/case-details`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          case_summary: caseSummaryMap[bookingId] || null,
          linked_matter_ref: matterRefMap[bookingId] || null,
        }),
      });
      // Refresh case details to get linked matter info
      setCaseDetailsMap(p => ({ ...p, [bookingId]: undefined }));
      await fetchCaseDetails(bookingId);
      setCaseSaved(p => ({ ...p, [bookingId]: true }));
      setTimeout(() => {
        setCaseSaved(p => ({ ...p, [bookingId]: false }));
        setExpandedCard(null);
      }, 1200);
    } catch {
      // keep panel open on error
    } finally {
      setSavingCase(p => ({ ...p, [bookingId]: false }));
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div style={{ fontFamily: "'Jost',sans-serif", background: C.ink, color: C.parchment, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: C.gray }}>Loading your dashboard…</div>
      </div>
    );
  }

  if (!judge) {
    return (
      <div style={{ fontFamily: "'Jost',sans-serif", background: C.ink, color: C.parchment, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#FCA5A5', fontSize: 16 }}>{error || 'Unable to load judge profile'}</p>
          <button onClick={() => navigate('/login')} style={{ marginTop: 16, padding: '10px 20px', background: C.gold, color: C.ink, border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}>
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

      {/* Judge header */}
      <div style={{ background: C.charcoal, padding: '20px 80px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: t.bg, border: `2px solid ${t.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: t.color }}>
            {judge.initials}
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.parchment }}><JudgeName name={judge.name} /></div>
            <div style={{ fontSize: 12, color: C.gray, marginTop: 2 }}>{t.badge} · {judge.city}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: C.gray }}>
            {judge.slots_left} slot{judge.slots_left !== 1 ? 's' : ''} remaining this month
          </span>
          <button
            onClick={handleLogout}
            style={{ padding: '9px 18px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 4, color: C.gray, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Title */}
      <div style={{ background: C.charcoal, padding: '32px 80px 20px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: C.gold, marginBottom: 8 }}>Your Bench</div>
        <h1 style={{ fontFamily: "'EB Garamond',serif", fontSize: 36, fontWeight: 700, marginBottom: 4 }}>Session Dashboard</h1>
        <p style={{ color: C.grayLight, fontSize: 14, fontFamily: "'EB Garamond',serif" }}>Manage consultations, update notes, and track case details — all inline.</p>
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
              onClick={() => { setStatusFilter(s); setExpandedCard(null); }}
              style={{
                padding: '9px 16px',
                background: statusFilter === s ? C.gold : 'transparent',
                color: statusFilter === s ? C.ink : C.gold,
                border: `1px solid ${C.borderGold}`,
                borderRadius: 4, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: "'Jost',sans-serif",
              }}
            >
              {s === 'all' ? 'All Sessions' : STATUS_META[s]?.label || s}
            </button>
          ))}
        </div>
      </div>

      {/* Sessions list */}
      <div style={{ background: C.ink, padding: '24px 80px 60px', minHeight: '60vh' }}>
        {error && (
          <div style={{ background: 'rgba(220,38,38,.1)', border: '1px solid rgba(220,38,38,.3)', borderRadius: 4, padding: 16, color: '#FCA5A5', fontSize: 13, marginBottom: 24 }}>
            {error}
          </div>
        )}

        {sessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 40px' }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>📅</div>
            <h3 style={{ fontFamily: "'EB Garamond',serif", fontSize: 24, fontWeight: 600, color: C.parchment, marginBottom: 10 }}>No sessions</h3>
            <p style={{ color: C.gray, fontSize: 14 }}>No sessions match the selected filter.</p>
          </div>
        ) : (
          <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sessions.map(s => {
              const statusMeta = STATUS_META[s.status] || STATUS_META.pending;
              const service = SERVICES.find(sv => sv.id === s.service_type) || SERVICES[0];
              const transitions = STATUS_TRANSITIONS[s.status] || [];
              const isNotesOpen = expandedCard === s.booking_id && expandedTab === 'notes';
              const isCaseOpen = expandedCard === s.booking_id && expandedTab === 'case';
              const cd = caseDetailsMap[s.booking_id];

              return (
                <div key={s.booking_id} style={{ background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden' }}>
                  {/* Card summary row */}
                  <div style={{ padding: '18px 22px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'start', marginBottom: 14 }}>
                      <div>
                        <div style={{ fontFamily: "'EB Garamond',serif", fontSize: 18, fontWeight: 600, color: C.parchment, marginBottom: 3 }}>
                          {s.client_name || s.guest_name || 'Guest Client'}
                        </div>
                        <div style={{ fontSize: 12, color: C.gray }}>
                          {s.client_email || s.guest_email || '—'} · {s.client_phone || s.guest_phone || '—'}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 2, padding: '4px 10px', background: statusMeta.bg, color: statusMeta.color, whiteSpace: 'nowrap' }}>
                        {statusMeta.label}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
                      <div style={{ background: C.charcoalMid, borderRadius: 3, padding: '8px 12px' }}>
                        <div style={{ fontSize: 10, color: C.gray, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>Ref</div>
                        <div style={{ fontSize: 12, color: C.parchment, fontFamily: 'monospace', fontWeight: 700 }}>{s.booking_ref}</div>
                      </div>
                      <div style={{ background: C.charcoalMid, borderRadius: 3, padding: '8px 12px' }}>
                        <div style={{ fontSize: 10, color: C.gray, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>Service</div>
                        <div style={{ fontSize: 12, color: C.parchment }}>{service.icon} {service.name}</div>
                      </div>
                      <div style={{ background: C.charcoalMid, borderRadius: 3, padding: '8px 12px' }}>
                        <div style={{ fontSize: 10, color: C.gray, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>Date</div>
                        <div style={{ fontSize: 12, color: C.parchment }}>{fmt(s.confirmed_date || s.preferred_date)}</div>
                      </div>
                      <div style={{ background: C.charcoalMid, borderRadius: 3, padding: '8px 12px' }}>
                        <div style={{ fontSize: 10, color: C.gray, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>Format</div>
                        <div style={{ fontSize: 12, color: C.parchment }}>{s.session_format === 'video' ? '📹 Video' : '📞 Phone'}</div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleToggleCard(s.booking_id, 'notes')}
                        style={{
                          padding: '8px 14px', fontSize: 12, fontWeight: 600, borderRadius: 3, cursor: 'pointer',
                          background: isNotesOpen ? C.gold : 'transparent',
                          color: isNotesOpen ? C.ink : C.gold,
                          border: `1px solid ${C.borderGold}`,
                          fontFamily: "'Jost',sans-serif",
                        }}
                      >
                        {isNotesOpen ? '▲ Notes' : '▼ Notes'}
                      </button>
                      <button
                        onClick={() => handleToggleCard(s.booking_id, 'case')}
                        style={{
                          padding: '8px 14px', fontSize: 12, fontWeight: 600, borderRadius: 3, cursor: 'pointer',
                          background: isCaseOpen ? C.gold : 'transparent',
                          color: isCaseOpen ? C.ink : C.gold,
                          border: `1px solid ${C.borderGold}`,
                          fontFamily: "'Jost',sans-serif",
                        }}
                      >
                        {isCaseOpen ? '▲ Case Details' : '▼ Case Details'}
                      </button>
                      <button
                        onClick={() => navigate(`/judge/session/${s.booking_id}`)}
                        style={{
                          padding: '8px 14px', fontSize: 12, fontWeight: 600, borderRadius: 3, cursor: 'pointer',
                          background: 'transparent', color: C.grayLight,
                          border: `1px solid ${C.border}`,
                          fontFamily: "'Jost',sans-serif",
                        }}
                      >
                        Full Session →
                      </button>
                      {s.matter_id && (
                        <Link
                          to={`/matters/${s.matter_id}`}
                          style={{
                            padding: '8px 14px', fontSize: 12, fontWeight: 600, borderRadius: 3,
                            background: 'rgba(196,152,42,.12)', color: C.gold,
                            border: `1px solid ${C.borderGold}`,
                            fontFamily: "'Jost',sans-serif", textDecoration: 'none', display: 'inline-block',
                          }}
                        >
                          📁 {s.matter_ref || 'Matter'}
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* ── Notes panel ── */}
                  {isNotesOpen && (
                    <div style={{ borderTop: `1px solid ${C.border}`, padding: '20px 22px', background: 'rgba(196,152,42,.04)' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>🔍 Judge Notes</div>

                      {s.intake_notes && (
                        <div style={{ background: 'rgba(196,152,42,.08)', border: `1px solid ${C.borderGold}`, borderRadius: 3, padding: '10px 14px', marginBottom: 14 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>📋 Intake Notes (from ClearCase team)</div>
                          <div style={{ fontSize: 13, color: C.grayLight, lineHeight: 1.6, fontFamily: "'EB Garamond',serif", whiteSpace: 'pre-wrap' }}>{s.intake_notes}</div>
                        </div>
                      )}

                      <textarea
                        value={judgeNotesMap[s.booking_id] || ''}
                        onChange={e => setJudgeNotesMap(p => ({ ...p, [s.booking_id]: e.target.value }))}
                        placeholder="Add your observations, assessment, and guidance for this consultation…"
                        rows={5}
                        style={{
                          width: '100%', background: C.charcoalMid, border: `1px solid ${C.border}`,
                          borderRadius: 4, color: C.parchment, padding: '12px 14px', fontSize: 13,
                          fontFamily: "'EB Garamond',serif", lineHeight: 1.7, boxSizing: 'border-box', resize: 'vertical',
                        }}
                      />

                      {transitions.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                          <label style={{ fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>Update Status</label>
                          <select
                            value={statusMap[s.booking_id] || s.status}
                            onChange={e => setStatusMap(p => ({ ...p, [s.booking_id]: e.target.value }))}
                            style={{
                              background: C.charcoalMid, border: `1px solid ${C.border}`, borderRadius: 4,
                              color: C.parchment, padding: '9px 12px', fontSize: 13,
                              fontFamily: "'Jost',sans-serif", minWidth: 220,
                            }}
                          >
                            <option value={s.status}>{STATUS_META[s.status]?.label}</option>
                            {transitions.map(t => (
                              <option key={t} value={t}>{STATUS_META[t]?.label}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'center' }}>
                        <button
                          onClick={() => handleSaveNotes(s.booking_id)}
                          disabled={savingNotes[s.booking_id]}
                          style={{
                            padding: '9px 20px', background: notesSaved[s.booking_id] ? '#15803D' : C.gold,
                            color: C.ink, border: 'none', borderRadius: 3, fontSize: 13, fontWeight: 700,
                            cursor: savingNotes[s.booking_id] ? 'not-allowed' : 'pointer',
                            opacity: savingNotes[s.booking_id] ? 0.7 : 1, fontFamily: "'Jost',sans-serif",
                            transition: 'background .2s',
                          }}
                        >
                          {notesSaved[s.booking_id] ? 'Saved ✓' : savingNotes[s.booking_id] ? 'Saving…' : 'Save Notes'}
                        </button>
                        <button
                          onClick={() => setExpandedCard(null)}
                          style={{ padding: '9px 16px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 3, color: C.gray, fontSize: 12, cursor: 'pointer', fontFamily: "'Jost',sans-serif" }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── Case Details panel ── */}
                  {isCaseOpen && (
                    <div style={{ borderTop: `1px solid ${C.border}`, padding: '20px 22px', background: 'rgba(167,139,250,.04)' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#A78BFA', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>📁 Case Details</div>

                      {loadingCase[s.booking_id] ? (
                        <div style={{ color: C.gray, fontSize: 13, padding: '12px 0' }}>Loading case details…</div>
                      ) : (
                        <>
                          {cd && cd.matter_title && (
                            <div style={{ background: 'rgba(167,139,250,.08)', border: '1px solid rgba(167,139,250,.25)', borderRadius: 3, padding: '10px 14px', marginBottom: 14 }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: '#A78BFA', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Linked Matter</div>
                              <div style={{ fontSize: 14, color: C.parchment, fontWeight: 600 }}>{cd.matter_title}</div>
                              <div style={{ fontSize: 12, color: C.gray, marginTop: 2 }}>
                                {cd.matter_number} · {cd.matter_status} · {cd.matter_type}
                              </div>
                            </div>
                          )}

                          <div style={{ marginBottom: 14 }}>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Case Summary</label>
                            <textarea
                              value={caseSummaryMap[s.booking_id] || ''}
                              onChange={e => setCaseSummaryMap(p => ({ ...p, [s.booking_id]: e.target.value }))}
                              placeholder="Summarise the case — key facts, legal issues, prior history, and your preliminary observations…"
                              rows={6}
                              style={{
                                width: '100%', background: C.charcoalMid, border: `1px solid ${C.border}`,
                                borderRadius: 4, color: C.parchment, padding: '12px 14px', fontSize: 13,
                                fontFamily: "'EB Garamond',serif", lineHeight: 1.7, boxSizing: 'border-box', resize: 'vertical',
                              }}
                            />
                          </div>

                          <div style={{ marginBottom: 14 }}>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Link to ClearCase Matter (optional)</label>
                            <input
                              type="text"
                              value={matterRefMap[s.booking_id] || ''}
                              onChange={e => setMatterRefMap(p => ({ ...p, [s.booking_id]: e.target.value }))}
                              placeholder="Enter matter number, e.g. CC-2024-001"
                              style={{
                                width: '100%', background: C.charcoalMid, border: `1px solid ${C.border}`,
                                borderRadius: 4, color: C.parchment, padding: '10px 14px', fontSize: 13,
                                fontFamily: "'Jost',sans-serif", boxSizing: 'border-box',
                              }}
                            />
                            <p style={{ fontSize: 11, color: C.gray, marginTop: 5 }}>
                              Links this consultation to an existing matter in the ClearCase system. Leave blank if not applicable.
                            </p>
                          </div>

                          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <button
                              onClick={() => handleSaveCase(s.booking_id)}
                              disabled={savingCase[s.booking_id]}
                              style={{
                                padding: '9px 20px',
                                background: caseSaved[s.booking_id] ? '#15803D' : '#A78BFA',
                                color: '#fff', border: 'none', borderRadius: 3, fontSize: 13, fontWeight: 700,
                                cursor: savingCase[s.booking_id] ? 'not-allowed' : 'pointer',
                                opacity: savingCase[s.booking_id] ? 0.7 : 1, fontFamily: "'Jost',sans-serif",
                                transition: 'background .2s',
                              }}
                            >
                              {caseSaved[s.booking_id] ? 'Saved ✓' : savingCase[s.booking_id] ? 'Saving…' : 'Save Case Details'}
                            </button>
                            <button
                              onClick={() => setExpandedCard(null)}
                              style={{ padding: '9px 16px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 3, color: C.gray, fontSize: 12, cursor: 'pointer', fontFamily: "'Jost',sans-serif" }}
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
