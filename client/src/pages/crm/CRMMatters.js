import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';

const STATUS_BADGE = {
  intake: 'badge-draft', active: 'badge-active', hearing_pending: 'badge-pending',
  awaiting_docs: 'badge-pending', judgment: 'badge-sent', closed: 'badge-closed',
};

export default function CRMMatters() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [matters, setMatters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [clients, setClients] = useState([]);
  const [newMatter, setNewMatter] = useState({ client_id: '', matter_type: 'civil', title: '', description: '', court_name: '', urgency: 'standard' });

  useEffect(() => {
    Promise.all([api.getMatters(), api.getClients().catch(() => [])])
      .then(([m, c]) => { setMatters(m); setClients(c); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = filterStatus === 'all' ? matters : matters.filter(m => m.status === filterStatus);
  const canCreate = ['managing_partner', 'senior_advocate'].includes(user?.role);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.createMatter(newMatter);
      const m = await api.getMatters();
      setMatters(m);
      setShowCreate(false);
      setNewMatter({ client_id: '', matter_type: 'civil', title: '', description: '', court_name: '', urgency: 'standard' });
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="loading">Loading matters...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ color: '#0A1628' }}>Matters ({filtered.length})</h2>
        {canCreate && <button className="btn btn-gold btn-sm" onClick={() => setShowCreate(!showCreate)}>+ New Matter</button>}
      </div>

      {showCreate && (
        <div className="card" style={{ marginBottom: 20 }}>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>Client</label>
                <select value={newMatter.client_id} onChange={e => setNewMatter(n => ({ ...n, client_id: e.target.value }))} required>
                  <option value="">Select client</option>
                  {clients.map(c => <option key={c.client_id} value={c.client_id}>{c.full_name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Type</label>
                <select value={newMatter.matter_type} onChange={e => setNewMatter(n => ({ ...n, matter_type: e.target.value }))}>
                  {['criminal', 'civil', 'corporate', 'family', 'real_estate', 'arbitration'].map(t =>
                    <option key={t} value={t}>{t.replace('_', ' ')}</option>
                  )}
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Title</label>
                <input value={newMatter.title} onChange={e => setNewMatter(n => ({ ...n, title: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Court</label>
                <input value={newMatter.court_name} onChange={e => setNewMatter(n => ({ ...n, court_name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Urgency</label>
                <select value={newMatter.urgency} onChange={e => setNewMatter(n => ({ ...n, urgency: e.target.value }))}>
                  <option value="standard">Standard</option>
                  <option value="urgent">Urgent</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            <button className="btn btn-navy btn-sm" type="submit">Create Matter</button>
          </form>
        </div>
      )}

      <div className="doc-filters" style={{ marginBottom: 16 }}>
        {['all', 'intake', 'active', 'hearing_pending', 'awaiting_docs', 'judgment', 'closed'].map(s => (
          <div key={s} className={`doc-filter ${filterStatus === s ? 'active' : ''}`} onClick={() => setFilterStatus(s)}>
            {s === 'all' ? 'All' : s.replace('_', ' ')}
          </div>
        ))}
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Matter #</th>
            <th>Title</th>
            <th>Client</th>
            <th>Status</th>
            <th>Urgency</th>
            <th>Advocates</th>
            <th>Next Hearing</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(m => (
            <tr key={m.matter_id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/cases/${m.matter_id}`)}>
              <td><strong>{m.matter_number}</strong></td>
              <td>{m.title}</td>
              <td>{m.client_name}</td>
              <td><span className={`badge ${STATUS_BADGE[m.status]}`}>{m.status?.replace('_', ' ')}</span></td>
              <td><span className={`badge ${m.urgency === 'critical' ? 'badge-urgent' : m.urgency === 'urgent' ? 'badge-pending' : 'badge-draft'}`}>{m.urgency}</span></td>
              <td>{m.advocates?.map(a => a.full_name).join(', ') || '—'}</td>
              <td>{m.next_hearing ? new Date(m.next_hearing.hearing_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
