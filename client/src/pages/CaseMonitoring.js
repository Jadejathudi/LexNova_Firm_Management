import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PublicNavbar from '../components/PublicNavbar';

const NAVY = '#1C2A40', GOLD = '#3D6FB0', BG = '#F5F5F1', GRAY = '#5E6577';
const GRAD = 'linear-gradient(135deg, #3D6FB0, #2E8E86)';

const NUDGES = [
  { icon: '⚖', title: 'Hearing Tomorrow', desc: 'Matter CC-2025-00421 scheduled at Hyderabad City Civil Court, 10:30 AM. Advocate has been notified.', time: 'Tomorrow', color: '#1D4ED8', bg: '#EFF6FF' },
  { icon: '📄', title: 'Written Statement Due', desc: 'Written statement deadline in CC-2025-00038 is in 5 days. File promptly to avoid adverse inference.', time: '5 days', color: '#D97706', bg: '#FFFBEB' },
  { icon: '💬', title: 'Advocate Message', desc: 'Adv. Venkata Subramaniam replied to your gap alert about the delivery challan evidence.', time: '2 hours ago', color: '#15803D', bg: '#F0FDF4' },
  { icon: '✅', title: 'Document Verified', desc: 'Your Aadhaar and property deed have been verified for matter CC-2025-00035.', time: 'Yesterday', color: '#7C3AED', bg: '#F5F3FF' },
];

const SCHEDULED_NUDGES = [
  { date: 'May 14 · 9:00 AM', msg: '7-day hearing reminder sent to advocate', status: 'Scheduled' },
  { date: 'May 19 · 9:00 AM', msg: '2-day hearing reminder sent to advocate', status: 'Scheduled' },
  { date: 'May 21 · 8:00 AM', msg: 'Morning-of hearing reminder', status: 'Scheduled' },
];

export default function CaseMonitoring() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const dashPath = user ? (user.role === 'client' ? '/dashboard' : '/crm') : '/login';

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", background: BG, minHeight: '100vh' }}>
      <PublicNavbar />

      {/* Header */}
      <div style={{ background: '#121C2C', padding: '40px 48px 28px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <span style={{ fontSize: '28px' }}>🔔</span>
            <h1 style={{ color: '#fff', fontFamily: "'Space Grotesk', sans-serif", fontSize: '30px', fontWeight: 700, margin: 0 }}>Case Monitoring & Nudges</h1>
          </div>
          <p style={{ color: 'rgba(255,255,255,.5)', fontSize: '14px' }}>ClearCase sends automated reminders to you and your advocate before every hearing. We follow up on your behalf — so nothing falls through the cracks.</p>
        </div>
      </div>

      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '28px 24px' }}>
        {!user ? (
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '48px 24px', textAlign: 'center' }}>
            <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>🔒</span>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: NAVY, marginBottom: '8px', fontFamily: "'Space Grotesk', sans-serif" }}>Sign in to view your nudges</h3>
            <p style={{ color: GRAY, fontSize: '14px', lineHeight: 1.7, marginBottom: '24px', maxWidth: '360px', margin: '0 auto 24px' }}>Case monitoring is personalized to your active matters and consultation schedule.</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={() => navigate('/login')} style={{ padding: '12px 28px', background: NAVY, color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>Sign In</button>
              <button onClick={() => navigate('/register')} style={{ padding: '12px 28px', background: 'transparent', color: NAVY, border: `2px solid ${NAVY}`, borderRadius: '10px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>Register</button>
            </div>
          </div>
        ) : (
          <>
            {/* How it works */}
            <div style={{ background: 'linear-gradient(135deg,#1C2A40,#2A4F85)', borderRadius: '16px', padding: '22px', marginBottom: '20px' }}>
              <div style={{ color: '#fff', fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>🔔 How follow-ups work</div>
              <p style={{ color: 'rgba(255,255,255,.65)', fontSize: '13px', lineHeight: 1.7, margin: 0 }}>ClearCase automatically sends reminders to your advocate at key moments — 7 days before a hearing, 2 days before, and the morning of. We also follow up if a gap alert you raised hasn't been acknowledged. You are notified of every action taken.</p>
            </div>

            {/* Recent nudges */}
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: NAVY, marginBottom: '14px' }}>Recent Activity</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {NUDGES.map((n, i) => (
                <div key={i} style={{ background: n.bg, border: `1px solid ${n.color}25`, borderRadius: '14px', padding: '18px 20px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${n.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>{n.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '3px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: NAVY }}>{n.title}</span>
                      <span style={{ fontSize: '11px', color: GRAY }}>{n.time}</span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#334155', margin: 0, lineHeight: 1.6 }}>{n.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Upcoming scheduled nudges */}
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '20px', marginBottom: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: NAVY, marginBottom: '14px' }}>📅 Upcoming Scheduled Nudges</div>
              {SCHEDULED_NUDGES.map((n, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 0', borderBottom: i < SCHEDULED_NUDGES.length - 1 ? '1px solid #F8FAFC' : 'none' }}>
                  <div style={{ background: '#EEF2FF', borderRadius: '7px', padding: '5px 10px', fontSize: '11px', fontWeight: 700, color: NAVY, whiteSpace: 'nowrap' }}>{n.date}</div>
                  <div style={{ flex: 1, fontSize: '13px', color: GRAY }}>{n.msg}</div>
                  <span style={{ fontSize: '11px', fontWeight: 700, borderRadius: '20px', padding: '3px 10px', background: '#F1F5F9', color: GRAY }}>{n.status}</span>
                </div>
              ))}
            </div>

            <button onClick={() => navigate(dashPath)} style={{ width: '100%', padding: '14px', background: NAVY, color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>
              Open Full Dashboard →
            </button>
          </>
        )}
      </div>
    </div>
  );
}
