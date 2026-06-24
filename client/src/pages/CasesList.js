import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

const NAVY = '#1C2A40', GOLD = '#3D6FB0', BG = '#F4F6FB';

const STATUS_META = {
  intake:        { label: 'Intake',         cls: 'badge-draft',   color: '#64748B' },
  active:        { label: 'Active',          cls: 'badge-active',  color: '#16A34A' },
  hearing_pending:{ label: 'Hearing Pending',cls: 'badge-pending', color: '#D97706' },
  awaiting_docs: { label: 'Awaiting Docs',  cls: 'badge-pending', color: '#D97706' },
  judgment:      { label: 'Judgment',        cls: 'badge-sent',    color: '#1D4ED8' },
  closed:        { label: 'Closed',          cls: 'badge-closed',  color: '#64748B' },
};

const TYPE_META = {
  criminal:    { label: 'Criminal',     color: '#DC2626' },
  civil:       { label: 'Civil',        color: '#16A34A' },
  corporate:   { label: 'Corporate',    color: '#0E7490' },
  family:      { label: 'Family',       color: '#D97706' },
  real_estate: { label: 'Real Estate',  color: '#78716C' },
  arbitration: { label: 'Arbitration',  color: '#7C3AED' },
};

export default function CasesList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    api.getCases()
      .then(setCases)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = filterStatus === 'all' ? cases : cases.filter(c => c.status === filterStatus);

  if (loading) return <div className="loading">Loading cases…</div>;

  return (
    <div className="page-with-nav" style={{ maxWidth: 860, margin: '0 auto', padding: '28px 20px' }}>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h2 style={{ color: NAVY, fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, margin: 0 }}>⚖ Filed Cases</h2>
          <p style={{ color: '#64748B', fontSize: 13, margin: '4px 0 0' }}>Court-filed matters and their current status</p>
        </div>
        <button className="btn btn-gold btn-sm" onClick={() => navigate('/book')}>
          + New Consultation
        </button>
      </div>

      {/* Status filter pills */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        {['all', 'intake', 'active', 'hearing_pending', 'awaiting_docs', 'judgment', 'closed'].map(s => {
          const meta = STATUS_META[s];
          return (
            <button key={s} onClick={() => setFilterStatus(s)} style={{
              padding: '5px 14px', borderRadius: 20, border: '1.5px solid',
              fontSize: 12, cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit',
              background: filterStatus === s ? NAVY : '#fff',
              color: filterStatus === s ? '#fff' : '#64748B',
              borderColor: filterStatus === s ? NAVY : '#E2E8F0',
            }}>
              {s === 'all' ? `All (${cases.length})` : meta?.label || s}
            </button>
          );
        })}
      </div>

      {/* Case cards */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">⚖️</div>
          <div className="empty-title">
            {filterStatus === 'all' ? 'No filed cases yet' : `No ${STATUS_META[filterStatus]?.label || filterStatus} cases`}
          </div>
          <div className="empty-sub">
            {filterStatus === 'all'
              ? 'Cases appear here once a consultation matter is filed in court by your advocate.'
              : 'Try a different status filter above.'}
          </div>
          {filterStatus === 'all' && (
            <button className="btn btn-gold" onClick={() => navigate('/matters')}>
              View My Matters →
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(m => {
            const statusMeta = STATUS_META[m.status] || { label: m.status, cls: 'badge-draft', color: '#64748B' };
            const typeMeta = TYPE_META[m.matter_type] || { label: m.matter_type, color: NAVY };
            return (
              <div key={m.matter_id}
                onClick={() => navigate(`/cases/${m.matter_id}`)}
                style={{
                  background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0',
                  borderLeft: `4px solid ${typeMeta.color}`,
                  padding: '18px 20px', cursor: 'pointer',
                  boxShadow: '0 1px 4px rgba(0,0,0,.05)',
                  transition: 'all .18s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(27,37,89,.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,.05)'; e.currentTarget.style.transform = 'none'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Case number + type badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#94A3B8', letterSpacing: '.06em' }}>{m.matter_number || '—'}</span>
                      <span style={{ background: typeMeta.color + '18', color: typeMeta.color, padding: '1px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                        {typeMeta.label}
                      </span>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: NAVY, lineHeight: 1.3 }}>{m.title}</div>
                  </div>
                  <span className={`badge ${statusMeta.cls}`}>{statusMeta.label}</span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12, color: '#64748B', marginTop: 8 }}>
                  {m.client_name && <span>👤 {m.client_name}</span>}
                  {(m.advocates?.length > 0 || m.lead_advocate) && (
                    <span>⚖ {m.advocates?.map(a => a.full_name).join(', ') || m.lead_advocate}</span>
                  )}
                  {m.court_name && <span>🏛 {m.court_name}</span>}
                  {m.next_hearing && (
                    <span style={{ color: '#1D4ED8', fontWeight: 600 }}>
                      📅 {new Date(String(m.next_hearing.hearing_date).split('T')[0] + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                  {m.urgency && m.urgency !== 'standard' && (
                    <span style={{ color: '#DC2626', fontWeight: 700, textTransform: 'uppercase', fontSize: 11 }}>
                      {m.urgency === 'critical' ? '🔴 CRITICAL' : '⚡ URGENT'}
                    </span>
                  )}
                </div>

                <div style={{ textAlign: 'right', marginTop: 8 }}>
                  <span style={{ color: GOLD, fontSize: 13, fontWeight: 700 }}>View Details →</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
