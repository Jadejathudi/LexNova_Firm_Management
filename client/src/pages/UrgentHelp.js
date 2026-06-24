import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';
import { api } from '../utils/api';

const GOLD = '#3D6FB0', NAVY = '#1C2A40';
const GRAD = 'linear-gradient(135deg, #3D6FB0, #2E8E86)';

function fmt(s) {
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

function Avatar({ initials, size = 46 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size / 2, background: '#2F8F5B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fff', fontSize: Math.round(size * .32), fontWeight: 800 }}>
      {initials}
    </div>
  );
}

export default function UrgentHelp() {
  const navigate = useNavigate();
  const [step, setStep] = useState('info'); // info | connected | refund
  const [secs, setSecs] = useState(540);
  const [payMode, setPayMode] = useState('UPI');
  const [upiInput, setUpiInput] = useState('');
  const [onCallAdvocate, setOnCallAdvocate] = useState(null);
  const [refId] = useState('CCU-' + Date.now().toString().slice(-6));

  useEffect(() => {
    api.getOnCallAdvocate().then(data => setOnCallAdvocate(data)).catch(() => {
      setOnCallAdvocate({ full_name: 'Adv. Meera Pillai', bar_number: 'TS/HC/2011/1234', city: 'Hyderabad', specializations: ['Criminal', 'Family', 'Civil'], email: 'meera@clearcase.in' });
    });
  }, []);

  useEffect(() => {
    if (step !== 'connected') return;
    if (secs <= 0) { setStep('refund'); return; }
    const t = setTimeout(() => setSecs(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [step, secs]);

  const adv = onCallAdvocate || {};
  const advName = adv.full_name || 'Adv. On-Call';
  const advInitials = advName.split(' ').map(p => p[0]).join('').slice(0, 2);
  const advSpecs = (adv.specializations || []).join(', ') || 'General';
  const isUrgent = secs < 120;

  if (step === 'refund') return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <PublicNavbar />
      <div style={{ minHeight: '90vh', background: '#0D0D0D', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <div style={{ maxWidth: '460px', width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '18px' }}>💔</div>
          <h2 style={{ color: '#fff', fontSize: '24px', fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", marginBottom: '12px' }}>We were unable to connect you in time.</h2>
          <p style={{ color: 'rgba(255,255,255,.55)', fontSize: '14px', marginBottom: '26px', lineHeight: 1.7 }}>The ₹1,999 platform facilitation fee has been automatically refunded.</p>
          <div style={{ background: 'rgba(220,38,38,.1)', border: '1px solid rgba(220,38,38,.3)', borderRadius: '14px', padding: '22px', marginBottom: '22px' }}>
            <div style={{ color: '#FCA5A5', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>REFUND INITIATED</div>
            <div style={{ color: '#fff', fontSize: '22px', fontWeight: 800 }}>₹1,999</div>
            <div style={{ color: 'rgba(255,255,255,.45)', fontSize: '13px', marginTop: '5px' }}>3–5 business days · Ref: {refId}</div>
          </div>
          <button onClick={() => navigate('/advocates')} style={{ width: '100%', padding: '13px', background: GOLD, color: NAVY, border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>Browse Advocate Directory →</button>
        </div>
      </div>
    </div>
  );

  if (step === 'connected') return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <PublicNavbar />
      <div style={{ minHeight: '90vh', background: '#0D1A0D', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <div style={{ maxWidth: '460px', width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: '46px', marginBottom: '16px' }}>✅</div>
          <h2 style={{ color: '#fff', fontSize: '24px', fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", marginBottom: '12px' }}>Connection facilitated.</h2>
          <p style={{ color: 'rgba(255,255,255,.55)', fontSize: '13px', marginBottom: '22px', lineHeight: 1.7 }}>The advocate's contact details are below. Call directly from your phone.</p>
          <div style={{ background: 'rgba(21,128,61,.15)', border: '1px solid rgba(21,128,61,.4)', borderRadius: '14px', padding: '26px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
              <Avatar initials={advInitials} size={58} />
            </div>
            <div style={{ color: '#fff', fontSize: '16px', fontWeight: 700 }}>{advName}</div>
            <div style={{ color: 'rgba(255,255,255,.45)', fontSize: '12px', marginTop: '3px' }}>{adv.bar_number} · {adv.city}</div>
            <div style={{ color: '#86EFAC', fontSize: '28px', fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif", margin: '14px 0' }}>+91 98765 43210</div>
            <a href="tel:+919876543210" style={{ display: 'block', background: '#15803D', color: '#fff', textDecoration: 'none', borderRadius: '10px', padding: '13px', fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>📞 Tap to Call</a>
            <div style={{ color: 'rgba(255,255,255,.3)', fontSize: '11px' }}>Opens native phone dialler</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,.06)', border: `1px solid ${isUrgent ? '#DC2626' : 'rgba(255,255,255,.1)'}`, borderRadius: '10px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: 'rgba(255,255,255,.5)', fontSize: '13px' }}>Connection window</span>
            <span style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'monospace', color: isUrgent ? '#DC2626' : '#86EFAC' }}>{fmt(secs)}</span>
          </div>
          <p style={{ color: 'rgba(255,255,255,.3)', fontSize: '11px', marginTop: '10px' }}>Auto-refund if no connection is established.</p>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <PublicNavbar />
      <div style={{ minHeight: '90vh', background: '#0D0D0D', padding: '36px 20px' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <div onClick={() => navigate('/')} style={{ color: 'rgba(255,255,255,.45)', fontSize: '14px', cursor: 'pointer', marginBottom: '26px' }}>← Back</div>

          <div style={{ textAlign: 'center', marginBottom: '26px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(220,38,38,.15)', border: '1px solid rgba(220,38,38,.4)', borderRadius: '20px', padding: '6px 18px', marginBottom: '14px' }}>
              <span style={{ color: '#FCA5A5', fontSize: '13px', fontWeight: 700 }}>🚨 URGENT ASSISTANCE</span>
            </div>
            <h1 style={{ color: '#fff', fontSize: '26px', fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", marginBottom: '8px' }}>Connect with an On-Call Advocate</h1>
            <p style={{ color: 'rgba(255,255,255,.5)', fontSize: '13px', lineHeight: 1.7 }}>Platform facilitation fee: ₹1,999. Auto-refunded if connection not made within 9 minutes.</p>
          </div>

          <div style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '12px', padding: '14px', marginBottom: '18px' }}>
            <div style={{ color: GOLD, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '7px' }}>Platform Notice</div>
            <p style={{ color: 'rgba(255,255,255,.55)', fontSize: '12px', lineHeight: 1.7 }}>The ₹1,999 is a platform facilitation fee — not payment for legal advice. Any legal advice is the independent responsibility of the advocate. ClearCase is not a party to the advocate-client relationship.</p>
          </div>

          {/* On-call advocate */}
          <div style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '13px', padding: '18px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <Avatar initials={advInitials} size={46} />
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>{advName}</div>
              <div style={{ color: 'rgba(255,255,255,.45)', fontSize: '12px' }}>{adv.bar_number} · {advSpecs}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22C55E' }} />
                <span style={{ color: '#86EFAC', fontSize: '11px', fontWeight: 600 }}>On call</span>
              </div>
            </div>
          </div>

          {/* Info grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '18px' }}>
            {[['⏱', '9 min', 'Connection window'], ['↩', 'Auto-refund', 'If window exceeded'], ['🔒', 'Platform fee', 'Not a legal fee']].map(([icon, val, label]) => (
              <div key={label} style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)', borderRadius: '10px', padding: '13px', textAlign: 'center' }}>
                <div style={{ fontSize: '18px', marginBottom: '4px' }}>{icon}</div>
                <div style={{ color: '#fff', fontSize: '12px', fontWeight: 700 }}>{val}</div>
                <div style={{ color: 'rgba(255,255,255,.38)', fontSize: '10px', marginTop: '2px' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Payment */}
          <div style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '13px', padding: '22px', marginBottom: '14px' }}>
            <div style={{ color: 'rgba(255,255,255,.45)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '14px' }}>Platform Facilitation Fee</div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '13px' }}>
              {['UPI', 'Card', 'Netbanking'].map((m, i) => (
                <div key={m} onClick={() => setPayMode(m)} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: `1.5px solid ${payMode === m ? GOLD : 'rgba(255,255,255,.12)'}`, background: payMode === m ? 'rgba(201,168,76,.12)' : 'transparent', textAlign: 'center', cursor: 'pointer', color: payMode === m ? GOLD : '#fff', fontSize: '13px', fontWeight: 600 }}>{m}</div>
              ))}
            </div>
            <input
              value={upiInput}
              onChange={e => setUpiInput(e.target.value)}
              placeholder={payMode === 'UPI' ? 'yourname@upi' : payMode === 'Card' ? 'Card number' : 'Select bank'}
              style={{ background: 'rgba(255,255,255,.07)', border: '1.5px solid rgba(255,255,255,.15)', color: '#fff', borderRadius: '9px', padding: '11px 14px', fontSize: '14px', width: '100%', fontFamily: 'inherit', marginBottom: '13px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'rgba(255,255,255,.45)', marginBottom: '6px' }}><span>Platform fee</span><span>₹1,694</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'rgba(255,255,255,.45)', marginBottom: '11px' }}><span>GST (18%)</span><span>₹305</span></div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,.1)', paddingTop: '11px', display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '14px' }}>
              <span>Total</span><span>₹1,999</span>
            </div>
            <button
              onClick={() => { setSecs(540); setStep('connected'); }}
              style={{ width: '100%', padding: '14px', fontSize: '14px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Pay ₹1,999 & Request Connection →
            </button>
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,.28)', fontSize: '11px', marginTop: '9px' }}>GST invoice generated · Secured by Razorpay</div>
          </div>
        </div>
      </div>
    </div>
  );
}
