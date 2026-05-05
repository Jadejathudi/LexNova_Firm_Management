import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

const NAVY = '#0A1628';
const WHITE = '#FFFFFF';
const BG = '#F8FAFC';
const GRAY = '#64748B';
const GOLD = '#C9A84C';

export default function ConsultationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    api.getConsultationSession(id)
      .then(data => {
        setSession(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching consultation session:', err);
        setError('Unable to load consultation details. ' + (err.message || ''));
        setLoading(false);
      });
  }, [id, user, navigate]);

  if (loading) return <div style={{ padding: '40px 20px', textAlign: 'center' }}>Loading consultation details...</div>;
  if (error) return <div style={{ padding: '40px 20px', textAlign: 'center', color: '#dc2626' }}>Error: {error}</div>;
  if (!session) return <div style={{ padding: '40px 20px', textAlign: 'center' }}>Consultation not found</div>;

  const statusColor = {
    scheduled: '#3b82f6',
    active: '#10b981',
    completed: '#8b5cf6',
    cancelled: '#ef4444',
  };

  const formatDateTime = (date, time) => {
    if (!date) return 'TBD';
    try {
      const [year, month, day] = date.split('-');
      const dateObj = new Date(`${year}-${month}-${day}T00:00:00`);
      const formattedDate = dateObj.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      return `${formattedDate} at ${time || 'TBD'}`;
    } catch (e) {
      return `${date} at ${time || 'TBD'}`;
    }
  };

  return (
    <div style={{ background: BG, minHeight: '100vh', padding: '24px 20px 60px' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <button 
          onClick={() => navigate(-1)} 
          style={{ 
            background: 'none', 
            border: 'none', 
            color: GRAY, 
            fontSize: '16px', 
            cursor: 'pointer',
            marginBottom: '24px',
            padding: 0
          }}
        >
          ← Back
        </button>

        <div style={{ background: WHITE, borderRadius: '18px', padding: '32px', boxShadow: '0 24px 70px rgba(15,23,42,0.08)' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '28px', margin: '0 0 8px 0', color: NAVY }}>Consultation Details</h1>
              <p style={{ color: GRAY, margin: 0, fontSize: '14px' }}>Session ID: {session.session_id?.substring(0, 8)}...</p>
            </div>
            <div style={{ 
              padding: '8px 16px', 
              borderRadius: '12px', 
              background: statusColor[session.status] || GRAY,
              color: WHITE,
              fontWeight: '600',
              fontSize: '14px'
            }}>
              {session.status?.toUpperCase() || 'UNKNOWN'}
            </div>
          </div>

          {/* Client Info */}
          <div style={{ marginBottom: '28px', paddingBottom: '24px', borderBottom: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 12px 0', color: NAVY }}>Client Information</h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: GRAY }}>Name:</span>
                <span style={{ fontWeight: '600' }}>{session.client_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: GRAY }}>Phone:</span>
                <span style={{ fontWeight: '600' }}>{session.client_phone}</span>
              </div>
            </div>
          </div>

          {/* Advocate Info */}
          <div style={{ marginBottom: '28px', paddingBottom: '24px', borderBottom: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 12px 0', color: NAVY }}>Advocate Information</h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: GRAY }}>Advocate:</span>
                <span style={{ fontWeight: '600' }}>{session.advocate_name || 'Assigned Advocate'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: GRAY }}>Mode:</span>
                <span style={{ fontWeight: '600', textTransform: 'capitalize' }}>{session.session_mode}</span>
              </div>
            </div>
          </div>

          {/* Session Details */}
          <div style={{ marginBottom: '28px', paddingBottom: '24px', borderBottom: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 12px 0', color: NAVY }}>Session Details</h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: GRAY }}>📅 Scheduled Date & Time:</span>
                <span style={{ fontWeight: '600' }}>{formatDateTime(session.scheduled_date, session.scheduled_time)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: GRAY }}>⏱️ Duration:</span>
                <span style={{ fontWeight: '600' }}>{session.duration_minutes} minutes</span>
              </div>
              {session.notes && (
                <div style={{ marginTop: '12px' }}>
                  <span style={{ color: GRAY, display: 'block', marginBottom: '8px' }}>📝 Notes:</span>
                  <p style={{ margin: 0, color: NAVY, fontSize: '14px', lineHeight: '1.6' }}>{session.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Video Meeting Link */}
          {session.meeting_link && (
            <div style={{ marginBottom: '28px', paddingBottom: '24px', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 12px 0', color: NAVY }}>📹 Meeting Link</h3>
              <div style={{ 
                background: '#eff6ff', 
                padding: '16px', 
                borderRadius: '12px', 
                border: '1px solid #bfdbfe',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px'
              }}>
                <a 
                  href={session.meeting_link} 
                  target="_blank" 
                  rel="noreferrer"
                  style={{ 
                    color: NAVY, 
                    textDecoration: 'none',
                    fontWeight: '600',
                    wordBreak: 'break-all',
                    flex: 1
                  }}
                >
                  Join Video Meeting →
                </a>
              </div>
              <p style={{ fontSize: '12px', color: GRAY, margin: '8px 0 0 0' }}>Click the link to join the video consultation</p>
            </div>
          )}

          {/* Time Info */}
          {session.started_at && session.ended_at && (
            <div style={{ marginBottom: '28px', paddingBottom: '24px', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 12px 0', color: NAVY }}>Session Timeline</h3>
              <div style={{ display: 'grid', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: GRAY }}>Started:</span>
                  <span style={{ fontWeight: '600' }}>{new Date(session.started_at).toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: GRAY }}>Ended:</span>
                  <span style={{ fontWeight: '600' }}>{new Date(session.ended_at).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          )}

          {/* Instant Service Badge */}
          {session.instant_service && (
            <div style={{ 
              background: '#fef3c7', 
              border: '1px solid #fcd34d',
              padding: '12px 16px', 
              borderRadius: '12px',
              color: '#92400e',
              marginBottom: '24px',
              fontSize: '14px'
            }}>
              ⚡ <strong>Instant 24-hour consultation</strong> - Meeting link was created instantly and shared
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {session.meeting_link && session.status === 'scheduled' && (
              <a 
                href={session.meeting_link} 
                target="_blank" 
                rel="noreferrer"
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  background: GOLD,
                  color: NAVY,
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  textAlign: 'center',
                  minWidth: '150px'
                }}
              >
                Join Meeting
              </a>
            )}
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                flex: 1,
                padding: '12px 20px',
                background: NAVY,
                color: WHITE,
                border: 'none',
                borderRadius: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                minWidth: '150px'
              }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
