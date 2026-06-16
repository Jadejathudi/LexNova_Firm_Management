import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';

const NAVY = '#1B2559', GOLD = '#C9A84C', BG = '#F4F6FB';

const TYPE_META = {
  corporate:   { label: 'Corporate Law',  color: '#0E7490' },
  tax:         { label: 'Income Tax',      color: '#7C3AED' },
  immigration: { label: 'Immigration',    color: '#0369A1' },
  criminal:    { label: 'Criminal',        color: '#DC2626' },
  civil:       { label: 'Civil',           color: '#16A34A' },
  family:      { label: 'Family',          color: '#D97706' },
  real_estate: { label: 'Real Estate',    color: '#78716C' },
  bench:       { label: 'Bench Session',  color: '#1B2559' },
};

const INELIGIBLE = ['tax', 'immigration', 'bench'];
const CAN_EDIT = ['managing_partner', 'advisor', 'senior_advocate', 'junior_advocate', 'judge'];

export default function MatterDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const chatEndRef = useRef(null);

  const [matter, setMatter] = useState(null);
  const [tab, setTab] = useState('details');
  const [notes, setNotes] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  // Notes state
  const [noteContent, setNoteContent] = useState('');
  const [notePrivate, setNotePrivate] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editNoteContent, setEditNoteContent] = useState('');

  // Document state
  const [uploading, setUploading] = useState(false);

  // Chat state
  const [chatMsg, setChatMsg] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // Convert to case state
  const [showConvert, setShowConvert] = useState(false);
  const [convertForm, setConvertForm] = useState({ court_name: '', opposing_party: '', urgency: 'standard' });
  const [converting, setConverting] = useState(false);

  // Advocate team management state
  const [availableAdvocates, setAvailableAdvocates] = useState([]);
  const [selectedAdvocateToAdd, setSelectedAdvocateToAdd] = useState('');
  const [addingAdvocate, setAddingAdvocate] = useState(false);
  const [removingAdvocateId, setRemovingAdvocateId] = useState(null);

  const canEdit = CAN_EDIT.includes(user?.role) && (user?.role !== 'judge' || matter?.matter_type === 'bench');
  const isAdvocate = ['managing_partner', 'advisor', 'senior_advocate', 'junior_advocate'].includes(user?.role);
  const canManageTeam = ['managing_partner', 'advisor'].includes(user?.role);

  const loadMatter = useCallback(async () => {
    const m = await api.getMatter(id);
    setMatter(m);
    return m;
  }, [id]);

  const loadTab = useCallback(async (t) => {
    if (t === 'notes') {
      const n = await api.getMatterNotes(id).catch(() => []);
      setNotes(n);
    } else if (t === 'documents') {
      const d = await api.getMatterDocumentsList(id).catch(() => []);
      setDocuments(d);
    } else if (t === 'chat') {
      const msgs = await api.getMatterChat(id).catch(() => []);
      setMessages(msgs);
      setMatter(m => m ? { ...m, unread_count: 0 } : m);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [id]);

  useEffect(() => {
    loadMatter().catch(console.error).finally(() => setLoading(false));
  }, [loadMatter]);

  useEffect(() => {
    loadTab(tab).catch(console.error);
  }, [tab, loadTab]);

  useEffect(() => {
    if (canManageTeam) {
      api.getInternalAdvocates().then(setAvailableAdvocates).catch(() => {});
    }
  }, [canManageTeam]);

  const addAdvocate = async () => {
    if (!selectedAdvocateToAdd) return;
    setAddingAdvocate(true);
    try {
      await api.addMatterAdvocate(id, selectedAdvocateToAdd);
      setSelectedAdvocateToAdd('');
      await loadMatter();
    } catch (err) {
      alert(err.message || 'Failed to add advocate');
    } finally {
      setAddingAdvocate(false);
    }
  };

  const removeAdvocate = async (advocateId) => {
    if (!window.confirm("Remove this advocate's access to the matter?")) return;
    setRemovingAdvocateId(advocateId);
    try {
      await api.removeMatterAdvocate(id, advocateId);
      await loadMatter();
    } catch (err) {
      alert(err.message || 'Failed to remove advocate');
    } finally {
      setRemovingAdvocateId(null);
    }
  };

  const addNote = async () => {
    if (!noteContent.trim()) return;
    setSavingNote(true);
    try {
      await api.addMatterNote(id, { content: noteContent.trim(), is_private: notePrivate });
      setNoteContent('');
      setNotePrivate(false);
      await loadTab('notes');
    } catch (err) { alert(err.message); }
    finally { setSavingNote(false); }
  };

  const saveEditNote = async (noteId) => {
    if (!editNoteContent.trim()) return;
    try {
      await api.updateMatterNote(id, noteId, { content: editNoteContent.trim() });
      setEditingNoteId(null);
      await loadTab('notes');
    } catch (err) { alert(err.message); }
  };

  const deleteNote = async (noteId) => {
    if (!window.confirm('Delete this note?')) return;
    try {
      await api.deleteMatterNote(id, noteId);
      await loadTab('notes');
    } catch (err) { alert(err.message); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const input = e.target;
    setUploading(true);
    try {
      await api.uploadMatterDocument(id, file);
      await loadTab('documents');
    } catch (err) { alert(err.message); }
    finally { setUploading(false); input.value = ''; }
  };

  const deleteDocument = async (docId) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await api.deleteMatterDocument(id, docId);
      await loadTab('documents');
    } catch (err) { alert(err.message); }
  };

  const sendMessage = async () => {
    if (!chatMsg.trim()) return;
    setSendingMsg(true);
    try {
      await api.sendMatterMessage(id, { content: chatMsg.trim() });
      setChatMsg('');
      await loadTab('chat');
    } catch (err) { alert(err.message); }
    finally { setSendingMsg(false); }
  };

  const convertToCase = async (e) => {
    e.preventDefault();
    setConverting(true);
    try {
      const result = await api.convertMatterToCase(id, convertForm);
      await loadMatter();
      setShowConvert(false);
      alert(`Case created: ${result.matter_number}`);
    } catch (err) { alert(err.message); }
    finally { setConverting(false); }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading matter…</div>;
  if (!matter) return <div style={{ padding: 40, textAlign: 'center', color: '#EF4444' }}>Matter not found.</div>;

  const typeMeta = TYPE_META[matter.matter_type] || { label: matter.matter_type, color: '#64748B' };
  const canConvert = isAdvocate && !INELIGIBLE.includes(matter.matter_type) && !matter.case_id;

  const TABS = [
    { key: 'details',   label: '📋 Details' },
    { key: 'documents', label: '📄 Documents' },
    { key: 'notes',     label: '📝 Notes' },
    { key: 'chat',      label: matter.unread_count > 0 ? `💬 Chat (${matter.unread_count})` : '💬 Chat' },
  ];

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 20px' }}>
      <button onClick={() => navigate(-1)}
        style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: 14, marginBottom: 16, padding: 0 }}>
        ← Back to Matters
      </button>

      {/* Header */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
              <h2 style={{ margin: 0, color: NAVY, fontSize: 20 }}>{matter.title}</h2>
              <span style={{ background: typeMeta.color + '18', color: typeMeta.color, padding: '3px 10px',
                borderRadius: 10, fontSize: 12, fontWeight: 700 }}>{typeMeta.label}</span>
              <span style={{ background: '#F4F6FB', color: '#64748B', padding: '3px 10px',
                borderRadius: 10, fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>
                {matter.status?.replace('_', ' ')}
              </span>
              {matter.case_id && (
                <span style={{ background: '#FEF3C7', color: '#D97706', padding: '3px 10px',
                  borderRadius: 10, fontSize: 12, fontWeight: 600 }}>↗ Filed as Case</span>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#64748B', fontFamily: 'monospace' }}>{matter.matter_ref}</div>
          </div>
          {canConvert && (
            <button onClick={() => setShowConvert(true)}
              style={{ padding: '8px 16px', borderRadius: 8, background: GOLD, color: NAVY,
                border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              ↗ Convert to Case
            </button>
          )}
        </div>
      </div>

      {/* Convert to Case Modal */}
      {showConvert && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: 420, maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 16px', color: NAVY }}>Convert to Case</h3>
            <form onSubmit={convertToCase}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 13, color: '#64748B', display: 'block', marginBottom: 4 }}>Court Name</label>
                <input value={convertForm.court_name} onChange={e => setConvertForm(f => ({ ...f, court_name: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 13, color: '#64748B', display: 'block', marginBottom: 4 }}>Opposing Party</label>
                <input value={convertForm.opposing_party} onChange={e => setConvertForm(f => ({ ...f, opposing_party: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 13, color: '#64748B', display: 'block', marginBottom: 4 }}>Urgency</label>
                <select value={convertForm.urgency} onChange={e => setConvertForm(f => ({ ...f, urgency: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14 }}>
                  <option value="standard">Standard</option>
                  <option value="urgent">Urgent</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowConvert(false)}
                  style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer', fontSize: 13 }}>
                  Cancel
                </button>
                <button type="submit" disabled={converting}
                  style={{ padding: '8px 16px', borderRadius: 8, background: NAVY, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                  {converting ? 'Converting…' : 'Create Case'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#fff', borderRadius: 10, padding: 4, border: '1px solid #E2E8F0' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === t.key ? 700 : 500,
              background: tab === t.key ? NAVY : 'transparent', color: tab === t.key ? '#fff' : '#64748B' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Details Tab ── */}
      {tab === 'details' && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: 24, minHeight: 340 }}>
          {matter.brief && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Brief</div>
              <p style={{ margin: 0, color: '#334155', lineHeight: 1.6 }}>{matter.brief}</p>
            </div>
          )}

          {matter.vertical_data && Object.keys(matter.vertical_data).length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Matter Details</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                {Object.entries(matter.vertical_data).map(([k, v]) => (
                  <div key={k} style={{ background: BG, borderRadius: 8, padding: '10px 14px' }}>
                    <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>
                      {k.replace(/_/g, ' ')}
                    </div>
                    <div style={{ fontSize: 14, color: '#334155', fontWeight: 500 }}>{String(v)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            {[
              ['Client', matter.client_name],
              ['Type', typeMeta.label],
              ['Status', matter.status?.replace('_', ' ')],
              ['Created', new Date(matter.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })],
              ...(matter.bench_booking_id ? [['Bench Booking', 'Session linked']] : []),
              ...(matter.consultation_id ? [['Consultation', 'Linked']] : []),
              ...(matter.case_id ? [['Filed Case', matter.case_id.slice(0, 8) + '…']] : []),
            ].filter(([, v]) => v).map(([label, value]) => (
              <div key={label} style={{ background: BG, borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 14, color: '#334155', fontWeight: 500 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Assigned Legal Team */}
          <div>
            <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assigned Legal Team</div>
            {matter.advocates?.length > 0 ? matter.advocates.map(a => (
              <div key={a.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: BG, borderRadius: 8, padding: '10px 14px', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: NAVY }}>{a.full_name}</div>
                  <div style={{ fontSize: 12, color: '#64748B', textTransform: 'capitalize' }}>{a.role?.replace('_', ' ')}</div>
                </div>
                {canManageTeam && (
                  <button onClick={() => removeAdvocate(a.user_id)} disabled={removingAdvocateId === a.user_id}
                    style={{ padding: '6px 12px', background: removingAdvocateId === a.user_id ? '#E2E8F0' : '#FEE2E2', color: removingAdvocateId === a.user_id ? '#94A3B8' : '#DC2626', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: removingAdvocateId === a.user_id ? 'not-allowed' : 'pointer' }}>
                    {removingAdvocateId === a.user_id ? '…' : 'Remove'}
                  </button>
                )}
              </div>
            )) : (
              <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 8 }}>No advocates assigned yet.</div>
            )}

            {canManageTeam && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <select value={selectedAdvocateToAdd} onChange={e => setSelectedAdvocateToAdd(e.target.value)}
                  style={{ flex: 1, padding: '8px 10px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13 }}>
                  <option value="">Select an advocate to add…</option>
                  {availableAdvocates.filter(av => !matter.advocates?.some(a => a.user_id === av.user_id)).map(av => (
                    <option key={av.user_id} value={av.user_id}>{av.full_name} ({av.role?.replace('_', ' ')})</option>
                  ))}
                </select>
                <button onClick={addAdvocate} disabled={!selectedAdvocateToAdd || addingAdvocate}
                  style={{ padding: '8px 16px', borderRadius: 8, background: NAVY, color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: !selectedAdvocateToAdd || addingAdvocate ? 'not-allowed' : 'pointer', opacity: !selectedAdvocateToAdd || addingAdvocate ? 0.6 : 1 }}>
                  {addingAdvocate ? 'Adding…' : '+ Add'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Documents Tab ── */}
      {tab === 'documents' && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: 24, minHeight: 340 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ margin: 0, color: NAVY, fontSize: 16 }}>Documents</h3>
            <label style={{ padding: '8px 16px', borderRadius: 8, background: GOLD, color: NAVY,
              fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'inline-block' }}>
              {uploading ? 'Uploading…' : '+ Upload'}
              <input type="file" style={{ display: 'none' }} onChange={handleFileUpload} disabled={uploading} />
            </label>
          </div>
          {documents.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94A3B8', padding: '30px 0' }}>No documents uploaded yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {documents.map(d => (
                <div key={d.doc_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                  background: BG, borderRadius: 8, border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: 22 }}>📄</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <a href={d.blob_url} target="_blank" rel="noreferrer"
                      style={{ color: NAVY, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>{d.filename}</a>
                    <div style={{ fontSize: 12, color: '#64748B' }}>
                      {d.uploader_name} · {new Date(d.created_at).toLocaleDateString('en-IN')}
                      {d.size_bytes && ` · ${(d.size_bytes / 1024 / 1024).toFixed(1)} MB`}
                    </div>
                  </div>
                  {(d.uploader_id === user?.user_id || ['managing_partner', 'advisor'].includes(user?.role)) && (
                    <button onClick={() => deleteDocument(d.doc_id)}
                      style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #FCA5A5',
                        background: '#FEF2F2', color: '#EF4444', fontSize: 12, cursor: 'pointer' }}>
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Notes Tab ── */}
      {tab === 'notes' && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: 24, minHeight: 340 }}>
          <h3 style={{ margin: '0 0 16px', color: NAVY, fontSize: 16 }}>Notes</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {notes.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94A3B8', padding: '20px 0' }}>No notes yet.</div>
            ) : notes.map(n => (
              <div key={n.note_id} style={{ padding: '12px 16px', borderRadius: 10, border: '1px solid',
                borderColor: n.is_private ? '#FDE68A' : '#E2E8F0', background: n.is_private ? '#FFFBEB' : BG }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    {editingNoteId === n.note_id ? (
                      <div>
                        <textarea value={editNoteContent} onChange={e => setEditNoteContent(e.target.value)}
                          style={{ width: '100%', padding: '8px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, minHeight: 60, boxSizing: 'border-box' }} />
                        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                          <button onClick={() => saveEditNote(n.note_id)}
                            style={{ padding: '4px 12px', borderRadius: 6, background: NAVY, color: '#fff', border: 'none', fontSize: 12, cursor: 'pointer' }}>Save</button>
                          <button onClick={() => setEditingNoteId(null)}
                            style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #E2E8F0', background: '#fff', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <p style={{ margin: 0, color: '#334155', fontSize: 14, lineHeight: 1.5 }}>{n.content}</p>
                    )}
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 5 }}>
                      {n.author_name} · {new Date(n.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      {n.is_private ? ' · 🔒 Private' : ''}
                    </div>
                  </div>
                  {n.author_id === user?.user_id && editingNoteId !== n.note_id && (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => { setEditingNoteId(n.note_id); setEditNoteContent(n.content); }}
                        style={{ padding: '3px 8px', border: '1px solid #E2E8F0', borderRadius: 5, background: '#fff', fontSize: 11, cursor: 'pointer' }}>Edit</button>
                      <button onClick={() => deleteNote(n.note_id)}
                        style={{ padding: '3px 8px', border: '1px solid #FCA5A5', borderRadius: 5, background: '#FEF2F2', color: '#EF4444', fontSize: 11, cursor: 'pointer' }}>Del</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 16 }}>
            <textarea value={noteContent} onChange={e => setNoteContent(e.target.value)} placeholder="Add a note…"
              style={{ width: '100%', padding: '10px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, minHeight: 80, boxSizing: 'border-box', resize: 'vertical' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              {isAdvocate && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748B', cursor: 'pointer' }}>
                  <input type="checkbox" checked={notePrivate} onChange={e => setNotePrivate(e.target.checked)} />
                  Private (only visible to me)
                </label>
              )}
              <button onClick={addNote} disabled={savingNote || !noteContent.trim()}
                style={{ padding: '8px 18px', borderRadius: 8, background: NAVY, color: '#fff', border: 'none',
                  fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: noteContent.trim() ? 1 : 0.5, marginLeft: 'auto' }}>
                {savingNote ? 'Saving…' : 'Add Note'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Chat Tab ── */}
      {tab === 'chat' && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', height: 500 }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94A3B8', margin: 'auto' }}>No messages yet. Start the conversation.</div>
            ) : messages.map(m => {
              const isMe = m.sender_id === user?.user_id;
              return (
                <div key={m.message_id} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: 10, alignItems: 'flex-end' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: isMe ? GOLD : '#E2E8F0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700,
                    color: isMe ? NAVY : '#64748B', flexShrink: 0 }}>
                    {m.sender_name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div style={{ maxWidth: '65%' }}>
                    <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 3, textAlign: isMe ? 'right' : 'left' }}>
                      {m.sender_name} · {new Date(m.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{ padding: '10px 14px', borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                      background: isMe ? NAVY : BG, color: isMe ? '#fff' : '#334155', fontSize: 14, lineHeight: 1.5 }}>
                      {m.content}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>
          <div style={{ borderTop: '1px solid #E2E8F0', padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <textarea value={chatMsg} onChange={e => setChatMsg(e.target.value)} placeholder="Type a message…"
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              style={{ flex: 1, padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 14,
                resize: 'none', minHeight: 40, maxHeight: 100, boxSizing: 'border-box', fontFamily: 'inherit' }} />
            <button onClick={sendMessage} disabled={sendingMsg || !chatMsg.trim()}
              style={{ padding: '10px 18px', borderRadius: 10, background: NAVY, color: '#fff', border: 'none',
                fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: chatMsg.trim() ? 1 : 0.5 }}>
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
