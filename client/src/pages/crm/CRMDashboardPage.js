import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';

export default function CRMDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboard()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (!data) return <div className="loading">Unable to load dashboard</div>;

  const maxCases = Math.max(...data.advocate_workloads.map(a => a.active_cases), 1);

  return (
    <div>
      <h2 style={{ color: '#0A1628', marginBottom: 24 }}>Command Centre</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{data.stats.active_matters}</div>
          <div className="stat-label">Active Matters</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.stats.hearings_this_week}</div>
          <div className="stat-label">Hearings This Week</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: data.stats.overdue_invoices > 0 ? '#EF4444' : undefined }}>
            {data.stats.overdue_invoices}
          </div>
          <div className="stat-label">Overdue Invoices</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">₹{(data.stats.total_revenue / 100000).toFixed(1)}L</div>
          <div className="stat-label">Total Revenue</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Advocate Workloads */}
        <div className="card">
          <div className="card-header">Advocate Workloads</div>
          {data.advocate_workloads.map(a => {
            const pct = (a.active_cases / 20) * 100;
            const level = a.active_cases > 14 ? 'danger' : a.active_cases > 10 ? 'warning' : 'normal';
            return (
              <div key={a.user_id} className="workload-bar">
                <div className="name">
                  <span>{a.full_name}</span>
                  <span>{a.active_cases} cases</span>
                </div>
                <div className="bar">
                  <div className={`fill ${level}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="card-header">Recent Activity</div>
          <ul className="activity-list">
            {data.recent_activity.map((a, i) => (
              <li key={i} className="activity-item">
                <strong>{a.actor_name}</strong> — {a.action.replace('_', ' ')} ({a.resource_type})
                <div className="time">{new Date(a.timestamp).toLocaleString('en-IN')}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Matters needing attention */}
      {data.stale_matters.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header">⚠️ Matters Needing Attention</div>
          {data.stale_matters.map(m => (
            <div key={m.matter_id} style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>⚠ #{m.matter_number} — {m.title}</span>
              <span className={`badge badge-${m.status === 'active' ? 'active' : 'pending'}`}>{m.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
