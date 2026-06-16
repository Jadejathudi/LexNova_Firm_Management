import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';

const NAVY = '#1B2559', GOLD = '#C9A84C';

const TYPE_BADGE = {
  corporate: '#0E7490', tax: '#7C3AED', immigration: '#0369A1',
  criminal: '#DC2626', civil: '#16A34A', family: '#D97706',
  real_estate: '#78716C', bench: '#1B2559',
};
const TYPE_LABEL = {
  corporate: 'Corporate', tax: 'Income Tax', immigration: 'Immigration',
  criminal: 'Criminal', civil: 'Civil', family: 'Family',
  real_estate: 'Real Estate', bench: 'Bench Session',
};
const STATUS_BADGE = {
  open: '#16A34A', in_progress: '#D97706', resolved: '#0369A1', closed: '#64748B',
};

export default function CRMMatters() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [matters, setMatters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    api.getMatters()
      .then(setMatters)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = matters.filter(m => {
    if (filterStatus !== 'all' && m.status !== filterStatus) return false;
    if (filterType !== 'all' && m.matter_type !== filterType) return false;
    return true;
  });

  if (loading) return <div className="loading">Loading matters...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ color: NAVY }}>Consultation Matters ({filtered.length})</h2>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>STATUS</span>
          {['all', 'open', 'in_progress', 'resolved', 'closed'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              style={{ padding: '4px 10px', borderRadius: 20, border: '1px solid', fontSize: 12, cursor: 'pointer',
                background: filterStatus === s ? NAVY : '#fff', color: filterStatus === s ? '#fff' : '#64748B',
                borderColor: filterStatus === s ? NAVY : '#E2E8F0' }}>
              {s === 'all' ? 'All' : s.replace('_', ' ')}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>TYPE</span>
          {['all', 'corporate', 'tax', 'immigration', 'criminal', 'civil', 'family', 'real_estate', 'bench'].map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              style={{ padding: '4px 10px', borderRadius: 20, border: '1px solid', fontSize: 12, cursor: 'pointer',
                background: filterType === t ? GOLD : '#fff', color: filterType === t ? NAVY : '#64748B',
                borderColor: filterType === t ? GOLD : '#E2E8F0' }}>
              {t === 'all' ? 'All' : TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Ref</th>
            <th>Title</th>
            <th>Client</th>
            <th>Type</th>
            <th>Status</th>
            <th>Advocate</th>
            <th>Created</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(m => (
            <tr key={m.matter_id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/matters/${m.matter_id}`)}>
              <td><strong style={{ fontFamily: 'monospace', fontSize: 12 }}>{m.matter_ref}</strong></td>
              <td style={{ maxWidth: 200 }}>{m.title}</td>
              <td>{m.client_name || '—'}</td>
              <td>
                <span style={{ background: TYPE_BADGE[m.matter_type] + '18', color: TYPE_BADGE[m.matter_type],
                  padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                  {TYPE_LABEL[m.matter_type] || m.matter_type}
                </span>
              </td>
              <td>
                <span style={{ background: STATUS_BADGE[m.status] + '20', color: STATUS_BADGE[m.status],
                  padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                  {m.status?.replace('_', ' ')}
                </span>
              </td>
              <td>{m.advocate_name || '—'}</td>
              <td style={{ fontSize: 12, color: '#64748B' }}>{new Date(m.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}</td>
              <td>
                <button onClick={e => { e.stopPropagation(); navigate(`/matters/${m.matter_id}`); }}
                  style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${NAVY}`, background: '#fff',
                    color: NAVY, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                  View →
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', color: '#94A3B8', padding: 40 }}>No matters found.</div>
      )}
    </div>
  );
}
