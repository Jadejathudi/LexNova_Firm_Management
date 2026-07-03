import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';

const STATUS_BADGE = {
  intake: 'badge-draft', active: 'badge-active', hearing_pending: 'badge-pending',
  awaiting_docs: 'badge-pending', judgment: 'badge-sent', closed: 'badge-closed',
};

export default function CRMCases() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [clients, setClients] = useState([]);
  const [newCase, setNewCase] = useState({ client_id: '', matter_type: 'civil', title: '', description: '', court_name: '', urgency: 'standard' });

  useEffect(() => {
    Promise.all([api.getCases(), api.getClients().catch(() => [])])
      .then(([c, cl]) => { setCases(c); setClients(cl); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = filterStatus === 'all' ? cases : cases.filter(c => c.status === filterStatus);
  const canCreate = ['managing_partner', 'senior_advocate'].includes(user?.role);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.createCase(newCase);
      const c = await api.getCases();
      setCases(c);
      setShowCreate(false);
      setNewCase({ client_id: '', matter_type: 'civil', title: '', description: '', court_name: '', urgency: 'standard' });
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="loading">Loading cases...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ color: '#1C2A40' }}>Filed Cases ({filtered.length})</h2>
        {canCreate && <button className="btn btn-gold btn-sm" onClick={() => setShowCreate(!showCreate)}>+ New Case</button>}
      </div>

      {showCreate && (
        <div className="card" style={{ marginBottom: 20 }}>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>Client</label>
                <select value={newCase.client_id} onChange={e => setNewCase(n => ({ ...n, client_id: e.target.value }))} required>
                  <option value="">Select client</option>
                  {clients.map(c => <option key={c.client_id} value={c.client_id}>{c.full_name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Type</label>
                <select value={newCase.matter_type} onChange={e => setNewCase(n => ({ ...n, matter_type: e.target.value }))}>
                  {['criminal', 'civil', 'corporate', 'family', 'real_estate', 'arbitration'].map(t =>
                    <option key={t} value={t}>{t.replace('_', ' ')}</option>
                  )}
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Title</label>
                <input value={newCase.title} onChange={e => setNewCase(n => ({ ...n, title: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Court</label>
                <input value={newCase.court_name} onChange={e => setNewCase(n => ({ ...n, court_name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Urgency</label>
                <select value={newCase.urgency} onChange={e => setNewCase(n => ({ ...n, urgency: e.target.value }))}>
                  <option value="standard">Standard</option>
                  <option value="urgent">Urgent</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            <button className="btn btn-navy btn-sm" type="submit">Create Case</button>
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
            <th>Case #</th>
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
              <td>{m.next_hearing ? new Date(String(m.next_hearing.hearing_date).split('T')[0] + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
