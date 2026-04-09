import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';

export default function CRMConsultations() {
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getConsultations()
      .then(setConsultations)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading bookings...</div>;

  return (
    <div>
      <h2 style={{ color: '#0A1628', marginBottom: 20 }}>Consultation Bookings ({consultations.length})</h2>

      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Matter Type</th>
            <th>Urgency</th>
            <th>Mode</th>
            <th>Date</th>
            <th>Time</th>
            <th>Status</th>
            <th>Booked On</th>
          </tr>
        </thead>
        <tbody>
          {consultations.map(c => (
            <tr key={c.consultation_id}>
              <td><strong>{c.guest_name}</strong></td>
              <td>{c.guest_phone}</td>
              <td><span className="badge badge-active">{c.matter_type}</span></td>
              <td><span className={`badge ${c.urgency === 'urgent' ? 'badge-urgent' : 'badge-draft'}`}>{c.urgency}</span></td>
              <td>{c.consultation_mode === 'video' ? '📹' : c.consultation_mode === 'phone' ? '📞' : '🏢'} {c.consultation_mode}</td>
              <td>{c.preferred_date || '—'}</td>
              <td>{c.preferred_time || '—'}</td>
              <td><span className={`badge ${c.status === 'booked' ? 'badge-sent' : c.status === 'confirmed' ? 'badge-active' : 'badge-draft'}`}>{c.status}</span></td>
              <td>{new Date(c.created_at).toLocaleDateString('en-IN')}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {consultations.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>No consultation bookings yet.</div>
      )}
    </div>
  );
}
