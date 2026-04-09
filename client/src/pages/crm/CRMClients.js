import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';

export default function CRMClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getClients()
      .then(setClients)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading clients...</div>;

  return (
    <div>
      <h2 style={{ color: '#0A1628', marginBottom: 20 }}>Clients ({clients.length})</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Type</th>
            <th>KYC</th>
            <th>Joined</th>
          </tr>
        </thead>
        <tbody>
          {clients.map(c => (
            <tr key={c.client_id}>
              <td><strong>{c.full_name}</strong></td>
              <td>{c.email || '—'}</td>
              <td>{c.phone || '—'}</td>
              <td><span className="badge badge-active">{c.client_type || '—'}</span></td>
              <td>{c.kyc_verified ? '✅' : '❌'}</td>
              <td>{c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN') : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
