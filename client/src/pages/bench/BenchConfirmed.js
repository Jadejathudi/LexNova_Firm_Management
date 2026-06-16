import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import BenchNav from '../../components/bench/BenchNav';
import { C, TIERS, SERVICES, BenchAvatar, JudgeName, benchFetch } from './benchConstants';
import { useAuth } from '../../context/AuthContext';

function fmt(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default function BenchConfirmed() {
  const navigate = useNavigate();
  const location = useLocation();
  const { ref } = useParams();
  const { user } = useAuth();
  const [fallback, setFallback] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const { booking: stateBooking, judge: stateJudge } = location.state || {};

  // Refreshing the page loses location.state — fall back to fetching by booking ref
  useEffect(() => {
    if (stateBooking || !ref) return;
    benchFetch(`/bookings/ref/${ref}`)
      .then(row => setFallback({
        booking: row,
        judge: { name: row.judge_name, tier: row.tier, city: row.city, initials: row.initials },
      }))
      .catch(() => setNotFound(true));
  }, [stateBooking, ref]);

  const booking = stateBooking || fallback?.booking;
  const judge = stateJudge || fallback?.judge;

  useEffect(() => {
    if (notFound) navigate('/bench');
  }, [notFound, navigate]);

  if (!booking || !judge) return null;

  const t = TIERS[judge.tier] || TIERS.junior;
  const service = SERVICES.find(s => s.id === booking.service_type) || SERVICES[0];

  return (
    <div style={{ fontFamily: "'Jost',sans-serif", background: C.ink, color: C.parchment, minHeight: '100vh' }}>
      <BenchNav />

      <div style={{ maxWidth: 620, margin: '0 auto', padding: '64px 40px' }}>
        {/* Success indicator */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(21,128,61,.15)', border: '2px solid #15803D', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 32 }}>✓</div>
          <h1 style={{ fontFamily: "'EB Garamond',serif", fontSize: 36, fontWeight: 700, color: C.parchment, marginBottom: 10 }}>Session Request Confirmed</h1>
          <p style={{ color: C.grayLight, fontSize: 15, fontFamily: "'EB Garamond',serif", fontStyle: 'italic' }}>
            Your booking has been received. Our team will be in touch within 24 hours.
          </p>
        </div>

        {/* Booking reference */}
        <div style={{ background: 'rgba(196,152,42,.08)', border: `1px solid ${C.borderGold}`, borderRadius: 4, padding: 20, marginBottom: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: C.gold, marginBottom: 8 }}>Booking Reference</div>
          <div style={{ fontFamily: 'monospace', fontSize: 28, fontWeight: 700, color: C.gold, letterSpacing: '.08em' }}>{booking.booking_ref}</div>
          <div style={{ fontSize: 12, color: C.gray, marginTop: 6 }}>Save this reference for your records.</div>
        </div>

        {/* Judge + booking summary */}
        <div style={{ background: C.charcoal, border: `1px solid ${t.border}`, borderRadius: 4, padding: 22, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16 }}>
            <BenchAvatar judge={judge} size={52} />
            <div>
              <div style={{ fontFamily: "'EB Garamond',serif", fontSize: 16, fontWeight: 600, color: C.parchment }}><JudgeName name={judge.name} /></div>
              <div style={{ fontSize: 12, color: C.gray, marginTop: 2 }}>{t.badge} · {judge.city}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              ['Service', `${service.icon} ${service.name}`],
              ['Duration', service.dur],
              ['Preferred Date', fmt(booking.preferred_date)],
              ['Preferred Time', booking.preferred_slot],
              ['Session Format', booking.session_format === 'video' ? '📹 Video Call' : '📞 Phone Call'],
              ['Status', '⏳ Pending intake call'],
            ].map(([label, value]) => (
              <div key={label} style={{ background: C.charcoalMid, borderRadius: 3, padding: '10px 13px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 13, color: C.parchment }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* What happens next */}
        <div style={{ background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 4, padding: 22, marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.parchment, marginBottom: 16 }}>What happens next</div>
          {[
            { step: '01', title: 'Intake call within 24 hours', desc: 'A member of the ClearCase legal team will call you at the number you provided to schedule and conduct your intake session.' },
            { step: '02', title: 'Case brief prepared', desc: 'Your structured notes are prepared and sent to the judge 24 hours before your session.' },
            { step: '03', title: 'Your session with the judge', desc: `Your ${service.name.toLowerCase()} session with ${judge.name.split('(')[0].trim()} at your preferred time.` },
            { step: '04', title: 'Session summary sent to you', desc: "Key points from the judge's perspective are sent to your ClearCase account." },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: i < 3 ? 14 : 0 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: i === 0 ? C.gold : C.charcoalMid, border: `2px solid ${i === 0 ? C.gold : C.border}`, color: i === 0 ? C.ink : C.gold, fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{item.step}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.parchment, marginBottom: 2 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: C.gray, lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Important note */}
        <div style={{ background: 'rgba(196,152,42,.06)', border: `1px solid ${C.borderGold}`, borderRadius: 3, padding: 14, marginBottom: 28 }}>
          <p style={{ fontSize: 13, color: C.gold, lineHeight: 1.6 }}>
            ⚖ Important: Address the judge as "Your Honour" or "Sir / Ma'am" throughout the session. The judge has read your case brief — begin with a brief summary, not a full re-narration.
          </p>
        </div>

        {/* Primary CTA — logged-in users see My Sessions */}
        {user ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={() => navigate('/bench/my-sessions')}
              style={{ width: '100%', background: C.gold, color: C.ink, border: 'none', borderRadius: 3, padding: '14px 0', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: "'Jost',sans-serif" }}>
              View My Sessions →
            </button>
            <button onClick={() => navigate('/matters')}
              style={{ width: '100%', background: 'rgba(196,152,42,.12)', color: C.gold, border: `1px solid ${C.borderGold}`, borderRadius: 3, padding: '12px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Jost',sans-serif" }}>
              📁 View in My Matters
            </button>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button onClick={() => navigate('/bench/directory')}
                style={{ background: 'transparent', color: C.grayLight, border: `1px solid ${C.border}`, borderRadius: 3, padding: '11px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Jost',sans-serif" }}>
                Browse More Judges <span style={{ fontSize: '0.7em', opacity: .75 }}>Retd.</span>
              </button>
              <button onClick={() => navigate('/dashboard')}
                style={{ background: 'transparent', color: C.grayLight, border: `1px solid ${C.border}`, borderRadius: 3, padding: '11px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Jost',sans-serif" }}>
                Back to Dashboard
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <button onClick={() => navigate('/bench/directory')}
              style={{ background: 'transparent', color: C.gold, border: `1.5px solid ${C.gold}`, borderRadius: 3, padding: '13px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Jost',sans-serif" }}>
              Browse More Judges <span style={{ fontSize: '0.7em', opacity: .75 }}>Retd.</span> →
            </button>
            <button onClick={() => navigate('/')}
              style={{ background: 'rgba(255,255,255,.07)', color: C.parchment, border: '1px solid rgba(255,255,255,.12)', borderRadius: 3, padding: '13px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Jost',sans-serif" }}>
              Back to ClearCase
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
