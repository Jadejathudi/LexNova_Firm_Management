import React, { useState, useEffect } from 'react';
import Logo from './Logo';

const NAVY = '#1C2A40';
const GRAD = 'linear-gradient(135deg, #3D6FB0, #2E8E86)';

export default function BCIDisclaimer() {
  const [visible, setVisible] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem('cc_disc')) setVisible(true);
  }, []);

  const accept = () => {
    sessionStorage.setItem('cc_disc', '1');
    setVisible(false);
  };

  if (!visible) return null;

  const points = [
    'You are visiting this website of your own accord. No advertisement, solicitation, or inducement has been made to you.',
    'ClearCase is a legal technology platform — not a law firm. It does not provide legal advice or represent clients.',
    'Advocates listed here are independently enrolled with their State Bar Council and maintain independent practices.',
    'ClearCase does not rank, rate, or recommend any advocate. Listings are informational only.',
    'Any legal advice or engagement is exclusively between you and the advocate you choose to contact.',
    'Advocate information is self-declared. Enrollment numbers are independently verified.',
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,14,30,.92)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: '18px', maxWidth: '580px', width: '100%', borderTop: `5px solid ${NAVY}`, boxShadow: '0 32px 80px rgba(0,0,0,.4)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ overflowY: 'auto', padding: '32px 32px 0', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: GRAD, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Logo size={28} />
            </div>
            <div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '22px', fontWeight: 700, color: NAVY }}>ClearCase</div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>Legal Technology Platform · clearcase.in</div>
            </div>
          </div>
          <div style={{ background: '#FFF8E8', borderLeft: '4px solid #D97706', borderRadius: '0 8px 8px 0', padding: '12px 14px', marginBottom: '18px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#92400E', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Required Notice — Bar Council of India</div>
            <div style={{ fontSize: '12px', color: '#92400E', lineHeight: 1.6 }}>Please read before proceeding. As required under Rule 36, BCI Rules & the Advocates Act, 1961.</div>
          </div>
          <div style={{ fontSize: '13px', color: '#374151', lineHeight: 1.85 }}>
            By proceeding, you confirm that:
            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginTop: '12px' }}>
              {points.map((text, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#EEF2FF', color: NAVY, fontSize: '11px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>{i + 1}</div>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ padding: '20px 32px 28px', flexShrink: 0, borderTop: '1px solid #F1F5F9' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '14px' }}>
            <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} style={{ width: '17px', height: '17px', accentColor: NAVY, flexShrink: 0 }} />
            <span style={{ fontSize: '13px', color: '#111827', fontWeight: 500, lineHeight: 1.5 }}>I have read and understood the above. I am visiting ClearCase of my own accord.</span>
          </label>
          <button
            disabled={!checked}
            onClick={accept}
            style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: 700, border: 'none', borderRadius: '10px', cursor: checked ? 'pointer' : 'not-allowed', background: checked ? GRAD : '#E2E8F0', color: checked ? '#fff' : '#94A3B8', transition: 'all .2s', fontFamily: 'inherit' }}
          >
            I Understand — Continue to ClearCase
          </button>
          {!checked && <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '11px', color: '#94A3B8' }}>Tick the checkbox above to continue</div>}
        </div>
      </div>
    </div>
  );
}
