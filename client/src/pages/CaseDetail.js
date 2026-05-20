import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

const STATUS_BADGE = {
  intake: 'badge-draft', active: 'badge-active', hearing_pending: 'badge-pending',
  awaiting_docs: 'badge-pending', judgment: 'badge-sent', closed: 'badge-closed',
};
const STATUS_LABEL = {
  intake: 'Intake', active: 'Active', hearing_pending: 'Hearing Pending',
  awaiting_docs: 'Awaiting Docs', judgment: 'Judgment', closed: 'Closed',
};
const VALID_STATUSES = ['intake', 'active', 'hearing_pending', 'awaiting_docs', 'judgment', 'closed'];
const URGENCY_COLORS = { critical: '#EF4444', urgent: '#F59E0B', standard: '#64748B' };

const CAN_EDIT_ROLES = ['managing_partner', 'advisor', 'senior_advocate', 'junior_advocate'];

export default function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [matter, setMatter] = useState(null);
  const [tab, setTab] = useState('details');
  const [timeline, setTimeline] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);

  // Add hearing state
  const [showAddHearing, setShowAddHearing] = useState(false);
  const [hearingForm, setHearingForm] = useState({ hearing_date: '', hearing_time: '', court_name: '', purpose: '', outcome: '' });
  const [addingHearing, setAddingHearing] = useState(false);

  // Edit hearing state
  const [editingHearingId, setEditingHearingId] = useState(null);
  const [editHearingForm, setEditHearingForm] = useState({});
  const [savingHearing, setSavingHearing] = useState(false);

  // Document upload state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState(null);

  const canEdit = CAN_EDIT_ROLES.includes(user?.role);

  const loadAll = useCallback(() => {
    return Promise.all([
      api.getMatter(id),
      api.getMatterTimeline(id),
      api.getMatterDocuments(id).catch(() => []),
      api.getMatterMessages(id).catch(() => []),
      api.getInvoices().catch(() => []),
    ]).then(([m, t, d, msg, inv]) => {
      setMatter(m);
      setEditForm({
        title: m.title || '',
        description: m.description || '',
        court_name: m.court_name || '',
        opposing_party: m.opposing_party || '',
        urgency: m.urgency || 'standard',
        status: m.status || 'intake',
      });
      setTimeline(t);
      setDocuments(d);
      setMessages(msg);
      setInvoices(inv.filter(i => i.matter_id === id));
    });
  }, [id]);

  useEffect(() => {
    loadAll().catch(console.error).finally(() => setLoading(false));
  }, [loadAll]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      await api.sendMessage({ matter_id: id, content: newMessage });
      setNewMessage('');
      const msgs = await api.getMatterMessages(id);
      setMessages(msgs);
    } catch (err) { console.error(err); }
  };

  const saveEdit = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      await api.updateMatter(id, editForm);
      await loadAll();
      setEditing(false);
      setSaveMsg({ type: 'success', text: 'Case updated successfully.' });
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (err) {
      setSaveMsg({ type: 'error', text: err.message || 'Update failed.' });
    } finally {
      setSaving(false);
    }
  };

  const saveHearing = async () => {
    if (!hearingForm.hearing_date || !hearingForm.court_name) return;
    setAddingHearing(true);
    try {
      await api.createHearing({ ...hearingForm, matter_id: id });
      const t = await api.getMatterTimeline(id);
      setTimeline(t);
      setShowAddHearing(false);
      setHearingForm({ hearing_date: '', hearing_time: '', court_name: '', purpose: '', outcome: '' });
    } catch (err) {
      alert(err.message || 'Failed to add hearing');
    } finally {
      setAddingHearing(false);
    }
  };

  const startEditHearing = (h) => {
    setEditingHearingId(h.hearing_id);
    setEditHearingForm({
      hearing_date: h.hearing_date || '',
      hearing_time: h.hearing_time || '',
      court_name: h.court_name || '',
      purpose: h.purpose || '',
      outcome: h.outcome || '',
      next_date: h.next_date || '',
    });
  };

  const saveHearingEdit = async () => {
    setSavingHearing(true);
    try {
      await api.updateHearing(editingHearingId, editHearingForm);
      const t = await api.getMatterTimeline(id);
      setTimeline(t);
      setEditingHearingId(null);
    } catch (err) {
      alert(err.message || 'Failed to update hearing');
    } finally {
      setSavingHearing(false);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      await api.uploadDocument(id, file);
      const docs = await api.getMatterDocuments(id);
      setDocuments(docs);
    } catch (err) {
      setUploadError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('Delete this document? This cannot be undone.')) return;
    setDeletingDocId(docId);
    try {
      await api.deleteDocument(docId);
      setDocuments(prev => prev.filter(d => d.document_id !== docId));
    } catch (err) {
      alert(err.message || 'Failed to delete document');
    } finally {
      setDeletingDocId(null);
    }
  };

  if (loading) return <div className="loading">Loading case details...</div>;
  if (!matter) return <div className="loading">Case not found</div>;

  const leadAdvocate = matter.advocates?.find(a => a.role_on_matter === 'lead_senior') || matter.advocates?.[0];

  const TABS = [
    { key: 'details', label: '📋 Details' },
    { key: 'timeline', label: `⚖️ Hearings (${timeline.length})` },
    { key: 'documents', label: `📄 Documents (${documents.length})` },
    { key: 'messages', label: '💬 Messages' },
    { key: 'billing', label: `💰 Billing (${invoices.length})` },
  ];

  return (
    <div className="case-detail page-with-nav">
      <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>

      {/* ── Case Header ─────────────────────────────────────────────────────── */}
      <div className="case-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0 }}>MATTER #{matter.matter_number}</h1>
          <span className={`badge ${STATUS_BADGE[matter.status] || 'badge-draft'}`} style={{ fontSize: 13 }}>
            {STATUS_LABEL[matter.status] || matter.status}
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: URGENCY_COLORS[matter.urgency] || '#64748B', background: '#F1F5F9', padding: '3px 10px', borderRadius: 20 }}>
            {matter.urgency?.toUpperCase()}
          </span>
        </div>
        <div className="case-info" style={{ fontSize: 18, fontWeight: 700, color: '#0A1628', marginTop: 6 }}>{matter.title}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: 8 }}>
          {matter.court_name && <div className="case-info">📍 {matter.court_name}</div>}
          {matter.matter_type && <div className="case-info">⚖️ {matter.matter_type.charAt(0).toUpperCase() + matter.matter_type.slice(1)}</div>}
          <div className="case-info">📅 Filed: {new Date(matter.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
          {leadAdvocate && <div className="case-info">👤 {leadAdvocate.full_name}</div>}
        </div>
      </div>

      {/* Save message */}
      {saveMsg && (
        <div style={{ margin: '12px 0', padding: '10px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600, background: saveMsg.type === 'success' ? '#DCFCE7' : '#FEF2F2', color: saveMsg.type === 'success' ? '#166534' : '#B91C1C' }}>
          {saveMsg.type === 'success' ? '✅' : '❌'} {saveMsg.text}
        </div>
      )}

      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      <div className="tabs">
        {TABS.map(t => (
          <div key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </div>
        ))}
      </div>

      {/* ── DETAILS TAB ──────────────────────────────────────────────────────── */}
      {tab === 'details' && (
        <div>
          {/* Advocate edit toolbar */}
          {canEdit && !editing && (
            <button
              className="btn btn-navy btn-sm"
              onClick={() => setEditing(true)}
              style={{ marginBottom: 16 }}
            >
              ✏️ Edit Case Details
            </button>
          )}

          {canEdit && editing ? (
            /* ── Edit Form ── */
            <div className="card" style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#0A1628', marginBottom: 16 }}>Edit Case Details</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Case Title</label>
                  <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                    {VALID_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Urgency</label>
                  <select value={editForm.urgency} onChange={e => setEditForm(f => ({ ...f, urgency: e.target.value }))}>
                    <option value="standard">Standard</option>
                    <option value="urgent">Urgent</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Court Name</label>
                  <input value={editForm.court_name} onChange={e => setEditForm(f => ({ ...f, court_name: e.target.value }))} placeholder="e.g. District Court, Mumbai" />
                </div>
                <div className="form-group">
                  <label>Opposing Party</label>
                  <input value={editForm.opposing_party} onChange={e => setEditForm(f => ({ ...f, opposing_party: e.target.value }))} placeholder="Name of opposing party" />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Case Description / Notes</label>
                  <textarea rows={4} value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} placeholder="Detailed case notes, background, strategy..." style={{ resize: 'vertical' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button className="btn btn-navy btn-sm" onClick={saveEdit} disabled={saving}>
                  {saving ? 'Saving…' : '✅ Save Changes'}
                </button>
                <button className="btn btn-outline btn-sm" onClick={() => setEditing(false)} disabled={saving}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* ── Read-Only View ── */
            <div>
              {/* Core info grid */}
              <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
                  <InfoRow label="Matter Number" value={`#${matter.matter_number}`} />
                  <InfoRow label="Matter Type" value={matter.matter_type ? matter.matter_type.charAt(0).toUpperCase() + matter.matter_type.slice(1) : '—'} />
                  <InfoRow label="Status" value={
                    <span className={`badge ${STATUS_BADGE[matter.status] || 'badge-draft'}`}>{STATUS_LABEL[matter.status] || matter.status}</span>
                  } />
                  <InfoRow label="Urgency" value={
                    <span style={{ fontWeight: 700, color: URGENCY_COLORS[matter.urgency] }}>{matter.urgency?.charAt(0).toUpperCase() + matter.urgency?.slice(1)}</span>
                  } />
                  <InfoRow label="Court" value={matter.court_name || '—'} />
                  <InfoRow label="Opposing Party" value={matter.opposing_party || '—'} />
                  <InfoRow label="Filed On" value={new Date(matter.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} />
                  {matter.closed_at && <InfoRow label="Closed On" value={new Date(matter.closed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} />}
                </div>
              </div>

              {/* Description */}
              {matter.description ? (
                <div className="card" style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Case Notes & Background</div>
                  <div style={{ fontSize: 14, color: '#334155', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{matter.description}</div>
                </div>
              ) : canEdit ? (
                <div className="card" style={{ marginBottom: 16, textAlign: 'center', padding: '20px', color: '#94A3B8', fontSize: 14 }}>
                  No case notes yet. Click "Edit Case Details" to add notes.
                </div>
              ) : null}

              {/* Assigned Advocates */}
              {matter.advocates?.length > 0 && (
                <div className="card" style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Assigned Legal Team</div>
                  {matter.advocates.map(a => (
                    <div key={a.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: '#0A1628' }}>👤 {a.full_name}</div>
                        <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{a.role_on_matter?.replace('_', ' ')}</div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: 12, color: '#64748B' }}>
                        {a.email && <div>{a.email}</div>}
                        {a.phone && <div>{a.phone}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TIMELINE TAB ──────────────────────────────────────────────────────── */}
      {tab === 'timeline' && (
        <div>
          {canEdit && (
            <div style={{ marginBottom: 16 }}>
              <button className="btn btn-navy btn-sm" onClick={() => setShowAddHearing(v => !v)}>
                {showAddHearing ? 'Cancel' : '+ Add Hearing'}
              </button>
            </div>
          )}

          {showAddHearing && (
            <div className="card" style={{ marginBottom: 20, background: '#F8FAFC' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0A1628', marginBottom: 12 }}>Schedule New Hearing</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>Date *</label>
                  <input type="date" value={hearingForm.hearing_date} onChange={e => setHearingForm(f => ({ ...f, hearing_date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Time</label>
                  <input type="time" value={hearingForm.hearing_time} onChange={e => setHearingForm(f => ({ ...f, hearing_time: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Court Name *</label>
                  <input placeholder="e.g. District Court, Mumbai" value={hearingForm.court_name} onChange={e => setHearingForm(f => ({ ...f, court_name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Purpose</label>
                  <input placeholder="e.g. Arguments, Evidence, Judgment" value={hearingForm.purpose} onChange={e => setHearingForm(f => ({ ...f, purpose: e.target.value }))} />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Outcome (if already concluded)</label>
                  <input placeholder="Leave blank for upcoming hearings" value={hearingForm.outcome} onChange={e => setHearingForm(f => ({ ...f, outcome: e.target.value }))} />
                </div>
              </div>
              <button className="btn btn-navy btn-sm" onClick={saveHearing} disabled={addingHearing || !hearingForm.hearing_date || !hearingForm.court_name}>
                {addingHearing ? 'Adding…' : 'Add Hearing'}
              </button>
            </div>
          )}

          <div className="timeline">
            {timeline.map((h, i) => {
              const isPast = new Date(String(h.hearing_date).split('T')[0] + 'T00:00:00') < new Date();
              const isNext = !isPast && (i === 0 || new Date(String(timeline[i - 1]?.hearing_date).split('T')[0] + 'T00:00:00') < new Date());
              const isEditing = editingHearingId === h.hearing_id;

              if (isEditing) {
                return (
                  <div key={h.hearing_id} className="card" style={{ marginBottom: 16, background: '#F8FAFC' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#0A1628', marginBottom: 12 }}>Edit Hearing</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div className="form-group">
                        <label>Date *</label>
                        <input type="date" value={editHearingForm.hearing_date} onChange={e => setEditHearingForm(f => ({ ...f, hearing_date: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label>Time</label>
                        <input type="time" value={editHearingForm.hearing_time} onChange={e => setEditHearingForm(f => ({ ...f, hearing_time: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label>Court Name *</label>
                        <input value={editHearingForm.court_name} onChange={e => setEditHearingForm(f => ({ ...f, court_name: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label>Purpose</label>
                        <input value={editHearingForm.purpose} onChange={e => setEditHearingForm(f => ({ ...f, purpose: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label>Outcome</label>
                        <input value={editHearingForm.outcome} onChange={e => setEditHearingForm(f => ({ ...f, outcome: e.target.value }))} placeholder="Leave blank if pending" />
                      </div>
                      <div className="form-group">
                        <label>Next Date</label>
                        <input type="date" value={editHearingForm.next_date} onChange={e => setEditHearingForm(f => ({ ...f, next_date: e.target.value }))} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                      <button className="btn btn-navy btn-sm" onClick={saveHearingEdit} disabled={savingHearing || !editHearingForm.hearing_date || !editHearingForm.court_name}>
                        {savingHearing ? 'Saving…' : '✅ Save'}
                      </button>
                      <button className="btn btn-outline btn-sm" onClick={() => setEditingHearingId(null)} disabled={savingHearing}>Cancel</button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={h.hearing_id} className={`timeline-item ${isPast ? 'completed' : isNext ? 'upcoming' : ''}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div className="tl-date">
                        {isPast ? '✅' : isNext ? '🔵' : '○'}{' '}
                        {new Date(String(h.hearing_date).split('T')[0] + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        {h.hearing_time && ` · ${h.hearing_time}`}
                      </div>
                      <div className="tl-event">{h.purpose || 'Hearing'} — {h.court_name}</div>
                      {h.outcome && <div className="tl-outcome" style={{ marginTop: 4, fontSize: 13, color: '#334155', fontStyle: 'italic' }}>Outcome: {h.outcome}</div>}
                      {h.next_date && <div style={{ marginTop: 4, fontSize: 12, color: '#64748B' }}>Next: {new Date(String(h.next_date).split('T')[0] + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>}
                    </div>
                    {canEdit && (
                      <button className="btn btn-outline btn-sm" style={{ fontSize: 11, padding: '4px 10px', marginLeft: 8, flexShrink: 0 }} onClick={() => startEditHearing(h)}>
                        ✏️ Edit
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {timeline.length === 0 && <p style={{ color: '#94A3B8', textAlign: 'center', padding: 20 }}>No hearings scheduled yet.</p>}

          {leadAdvocate && user?.role === 'client' && (
            <div className="card" style={{ marginTop: 24 }}>
              <h3 style={{ marginBottom: 8 }}>Your Advocate</h3>
              <p style={{ fontWeight: 600 }}>👤 {leadAdvocate.full_name}</p>
              {leadAdvocate.phone && <p style={{ fontSize: 13, color: '#64748B' }}>📞 {leadAdvocate.phone}</p>}
              {leadAdvocate.email && <p style={{ fontSize: 13, color: '#64748B' }}>✉️ {leadAdvocate.email}</p>}
              <button className="btn btn-gold btn-sm" style={{ marginTop: 12 }} onClick={() => setTab('messages')}>
                💬 Message Now
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── DOCUMENTS TAB ─────────────────────────────────────────────────────── */}
      {tab === 'documents' && (
        <div>
          {/* Upload zone — advocates and managing partners only */}
          {canEdit && (
            <div
              style={{
                border: `2px dashed ${isDragging ? '#C9A84C' : '#CBD5E1'}`,
                borderRadius: 12,
                padding: '28px 20px',
                textAlign: 'center',
                background: isDragging ? '#FFFBEB' : uploading ? '#F8FAFC' : '#FAFAFA',
                cursor: uploading ? 'default' : 'pointer',
                marginBottom: 16,
                transition: 'border-color 0.2s, background 0.2s',
              }}
              onDragOver={e => { e.preventDefault(); if (!uploading) setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={e => {
                e.preventDefault();
                setIsDragging(false);
                if (!uploading && e.dataTransfer.files[0]) handleFileUpload(e.dataTransfer.files[0]);
              }}
              onClick={() => { if (!uploading) document.getElementById('doc-file-input').click(); }}
            >
              <input
                id="doc-file-input"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.docx"
                style={{ display: 'none' }}
                onChange={e => { if (e.target.files[0]) handleFileUpload(e.target.files[0]); e.target.value = ''; }}
              />
              {uploading ? (
                <>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1B2559' }}>Uploading document…</div>
                  <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>Please wait, do not close this page</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 30, marginBottom: 8 }}>☁️</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1B2559' }}>Upload Document</div>
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>Click or drag & drop a file here</div>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 10, flexWrap: 'wrap' }}>
                    {['PDF', 'DOCX', 'JPG', 'PNG'].map(t => (
                      <span key={t} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: '#E2E8F0', color: '#475569', fontWeight: 600 }}>{t}</span>
                    ))}
                    <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: '#E2E8F0', color: '#475569', fontWeight: 600 }}>Max 20 MB</span>
                  </div>
                </>
              )}
            </div>
          )}

          {uploadError && (
            <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#DC2626', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>⚠️ {uploadError}</span>
              <button onClick={() => setUploadError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', fontSize: 18, lineHeight: 1, padding: '0 4px' }}>×</button>
            </div>
          )}

          <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 5 }}>
            🔒 Stored securely on Vercel Blob · {documents.length} file{documents.length !== 1 ? 's' : ''}
          </div>

          {documents.map(d => {
            const ext = (d.file_type || d.filename?.split('.').pop() || '').toLowerCase();
            const isPdf = ext === 'pdf';
            const isDoc = ['doc', 'docx'].includes(ext);
            const isImg = ['jpg', 'jpeg', 'png'].includes(ext);
            const icon = isPdf ? '📕' : isDoc ? '📘' : isImg ? '🖼️' : '📄';
            const accentColor = isPdf ? '#EF4444' : isDoc ? '#3B82F6' : isImg ? '#10B981' : '#64748B';
            const bytes = d.file_size_bytes || 0;
            const sizeLabel = bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

            return (
              <div key={d.document_id} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderLeft: `4px solid ${accentColor}`, borderRadius: 10, padding: '14px 16px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ fontSize: 26, flexShrink: 0 }}>{icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#1B2559', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {d.filename}
                  </div>
                  <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 3 }}>
                    {sizeLabel} · Uploaded by {d.uploader_name} · {new Date(d.uploaded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <a
                    href={d.stored_path}
                    target="_blank"
                    rel="noreferrer"
                    style={{ padding: '6px 14px', background: '#1B2559', color: '#FFF', borderRadius: 7, fontSize: 12, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}
                  >
                    View ↗
                  </a>
                  {(user?.role === 'managing_partner' || user?.role === 'advisor' || user?.user_id === d.uploaded_by) && (
                    <button
                      onClick={() => handleDeleteDocument(d.document_id)}
                      disabled={deletingDocId === d.document_id}
                      style={{ padding: '6px 12px', background: deletingDocId === d.document_id ? '#E2E8F0' : '#FEE2E2', color: deletingDocId === d.document_id ? '#94A3B8' : '#DC2626', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                      {deletingDocId === d.document_id ? '…' : 'Delete'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {documents.length === 0 && (
            <div style={{ textAlign: 'center', padding: '36px 20px', background: '#F8FAFC', borderRadius: 12, border: '1px dashed #E2E8F0' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>📂</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#475569', marginBottom: 4 }}>No documents yet</div>
              <div style={{ fontSize: 12, color: '#94A3B8' }}>
                {canEdit ? 'Upload the first document using the zone above' : 'Your advocate will upload relevant case documents here'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MESSAGES TAB ──────────────────────────────────────────────────────── */}
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
            <input
              placeholder="Type a message…"
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
            />
            <button onClick={sendMessage}>➤</button>
          </div>
        </div>
      )}

      {/* ── BILLING TAB ───────────────────────────────────────────────────────── */}
      {tab === 'billing' && (
        <div>
          {invoices.map(inv => (
            <div key={inv.invoice_id} className="card" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{inv.invoice_number}</strong>
                  <div style={{ fontSize: 13, color: '#64748B' }}>Due: {new Date(String(inv.due_date).split('T')[0] + 'T00:00:00').toLocaleDateString('en-IN')}</div>
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

function InfoRow({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, color: '#1B2559', fontWeight: 500 }}>{value || '—'}</div>
    </div>
  );
}
