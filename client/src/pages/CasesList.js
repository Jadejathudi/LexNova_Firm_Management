import React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

const STATUS_BADGE = {
  intake: 'badge-draft', active: 'badge-active', hearing_pending: 'badge-pending',
  awaiting_docs: 'badge-pending', judgment: 'badge-sent', closed: 'badge-closed',
};

export default function CasesList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [matters, setMatters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMatters()
      .then(setMatters)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading cases...</div>;

  return (
    <div className="page-with-nav" style={{ padding: 24 }}>
      <h2 style={{ color: '#0A1628', marginBottom: 20 }}>My Cases</h2>
      {matters.map(m => (
        <div key={m.matter_id} className="case-card" onClick={() => navigate(`/cases/${m.matter_id}`)}>
          <div className="case-number">📁 {m.matter_number}</div>
          <div className="case-title">{m.title}</div>
          <span className={`badge ${STATUS_BADGE[m.status]}`}>{m.status?.replace('_', ' ').toUpperCase()}</span>
          {m.advocates?.length > 0 && (
            <div className="case-advocate">Advocate: {m.advocates.map(a => a.full_name).join(', ')}</div>
          )}
          <span className="view-link">View →</span>
        </div>
      ))}
      {matters.length === 0 && (
        <div style={{ textAlign: 'center', color: '#94A3B8', padding: 40 }}>No cases found.</div>
      )}
    </div>
  );
}
