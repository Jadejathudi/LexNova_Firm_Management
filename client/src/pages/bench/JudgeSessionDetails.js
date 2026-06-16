import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import BenchNav from '../../components/bench/BenchNav';
import { C, TIERS, SERVICES } from './benchConstants';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const STATUS_TRANSITIONS = {
  pending:           ['intake_scheduled'],
  intake_scheduled:  ['intake_done'],
  intake_done:       ['session_scheduled'],
  session_scheduled: ['completed', 'cancelled'],
  completed:         [],
  cancelled:         [],
};

const STATUS_META = {
  pending:           { label: 'Awaiting Intake',   color: C.gold,    bg: 'rgba(196,152,42,.1)'  },
  intake_scheduled:  { label: 'Intake Scheduled',  color: '#60A5FA', bg: 'rgba(96,165,250,.1)'  },
  intake_done:       { label: 'Ready for Session', color: '#A78BFA', bg: 'rgba(167,139,250,.1)' },
  session_scheduled: { label: 'Scheduled',         color: '#34D399', bg: 'rgba(52,211,153,.1)'  },
  completed:         { label: 'Completed',          color: '#15803D', bg: 'rgba(21,128,61,.1)'   },
  cancelled:         { label: 'Cancelled',          color: C.gray,   bg: 'rgba(255,255,255,.04)' },
};

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function Tab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 24px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        background: 'transparent', border: 'none', borderBottom: active ? `2px solid ${C.gold}` : '2px solid transparent',
        color: active ? C.gold : C.gray, fontFamily: "'Jost',sans-serif", transition: 'color .15s',
      }}
    >
      {label}
    </button>
  );
}

