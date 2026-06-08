import React from 'react';
import { useNavigate } from 'react-router-dom';
import BenchNav from '../../components/bench/BenchNav';
import { C, SERVICES, DISCLAIMER } from './benchConstants';

export default function BenchServices() {
  const navigate = useNavigate();

  return (
    <div style={{ fontFamily: "'Jost',sans-serif", background: C.ink, color: C.parchment, minHeight: '100vh' }}>
      <BenchNav />
      <div style={{ background: 'rgba(196,152,42,.06)', borderBottom: `1px solid ${C.borderGold}`, padding: '8px 48px' }}>
        <p style={{ fontSize: 12, color: C.gray, maxWidth: 1100, margin: '0 auto', lineHeight: 1.5 }}>⚖ {DISCLAIMER}</p>
      </div>

      {/* Hero */}
      <div style={{ background: `linear-gradient(180deg,${C.charcoal},${C.ink})`, padding: '72px 80px 56px', textAlign: 'center', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: C.gold, marginBottom: 12 }}>What you can ask for</div>
        <h1 style={{ fontFamily: "'EB Garamond',serif", fontSize: 48, fontWeight: 700, marginBottom: 10 }}>Four services. One source.</h1>
        <p style={{ fontSize: 15, color: C.grayLight, maxWidth: 520, margin: '0 auto', fontFamily: "'EB Garamond',serif" }}>
          Every service is a different lens. All powered by decades of real judicial experience. Choose the one that fits your situation.
        </p>
      </div>

      {/* Services list */}
      <div style={{ background: C.ink, padding: '56px 80px', minHeight: '80vh' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {SERVICES.map((s, i) => (
            <div key={s.id} style={{
              background: C.charcoal, border: `1px solid ${i === 0 ? C.gold : C.border}`,
              borderRadius: 4, padding: 32,
              display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 24, alignItems: 'center',
              background: i === 0 ? `linear-gradient(135deg,${C.charcoal},rgba(196,152,42,.05))` : C.charcoal,
            }}>
              <div style={{ fontSize: 40 }}>{s.icon}</div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                  <h3 style={{ fontFamily: "'EB Garamond',serif", fontSize: 24, fontWeight: 600, color: C.parchment }}>{s.name}</h3>
                  {i === 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 2, padding: '3px 9px', background: 'rgba(196,152,42,.15)', color: C.gold, border: `1px solid ${C.borderGold}` }}>Most chosen</span>
                  )}
                </div>
                <p style={{ fontSize: 14, color: C.grayLight, lineHeight: 1.75, marginBottom: 12, fontFamily: "'EB Garamond',serif" }}>{s.desc}</p>
                <span style={{ fontSize: 12, color: C.gray }}>⏱ {s.dur}</span>
              </div>
              <button
                onClick={() => navigate('/bench/directory', { state: { serviceId: s.id } })}
                style={{ whiteSpace: 'nowrap', flexShrink: 0, background: 'transparent', color: C.gold, border: `1.5px solid ${C.gold}`, borderRadius: 3, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Jost',sans-serif" }}
              >Choose &amp; Book →</button>
            </div>
          ))}
        </div>

        {/* Not sure note */}
        <div style={{ maxWidth: 900, margin: '32px auto 0' }}>
          <div style={{ background: 'rgba(196,152,42,.05)', border: `1px solid ${C.borderGold}`, borderRadius: 4, padding: 20 }}>
            <p style={{ fontSize: 13, color: C.grayLight, lineHeight: 1.7, fontFamily: "'EB Garamond',serif", textAlign: 'center', fontStyle: 'italic' }}>
              Not sure which service to choose? Select Case Review — the judge will guide the session in the direction most useful for your matter. You may also note your question when booking and the intake team will help you decide.
            </p>
          </div>
        </div>

        {/* How it works teaser */}
        <div style={{ maxWidth: 900, margin: '32px auto 0', textAlign: 'center' }}>
          <p style={{ color: C.gray, fontSize: 13, marginBottom: 14 }}>Every service follows the same structured five-step process.</p>
          <button onClick={() => navigate('/bench/how-it-works')} style={{ background: 'transparent', color: C.gold, border: `1.5px solid ${C.gold}`, borderRadius: 3, padding: '10px 28px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Jost',sans-serif" }}>
            See How It Works →
          </button>
        </div>
      </div>
    </div>
  );
}
