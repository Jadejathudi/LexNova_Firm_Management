import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

export default function DocumentVault() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [matters, setMatters] = useState([]);
  const [uploadMatter, setUploadMatter] = useState('');

  useEffect(() => {
    Promise.all([
      api.getMyDocuments(),
      api.getMatters().catch(() => []),
    ]).then(([docs, m]) => {
      setDocuments(docs);
      setMatters(m);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !uploadMatter) return;
    setUploading(true);
    try {
      await api.uploadDocument(uploadMatter, file);
      const docs = await api.getMyDocuments();
      setDocuments(docs);
      setUploadMatter('');
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  const matterNumbers = [...new Set(documents.map(d => d.matter_number))];
  const filtered = filter === 'all' ? documents : documents.filter(d => d.matter_number === filter);

  if (loading) return <div className="loading">Loading documents...</div>;

  return (
    <div className="doc-vault page-with-nav">
      <button className="back-btn" onClick={() => window.history.back()}>← Back</button>
      <h2 style={{ color: '#0A1628', marginBottom: 16 }}>📄 My Documents</h2>

      <div className="doc-filters">
        <div className={`doc-filter ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</div>
        {matterNumbers.map(mn => (
          <div key={mn} className={`doc-filter ${filter === mn ? 'active' : ''}`} onClick={() => setFilter(mn)}>
            {mn}
          </div>
        ))}
      </div>

      <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 16 }}>🔒 All documents encrypted end-to-end</p>

      {filtered.map(d => (
        <div key={d.document_id} className="doc-item">
          <div className="doc-info">
            <div className="doc-name">📄 {d.filename}</div>
            <div className="doc-meta">
              {d.matter_number} • {(d.file_size_bytes / 1024 / 1024).toFixed(1)} MB • Uploaded {new Date(d.uploaded_at).toLocaleDateString('en-IN')}
              {d.uploader_name && ` by ${d.uploader_name}`}
            </div>
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>
          No documents found.
        </div>
      )}

      <div className="card" style={{ marginTop: 24 }}>
        <h3 style={{ marginBottom: 12 }}>Upload Document</h3>
        <div className="form-group">
          <label>Select Matter</label>
          <select value={uploadMatter} onChange={e => setUploadMatter(e.target.value)}>
            <option value="">-- Select a matter --</option>
            {matters.map(m => (
              <option key={m.matter_id} value={m.matter_id}>{m.matter_number} — {m.title}</option>
            ))}
          </select>
        </div>
        {uploadMatter && (
          <div>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.docx" onChange={handleUpload} disabled={uploading} />
            <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 8 }}>Supported: PDF, JPG, PNG, DOCX — Max 20MB</p>
          </div>
        )}
        {uploading && <p style={{ color: '#C9A84C' }}>Uploading...</p>}
      </div>
    </div>
  );
}
