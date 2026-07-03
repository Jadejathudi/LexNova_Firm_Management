import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';

export default function CRMTeam() {
  const [team, setTeam] = useState([]);
  const [advocates, setAdvocates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getTeam(), api.getAdvocates()])
      .then(([t, a]) => { setTeam(t); setAdvocates(a); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading team...</div>;

  return (
    <div>
      <h2 style={{ color: '#1C2A40', marginBottom: 20 }}>Team Members ({team.length})</h2>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">Advocate Workloads</div>
        {advocates.map(a => {
          const pct = (a.active_cases / 20) * 100;
          const level = a.active_cases > 14 ? 'danger' : a.active_cases > 10 ? 'warning' : 'normal';
          return (
            <div key={a.user_id} className="workload-bar">
              <div className="name">
                <span>{a.full_name} <span className="badge badge-active" style={{ marginLeft: 8 }}>{a.role?.replace('_', ' ')}</span></span>
                <span>{a.active_cases} active cases</span>
              </div>
              <div className="bar">
                <div className={`fill ${level}`} style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Status</th>
            <th>Last Login</th>
          </tr>
        </thead>
        <tbody>
          {team.map(t => (
            <tr key={t.user_id}>
              <td><strong>{t.full_name}</strong></td>
              <td><span className="badge badge-active">{t.role?.replace('_', ' ')}</span></td>
              <td>{t.email}</td>
              <td>{t.phone}</td>
              <td>{t.is_active ? '🟢 Active' : '🔴 Inactive'}</td>
              <td>{t.last_login ? new Date(t.last_login).toLocaleString('en-IN') : 'Never'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
