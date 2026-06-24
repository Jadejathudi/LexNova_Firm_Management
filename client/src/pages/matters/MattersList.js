import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';

const NAVY = '#1C2A40', GOLD = '#3D6FB0', BG = '#F4F6FB';

const TYPE_META = {
  corporate:   { label: 'Corporate Law',  color: '#0E7490', icon: '🏢' },
  tax:         { label: 'Income Tax',      color: '#7C3AED', icon: '₹'  },
  immigration: { label: 'Immigration',    color: '#0369A1', icon: '✈'  },
  criminal:    { label: 'Criminal',        color: '#DC2626', icon: '⚖'  },
  civil:       { label: 'Civil',           color: '#16A34A', icon: '📋' },
  family:      { label: 'Family',          color: '#D97706', icon: '👨‍👩‍👧' },
  real_estate: { label: 'Real Estate',    color: '#78716C', icon: '🏠' },
  bench:       { label: 'Bench Session',  color: '#1C2A40', icon: '⚖'  },
};

const STATUS_META = {
  open:        { label: 'Open',        color: '#16A34A' },
  in_progress: { label: 'In Progress', color: '#D97706' },
  resolved:    { label: 'Resolved',    color: '#0369A1' },
  closed:      { label: 'Closed',      color: '#64748B' },
};

const isAdvocate = (role) => ['managing_partner', 'advisor', 'senior_advocate', 'junior_advocate'].includes(role);

export default function MattersList() {
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

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading matters…</div>;

  const advocate = isAdvocate(user?.role);

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 20px' }} className="page-with-nav">
      <div className="page-header">
        <div>
          <h2 style={{ color: NAVY, margin: 0, fontSize: 22, fontFamily: "'Space Grotesk', sans-serif" }}>
            {advocate ? 'Consultation Matters' : 'My Matters'}
          </h2>
          <p style={{ color: '#64748B', fontSize: 13, margin: '4px 0 0' }}>
            {advocate ? 'All matters shared with you across clients' : 'Your consultation records, documents, and shared notes'}
          </p>
        </div>
        {advocate && (
          <button className="btn btn-gold btn-sm" onClick={() => navigate('/book')}>
            + New Consultation
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {['all', 'open', 'in_progress', 'resolved', 'closed'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            style={{ padding: '5px 14px', borderRadius: 20, border: '1px solid', fontSize: 12, cursor: 'pointer', fontWeight: 600,
              background: filterStatus === s ? NAVY : '#fff', color: filterStatus === s ? '#fff' : '#64748B',
              borderColor: filterStatus === s ? NAVY : '#E2E8F0' }}>
            {s === 'all' ? 'All Status' : STATUS_META[s]?.label || s}
          </button>
        ))}
        <div style={{ width: 1, background: '#E2E8F0', margin: '0 4px' }} />
        {['all', ...Object.keys(TYPE_META)].map(t => (
          <button key={t} onClick={() => setFilterType(t)}
            style={{ padding: '5px 14px', borderRadius: 20, border: '1px solid', fontSize: 12, cursor: 'pointer', fontWeight: 600,
              background: filterType === t ? GOLD : '#fff', color: filterType === t ? NAVY : '#64748B',
              borderColor: filterType === t ? GOLD : '#E2E8F0' }}>
            {t === 'all' ? 'All Types' : `${TYPE_META[t].icon} ${TYPE_META[t].label}`}
          </button>
        ))}
      </div>

      {/* Matter Cards */}
      {filtered.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 8 }}>
          <div className="empty-icon">📁</div>
          <div className="empty-title">
            {matters.length === 0 ? 'No matters yet' : 'No matches'}
          </div>
          <div className="empty-sub">
            {matters.length === 0
              ? 'Matters are created automatically when you book a consultation or a bench session. Your matter becomes the shared workspace with your advocate.'
              : 'Try clearing the filters above to see all matters.'}
          </div>
          {matters.length === 0 && (
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-gold" onClick={() => navigate('/book')}>Book a Consultation</button>
              <button className="btn btn-outline" onClick={() => navigate('/bench/directory')}>⚖ The Bench</button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(m => {
            const meta = TYPE_META[m.matter_type] || { label: m.matter_type, color: '#64748B', icon: '📁' };
            const statusMeta = STATUS_META[m.status] || { label: m.status, color: '#64748B' };
            return (
              <div key={m.matter_id}
                onClick={() => navigate(`/matters/${m.matter_id}`)}
                style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '16px 20px',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16,
                  boxShadow: '0 1px 4px rgba(0,0,0,.05)', transition: 'box-shadow .15s' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(27,37,89,.1)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,.05)'}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: meta.color + '18',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                  {meta.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                    <span style={{ fontWeight: 700, color: NAVY, fontSize: 14 }}>{m.title}</span>
                    <span style={{ background: meta.color + '18', color: meta.color, padding: '1px 8px',
                      borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{meta.label}</span>
                    <span style={{ background: statusMeta.color + '18', color: statusMeta.color, padding: '1px 8px',
                      borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{statusMeta.label}</span>
                    {m.case_id && (
                      <span style={{ background: '#F59E0B18', color: '#D97706', padding: '1px 8px',
                        borderRadius: 10, fontSize: 11, fontWeight: 600 }}>↗ Filed Case</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748B', display: 'flex', gap: 12 }}>
                    <span style={{ fontFamily: 'monospace' }}>{m.matter_ref}</span>
                    {m.advocate_name && <span>Advocate: {m.advocate_name}</span>}
                    <span>{new Date(m.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>
                <span style={{ color: '#94A3B8', fontSize: 18, flexShrink: 0 }}>›</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
