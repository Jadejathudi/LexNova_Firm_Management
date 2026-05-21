import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

const CAN_MANAGE_ROLES = ['managing_partner', 'advisor', 'senior_advocate', 'junior_advocate'];

function formatSize(bytes) {
  if (!bytes) return '—';
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(0)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function DocumentVault() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadMatter, setUploadMatter] = useState('');
  const [matters, setMatters] = useState([]);
  const [deletingDocId, setDeletingDocId] = useState(null);

  const canManage = CAN_MANAGE_ROLES.includes(user?.role);

  useEffect(() => {
    Promise.all([
      api.getMyDocuments(),
      canManage ? api.getMatters().catch(() => []) : Promise.resolve([]),
    ])
      .then(([docs, m]) => { setDocuments(docs); setMatters(m); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [canManage]);

  const handleUpload = async (file) => {
    if (!file || !uploadMatter) return;
    setUploading(true);
    setUploadError(null);
    try {
      await api.uploadDocument(uploadMatter, file);
      const docs = await api.getMyDocuments();
      setDocuments(docs);
      setUploadMatter('');
    } catch (err) {
      setUploadError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId) => {
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

  const matterNumbers = [...new Set(documents.map(d => d.matter_number).filter(Boolean))];
  const filtered = filter === 'all' ? documents : documents.filter(d => d.matter_number === filter);

  if (loading) return <div className="loading">Loading documents...</div>;

  return (
    <div className="doc-vault page-with-nav" style={{ maxWidth: 800, margin: '0 auto', padding: '20px 16px 80px' }}>
      <button className="back-btn" onClick={() => window.history.back()}>← Back</button>

      <h2 style={{ color: '#0A1628', marginBottom: 4, fontSize: 22, fontWeight: 700 }}>📄 Document Vault</h2>
      <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 20 }}>
        🔒 All documents stored securely on Vercel Blob · {documents.length} file{documents.length !== 1 ? 's' : ''}
      </p>

      {/* Upload panel — advocates / managing partners only */}
      {canManage && (
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '20px', marginBottom: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#1B2559', marginBottom: 14 }}>Upload New Document</div>

          <div className="form-group" style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Select Matter *</label>
            <select
              value={uploadMatter}
              onChange={e => setUploadMatter(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #CBD5E1', borderRadius: 8, fontSize: 13, color: '#1B2559' }}
            >
              <option value="">— Choose a matter —</option>
              {matters.map(m => (
                <option key={m.matter_id} value={m.matter_id}>{m.matter_number} — {m.title}</option>
              ))}
            </select>
          </div>

          {uploadMatter && (
            <div
              style={{
                border: `2px dashed ${isDragging ? '#C9A84C' : '#CBD5E1'}`,
                borderRadius: 10,
                padding: '24px 16px',
                textAlign: 'center',
                background: isDragging ? '#FFFBEB' : '#F8FAFC',
                cursor: uploading ? 'default' : 'pointer',
                transition: 'border-color 0.2s, background 0.2s',
              }}
              onDragOver={e => { e.preventDefault(); if (!uploading) setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={e => {
                e.preventDefault();
                setIsDragging(false);
                if (!uploading && e.dataTransfer.files[0]) handleUpload(e.dataTransfer.files[0]);
              }}
              onClick={() => { if (!uploading) document.getElementById('vault-file-input').click(); }}
            >
              <input
                id="vault-file-input"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.docx"
                style={{ display: 'none' }}
                onChange={e => { if (e.target.files[0]) handleUpload(e.target.files[0]); e.target.value = ''; }}
              />
              {uploading ? (
                <>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1B2559' }}>Uploading…</div>
                  <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>Please wait</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>☁️</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1B2559' }}>Click or drag & drop a file</div>
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
            <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '10px 14px', marginTop: 12, fontSize: 13, color: '#DC2626', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>⚠️ {uploadError}</span>
              <button onClick={() => setUploadError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', fontSize: 18, lineHeight: 1, padding: '0 4px' }}>×</button>
            </div>
          )}
        </div>
      )}

      {/* Filter tabs */}
      {matterNumbers.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {['all', ...matterNumbers].map(mn => (
            <button
              key={mn}
              onClick={() => setFilter(mn)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                border: 'none',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                background: filter === mn ? '#1B2559' : '#E2E8F0',
                color: filter === mn ? '#FFF' : '#475569',
              }}
            >
              {mn === 'all' ? `All (${documents.length})` : mn}
            </button>
          ))}
        </div>
      )}

      {/* Document list */}
      {filtered.map(d => {
        const ext = (d.file_type || d.filename?.split('.').pop() || '').toLowerCase();
        const isPdf = ext === 'pdf';
        const isDoc = ['doc', 'docx'].includes(ext);
        const isImg = ['jpg', 'jpeg', 'png'].includes(ext);
        const icon = isPdf ? '📕' : isDoc ? '📘' : isImg ? '🖼️' : '📄';
        const accentColor = isPdf ? '#EF4444' : isDoc ? '#3B82F6' : isImg ? '#10B981' : '#64748B';
        const hasValidUrl = d.stored_path && d.stored_path.startsWith('http');

        return (
          <div
            key={d.document_id}
            style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderLeft: `4px solid ${accentColor}`, borderRadius: 10, padding: '14px 16px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14 }}
          >
            <div style={{ fontSize: 26, flexShrink: 0 }}>{icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#1B2559', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {d.filename}
              </div>
              <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 3 }}>
                {d.matter_number && <span style={{ background: '#F1F5F9', padding: '1px 7px', borderRadius: 10, marginRight: 6, color: '#475569', fontWeight: 600 }}>{d.matter_number}</span>}
                {d.matter_title && <span style={{ marginRight: 6, color: '#64748B' }}>{d.matter_title} ·</span>}
                {formatSize(d.file_size_bytes)} · {new Date(d.uploaded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {hasValidUrl ? (
                <a
                  href={d.stored_path}
                  target="_blank"
                  rel="noreferrer"
                  style={{ padding: '6px 14px', background: '#1B2559', color: '#FFF', borderRadius: 7, fontSize: 12, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}
                >
                  Open ↗
                </a>
              ) : (
                <span style={{ padding: '6px 14px', background: '#F1F5F9', color: '#94A3B8', borderRadius: 7, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                  Unavailable
                </span>
              )}
              {canManage && (user?.role === 'managing_partner' || user?.role === 'advisor' || user?.user_id === d.uploaded_by) && (
                <button
                  onClick={() => handleDelete(d.document_id)}
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

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: '#F8FAFC', borderRadius: 12, border: '1px dashed #E2E8F0' }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>📂</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#475569', marginBottom: 4 }}>No documents found</div>
          <div style={{ fontSize: 12, color: '#94A3B8' }}>
            {canManage ? 'Upload documents from a case or use the panel above' : 'Your advocate will upload relevant documents here'}
          </div>
        </div>
      )}
    </div>
  );
}