export default function JudgeSessionDetails() {
  const navigate = useNavigate();
  const { bookingId } = useParams();
  const token = localStorage.getItem('clearcase_token');

  const [activeTab, setActiveTab] = useState('details');
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Notes state
  const [judgeNotes, setJudgeNotes] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Case details state
  const [caseDetails, setCaseDetails] = useState(null);
  const [caseSummary, setCaseSummary] = useState('');
  const [matterRef, setMatterRef] = useState('');
  const [savingCase, setSavingCase] = useState(false);
  const [caseSaved, setCaseSaved] = useState(false);
  const [loadingCase, setLoadingCase] = useState(true);

  // Documents state (from linked matter)
  const [docs, setDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  useEffect(() => {
    if (!token) { navigate('/login'); return; }

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

    const fetchCaseDetails = async () => {
      try {
        const res = await fetch(`${API_BASE}/bench/judge/sessions/${bookingId}/case-details`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setCaseDetails(data);
        setCaseSummary(data.case_summary || '');
        setMatterRef(data.linked_matter_ref || '');
      } catch {
        setCaseDetails({});
      } finally {
        setLoadingCase(false);
      }
    };

    fetchSession();
    fetchCaseDetails();
  }, [bookingId, token, navigate]);

  // Load matter documents when Documents tab is opened and session has matter_id
  useEffect(() => {
    if (activeTab !== 'documents' || !session?.matter_id) return;
    setLoadingDocs(true);
    fetch(`${API_BASE}/matters/${session.matter_id}/documents`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => setDocs(Array.isArray(data) ? data : []))
      .catch(() => setDocs([]))
      .finally(() => setLoadingDocs(false));
  }, [activeTab, session, token]);

  const handleSaveNotes = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/bench/judge/sessions/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus, judge_notes: judgeNotes || null }),
      });
      if (!res.ok) throw new Error('Failed to save changes');
      setSession(prev => ({ ...prev, judge_notes: judgeNotes, status: newStatus }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCase = async () => {
    setSavingCase(true);
    try {
      await fetch(`${API_BASE}/bench/judge/sessions/${bookingId}/case-details`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ case_summary: caseSummary || null, linked_matter_ref: matterRef || null }),
      });
      const res = await fetch(`${API_BASE}/bench/judge/sessions/${bookingId}/case-details`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setCaseDetails(data);
      setCaseSaved(true);
      setTimeout(() => setCaseSaved(false), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingCase(false);
    }
  };

  const handleUploadDoc = async (e) => {
    const file = e.target.files[0];
    if (!file || !session?.matter_id) return;
    setUploadingDoc(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API_BASE}/matters/${session.matter_id}/documents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setDocs(prev => [data, ...prev]);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingDoc(false);
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
          <p style={{ color: '#FCA5A5', fontSize: 16 }}>{error || 'Session not found'}</p>
          <button onClick={() => navigate('/judge/dashboard')} style={{ marginTop: 16, padding: '10px 20px', background: C.gold, color: C.ink, border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const statusMeta = STATUS_META[session.status] || STATUS_META.pending;
  const service = SERVICES.find(sv => sv.id === session.service_type) || SERVICES[0];
  const possibleTransitions = STATUS_TRANSITIONS[session.status] || [];

  return (
    <div style={{ fontFamily: "'Jost',sans-serif", background: C.ink, color: C.parchment, minHeight: '100vh' }}>
      <BenchNav />

      {/* Header */}
      <div style={{ background: C.charcoal, padding: '28px 80px 0', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <button
            onClick={() => navigate('/judge/dashboard')}
            style={{ background: 'transparent', color: C.gold, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0 }}
          >
            ← Back to Dashboard
          </button>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 2, padding: '4px 10px', background: statusMeta.bg, color: statusMeta.color }}>
              {statusMeta.label}
            </span>
            {session.matter_id && (
              <Link
                to={`/matters/${session.matter_id}`}
                style={{
                  fontSize: 11, fontWeight: 700, borderRadius: 2, padding: '4px 10px',
                  background: 'rgba(196,152,42,.15)', color: C.gold,
                  border: `1px solid ${C.borderGold}`, textDecoration: 'none',
                }}
              >
                📁 {session.matter_ref || 'View Matter'}
              </Link>
            )}
          </div>
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: C.gold, marginBottom: 6 }}>Session Details</div>
        <h1 style={{ fontFamily: "'EB Garamond',serif", fontSize: 32, fontWeight: 700, marginBottom: 4 }}>Booking {session.booking_ref}</h1>
        <p style={{ color: C.grayLight, fontSize: 13, marginBottom: 16 }}>
          {session.client_name || session.guest_name || 'Guest Client'} · {service.icon} {service.name}
        </p>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: 'none', marginBottom: -1 }}>
          <Tab label="Details" active={activeTab === 'details'} onClick={() => setActiveTab('details')} />
          <Tab label="Notes" active={activeTab === 'notes'} onClick={() => setActiveTab('notes')} />
          <Tab label="Documents" active={activeTab === 'documents'} onClick={() => setActiveTab('documents')} />
        </div>
      </div>

      {error && (
        <div style={{ background: C.ink, padding: '16px 80px 0' }}>
          <div style={{ background: 'rgba(220,38,38,.1)', border: '1px solid rgba(220,38,38,.3)', borderRadius: 4, padding: 14, color: '#FCA5A5', fontSize: 13 }}>
            {error}
          </div>
        </div>
      )}

      <div style={{ background: C.ink, padding: '32px 80px 60px', minHeight: '70vh' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>

          {/* ── DETAILS TAB ── */}
          {activeTab === 'details' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Client info */}
              <div style={{ background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 6, padding: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 14 }}>📋 Client Information</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.gray, marginBottom: 5 }}>Name</div>
                    <div style={{ fontSize: 15, color: C.parchment, fontWeight: 600 }}>{session.client_name || session.guest_name || 'Guest Client'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.gray, marginBottom: 5 }}>Contact</div>
                    <div style={{ fontSize: 13, color: C.parchment }}>
                      {session.client_email || session.guest_email || '—'}<br />
                      {session.client_phone || session.guest_phone || '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Session info */}
              <div style={{ background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 6, padding: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 14 }}>⚖️ Session Information</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 18 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.gray, marginBottom: 5 }}>Service Type</div>
                    <div style={{ fontSize: 14, color: C.parchment }}>{service.icon} {service.name}</div>
                    <div style={{ fontSize: 11, color: C.gray, marginTop: 3 }}>{service.dur}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.gray, marginBottom: 5 }}>Format</div>
                    <div style={{ fontSize: 14, color: C.parchment }}>{session.session_format === 'video' ? '📹 Video Call' : '📞 Phone Call'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.gray, marginBottom: 5 }}>Preferred Date & Slot</div>
                    <div style={{ fontSize: 14, color: C.parchment }}>{fmt(session.preferred_date)} · {session.preferred_slot}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.gray, marginBottom: 5 }}>Confirmed Date & Slot</div>
                    <div style={{ fontSize: 14, color: session.confirmed_date ? C.parchment : C.gray }}>
                      {session.confirmed_date ? `${fmt(session.confirmed_date)} · ${session.confirmed_slot}` : 'Pending confirmation'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Intake notes */}
              {session.intake_notes && (
                <div style={{ background: 'rgba(196,152,42,.06)', border: `1px solid ${C.borderGold}`, borderRadius: 6, padding: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>📝 Intake Brief (from ClearCase team)</div>
                  <div style={{ fontSize: 14, color: C.grayLight, lineHeight: 1.75, whiteSpace: 'pre-wrap', fontFamily: "'EB Garamond',serif" }}>
                    {session.intake_notes}
                  </div>
                </div>
              )}

              {/* Case summary */}
              <div style={{ background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 6, padding: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#A78BFA', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 14 }}>📁 Case Details</div>

                {loadingCase ? (
                  <div style={{ color: C.gray, fontSize: 13 }}>Loading…</div>
                ) : (
                  <>
                    {caseDetails?.matter_title && (
                      <div style={{ background: 'rgba(167,139,250,.08)', border: '1px solid rgba(167,139,250,.25)', borderRadius: 3, padding: '10px 14px', marginBottom: 14 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#A78BFA', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Linked Matter</div>
                        <div style={{ fontSize: 14, color: C.parchment, fontWeight: 600 }}>{caseDetails.matter_title}</div>
                        <div style={{ fontSize: 12, color: C.gray, marginTop: 2 }}>{caseDetails.matter_number} · {caseDetails.matter_status} · {caseDetails.matter_type}</div>
                      </div>
                    )}
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.gray, marginBottom: 7 }}>Case Summary</label>
                      <textarea
                        value={caseSummary}
                        onChange={e => setCaseSummary(e.target.value)}
                        placeholder="Key facts, legal issues, prior history, and preliminary observations…"
                        rows={5}
                        style={{ width: '100%', background: C.charcoalMid, border: `1px solid ${C.border}`, borderRadius: 4, color: C.parchment, padding: '11px 13px', fontSize: 13, fontFamily: "'EB Garamond',serif", lineHeight: 1.7, boxSizing: 'border-box', resize: 'vertical' }}
                      />
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.gray, marginBottom: 7 }}>Link to ClearCase Matter (optional)</label>
                      <input
                        type="text"
                        value={matterRef}
                        onChange={e => setMatterRef(e.target.value)}
                        placeholder="e.g. CC-2024-001"
                        style={{ width: '100%', background: C.charcoalMid, border: `1px solid ${C.border}`, borderRadius: 4, color: C.parchment, padding: '10px 13px', fontSize: 13, fontFamily: "'Jost',sans-serif", boxSizing: 'border-box' }}
                      />
                    </div>
                    <button
                      onClick={handleSaveCase}
                      disabled={savingCase}
                      style={{ padding: '9px 22px', background: caseSaved ? '#15803D' : '#A78BFA', color: '#fff', border: 'none', borderRadius: 3, fontSize: 13, fontWeight: 700, cursor: savingCase ? 'not-allowed' : 'pointer', opacity: savingCase ? 0.7 : 1, fontFamily: "'Jost',sans-serif", transition: 'background .2s' }}
                    >
                      {caseSaved ? 'Saved ✓' : savingCase ? 'Saving…' : 'Save Case Details'}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── NOTES TAB ── */}
          {activeTab === 'notes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {session.intake_notes && (
                <div style={{ background: 'rgba(196,152,42,.06)', border: `1px solid ${C.borderGold}`, borderRadius: 6, padding: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>📋 Intake Brief</div>
                  <div style={{ fontSize: 14, color: C.grayLight, lineHeight: 1.75, fontFamily: "'EB Garamond',serif", whiteSpace: 'pre-wrap' }}>{session.intake_notes}</div>
                </div>
              )}

              <div style={{ background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 6, padding: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>🔍 Your Judicial Notes</div>
                <p style={{ fontSize: 12, color: C.gray, marginBottom: 12 }}>These notes are shared with the client after the session is marked Completed.</p>
                <textarea
                  value={judgeNotes}
                  onChange={e => setJudgeNotes(e.target.value)}
                  placeholder="Add your observations, assessment, recommendations, and guidance…"
                  rows={8}
                  style={{ width: '100%', background: C.charcoalMid, border: `1px solid ${C.border}`, borderRadius: 4, color: C.parchment, padding: '13px 15px', fontSize: 13, fontFamily: "'EB Garamond',serif", lineHeight: 1.75, boxSizing: 'border-box', resize: 'vertical' }}
                />

                {possibleTransitions.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 7 }}>Update Status</label>
                    <select
                      value={newStatus}
                      onChange={e => setNewStatus(e.target.value)}
                      style={{ background: C.charcoalMid, border: `1px solid ${C.border}`, borderRadius: 4, color: C.parchment, padding: '9px 12px', fontSize: 13, fontFamily: "'Jost',sans-serif", minWidth: 220 }}
                    >
                      <option value={session.status}>{STATUS_META[session.status]?.label}</option>
                      {possibleTransitions.map(tr => (
                        <option key={tr} value={tr}>{STATUS_META[tr]?.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                  <button
                    onClick={handleSaveNotes}
                    disabled={saving}
                    style={{ padding: '10px 24px', background: saved ? '#15803D' : C.gold, color: C.ink, border: 'none', borderRadius: 3, fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, fontFamily: "'Jost',sans-serif", transition: 'background .2s' }}
                  >
                    {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save Notes & Status →'}
                  </button>
                  <button
                    onClick={() => navigate('/judge/dashboard')}
                    style={{ padding: '10px 20px', background: 'transparent', color: C.gold, border: `1px solid ${C.borderGold}`, borderRadius: 3, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Jost',sans-serif" }}
                  >
                    Back to Dashboard
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── DOCUMENTS TAB ── */}
          {activeTab === 'documents' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {!session.matter_id ? (
                <div style={{ background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 6, padding: 40, textAlign: 'center' }}>
                  <div style={{ fontSize: 36, marginBottom: 14 }}>📂</div>
                  <p style={{ color: C.gray, fontSize: 14 }}>No matter record is linked to this session yet.</p>
                  <p style={{ color: C.gray, fontSize: 12, marginTop: 6 }}>Documents will appear here once the client's matter record is created.</p>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 13, color: C.gray }}>
                      Documents for matter <span style={{ color: C.gold, fontWeight: 700 }}>{session.matter_ref}</span>
                    </div>
                    <label style={{ padding: '9px 18px', background: C.gold, color: C.ink, borderRadius: 3, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Jost',sans-serif" }}>
                      {uploadingDoc ? 'Uploading…' : '+ Upload Document'}
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png,.docx" style={{ display: 'none' }} onChange={handleUploadDoc} disabled={uploadingDoc} />
                    </label>
                  </div>

                  {loadingDocs ? (
                    <div style={{ color: C.gray, fontSize: 13, padding: 20 }}>Loading documents…</div>
                  ) : docs.length === 0 ? (
                    <div style={{ background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 6, padding: 40, textAlign: 'center' }}>
                      <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
                      <p style={{ color: C.gray, fontSize: 14 }}>No documents uploaded yet.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {docs.map(doc => (
                        <div key={doc.doc_id || doc.document_id} style={{ background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 4, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ fontSize: 13, color: C.parchment, fontWeight: 600 }}>{doc.filename}</div>
                            <div style={{ fontSize: 11, color: C.gray, marginTop: 3 }}>
                              {doc.size_bytes ? `${Math.round(doc.size_bytes / 1024)} KB · ` : ''}
                              {doc.created_at ? new Date(doc.created_at).toLocaleDateString('en-IN') : ''}
                            </div>
                          </div>
                          <a
                            href={doc.blob_url || doc.stored_path}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ padding: '7px 14px', background: 'transparent', color: C.gold, border: `1px solid ${C.borderGold}`, borderRadius: 3, fontSize: 12, fontWeight: 600, textDecoration: 'none', fontFamily: "'Jost',sans-serif" }}
                          >
                            Download
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
