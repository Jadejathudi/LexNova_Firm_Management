import React from 'react';
import { useNavigate } from 'react-router-dom';
import BenchNav from '../../components/bench/BenchNav';
import { C, STEPS, DISCLAIMER } from './benchConstants';

const STEP_DETAILS = [
  [
    'You browse the directory by court tier and area.',
    'Choose a service — Case Review, Second Opinion, Pre-Hearing Check, or Settlement Assessment.',
    'Fill in your preferred date, time slot, and contact details.',
    'Your session request is submitted and confirmed immediately.',
  ],
  [
    'A member of the ClearCase legal team calls you within 24 hours.',
    'They take structured notes covering: what happened, where the case stands, what documents exist, what you want the judge to address.',
    'This call is not with the judge — it is your intake and preparation call.',
    'The notes are formatted into a structured case brief.',
  ],
  [
    'Your case brief is reviewed internally for completeness.',
    'Sent to the judge at least 24 hours before your session.',
    'The judge reviews your matter in full before the session begins.',
    'You are notified when the judge has confirmed receipt.',
  ],
  [
    'A video or phone call with the retired judge — your choice.',
    'The judge shares their candid judicial perspective on your matter.',
    'Ask questions. Explore scenarios. Get the honest view.',
    'Sessions are typically 30–60 minutes depending on the service.',
  ],
  [
    "A structured summary of the key points from the session is sent to your ClearCase account.",
    'Share the summary with your advocate if you wish.',
    'Use it to make better decisions about your case.',
    'The summary is stored permanently in your case vault.',
  ],
];

export default function BenchHowItWorks() {
  const navigate = useNavigate();

  return (
    <div style={{ fontFamily: "'Jost',sans-serif", background: C.ink, color: C.parchment, minHeight: '100vh' }}>
      <BenchNav />
      <div style={{ background: 'rgba(196,152,42,.06)', borderBottom: `1px solid ${C.borderGold}`, padding: '8px 48px' }}>
        <p style={{ fontSize: 12, color: C.gray, maxWidth: 1100, margin: '0 auto', lineHeight: 1.5 }}>⚖ {DISCLAIMER}</p>
      </div>

      {/* Hero */}
      <div style={{ background: `linear-gradient(180deg,${C.charcoal},${C.ink})`, padding: '72px 80px 56px', textAlign: 'center', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: C.gold, marginBottom: 12 }}>The full process</div>
        <h1 style={{ fontFamily: "'EB Garamond',serif", fontSize: 48, fontWeight: 700, marginBottom: 10 }}>From booking to perspective.</h1>
        <p style={{ fontSize: 16, color: C.grayLight, maxWidth: 520, margin: '0 auto', fontFamily: "'EB Garamond',serif" }}>
          Five steps. Designed so you and the judge arrive prepared — not cold.
        </p>
      </div>

      {/* Steps */}
      <div style={{ background: C.ink, padding: '60px 80px', minHeight: '80vh' }}>
        <div style={{ maxWidth: 780, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 0 }}>
          {STEPS.map((s, i) => {
            const isLast = i === STEPS.length - 1;
            return (
              <div key={i} style={{ display: 'flex', gap: 24 }}>
                {/* Step indicator column */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700,
                    background: i === 0 ? C.gold : C.charcoalMid,
                    border: `2px solid ${i === 0 ? C.gold : C.border}`,
                    color: i === 0 ? C.ink : C.gold,
                  }}>0{i + 1}</div>
                  {!isLast && <div style={{ width: 2, flex: 1, background: `linear-gradient(180deg,${C.gold},rgba(196,152,42,.15))`, minHeight: 60, margin: '8px 0' }} />}
                </div>

                {/* Content */}
                <div style={{ paddingBottom: isLast ? 0 : 44, flex: 1 }}>
                  <h3 style={{ fontFamily: "'EB Garamond',serif", fontSize: 22, fontWeight: 600, color: C.parchment, marginBottom: 10, marginTop: 4 }}>{s.t}</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {STEP_DETAILS[i].map((d, di) => (
                      <div key={di} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.gold, flexShrink: 0, marginTop: 7 }} />
                        <p style={{ fontSize: 14, color: C.grayLight, lineHeight: 1.65, fontFamily: "'EB Garamond',serif" }}>{d}</p>
                      </div>
                    ))}
                  </div>
                  {i === 0 && (
                    <div style={{ background: 'rgba(196,152,42,.06)', border: `1px solid ${C.borderGold}`, borderRadius: 4, padding: 14, marginTop: 16 }}>
                      <p style={{ fontSize: 12, color: C.gold, lineHeight: 1.6 }}>
                        Important: No payment is required upfront — you simply confirm your session preference and our team reaches out within 24 hours to coordinate.
                      </p>
                    </div>
                  )}
                  {i === 1 && (
                    <div style={{ background: C.charcoalMid, borderRadius: 4, padding: 14, marginTop: 16 }}>
                      <p style={{ fontSize: 13, color: C.grayLight, lineHeight: 1.65, fontFamily: "'EB Garamond',serif", fontStyle: 'italic' }}>
                        The intake call is what sets The Bench apart. The judge is never handed a disorganised pile of information. They receive a structured, prepared case brief — and that makes every minute of your session count.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div style={{ maxWidth: 780, margin: '48px auto 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <button onClick={() => navigate('/bench/directory')} style={{ background: C.gold, color: C.ink, border: 'none', borderRadius: 3, padding: 14, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: "'Jost',sans-serif" }}>
            Browse Judges <span style={{ fontSize: '0.7em', opacity: .75 }}>Retd.</span> →
          </button>
          <button onClick={() => navigate('/bench/services')} style={{ background: 'transparent', color: C.gold, border: `1.5px solid ${C.gold}`, borderRadius: 3, padding: 14, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: "'Jost',sans-serif" }}>
            Explore Services
          </button>
        </div>
      </div>
    </div>
  );
}
