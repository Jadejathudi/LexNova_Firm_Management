import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';

const NAVY = '#1C2A40', GOLD = '#3D6FB0', BG = '#F5F5F1', GRAY = '#5E6577';
const GRAD = 'linear-gradient(135deg, #3D6FB0, #2E8E86)';
const PURPLE = '#7C3AED';

const AREAS = ['Criminal', 'Civil', 'Consumer'];

const MOCK = {
  Criminal: {
    precedents: [
      { case: 'State of AP v. Ramaiah (2021)', court: 'AP High Court', outcome: 'Acquittal — inconsistent witness testimony' },
      { case: 'Krishnamurthy v. State (2022)', court: 'Telangana HC', outcome: 'Bail granted — no prior antecedents' },
    ],
    keyPoints: [
      'Witness credibility is decisive — inconsistencies in FIR vs. testimony often determine outcome',
      'Bail applications succeed when: no prior record, roots in community, cooperation with investigation',
      'Charge sheet delay beyond 60/90 days (CrPC 167) entitles bail as of right',
    ],
    crossExam: [
      'Establish when witness first reported the incident vs. FIR date',
      'Ask if witness knew accused before the alleged incident',
      'Confirm exact position of witness at time of alleged offence',
    ],
    patterns: [
      'Telangana HC Bench B: scrutinises delay in filing charge sheets carefully',
      'Sessions Court: 78% bail granted in first hearing for bailable offences',
      'AP HC: avg 42 days for anticipatory bail disposal under Sec 438 CrPC',
    ],
  },
  Civil: {
    precedents: [
      { case: 'Reddy v. State Housing Board (2023)', court: 'Telangana HC', outcome: 'Decree in favour — clear title documents' },
      { case: 'Rao Properties v. Municipal Corp (2022)', court: 'AP HC', outcome: 'Injunction granted — possession maintained' },
    ],
    keyPoints: [
      'Clear chain of title documents from original seller to current owner is the strongest evidence',
      'Mutation records (Pahani/ROR) + tax receipts establish long possession',
      'Courts look for unbroken possession — any gaps are used by opposite party',
    ],
    crossExam: [
      'Ask when opposite party last physically occupied the property',
      'Confirm whether opposite party paid any property tax receipts',
      'Establish if any encroachments were reported to authorities',
    ],
    patterns: [
      'Civil courts prioritise documentary evidence over oral testimony in property disputes',
      'Property suits: avg 3.2 years to decree in district courts',
      '60% suits settled at mediation stage (Lok Adalat)',
    ],
  },
  Consumer: {
    precedents: [
      { case: 'Sharma v. Builder Co. (NCDRC 2023)', court: 'NCDRC', outcome: 'Full refund + ₹2L compensation — delayed possession' },
      { case: 'Venkat v. LIC of India (2022)', court: 'AP SCDRC', outcome: 'Claim allowed — deficiency in service proved' },
    ],
    keyPoints: [
      'Deficiency in service requires proving: promise made, service not delivered, loss suffered',
      'Consumer forums are consumer-friendly — complainant\'s burden of proof is relatively low',
      'Keep all written communications, emails, and receipts — they are primary evidence',
    ],
    crossExam: [
      'Confirm the exact delivery/service date promised in writing',
      'Establish that complaint was made to opposite party and ignored',
      'Ask for documentary proof of any alleged performance by opposite party',
    ],
    patterns: [
      'Consumer forums routinely award compensation beyond claim amount for mental agony',
      'District forums: median disposal 8 months for straightforward complaints',
      'E-commerce disputes: 92% settled within 30 days with mediation',
    ],
  },
};

const TABS = [
  ['precedents', '📜 Precedents'],
  ['keypoints', '💡 Key Points'],
  ['crossexam', '⚖ Cross-Exam'],
  ['patterns', '📊 Court Patterns'],
];

export default function CaseIntelligence() {
  const navigate = useNavigate();
  const [area, setArea] = useState('Criminal');
  const [tab, setTab] = useState('precedents');
  const data = MOCK[area] || MOCK.Criminal;

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", background: BG, minHeight: '100vh' }}>
      <PublicNavbar />

      {/* Header */}
      <div style={{ background: '#121C2C', padding: '48px 48px 20px', textAlign: 'center' }}>
        <div style={{ color: '#7FBDE8', fontSize: '11px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: '10px', fontFamily: "'JetBrains Mono', monospace" }}>Powered by public court records</div>
        <h1 style={{ color: '#fff', fontFamily: "'Space Grotesk', sans-serif", fontSize: '38px', fontWeight: 700, marginBottom: '10px' }}>Case Intelligence</h1>
        <p style={{ color: 'rgba(255,255,255,.55)', fontSize: '15px', maxWidth: '520px', margin: '0 auto 24px' }}>AI-powered insights from thousands of similar cases across Telangana and Andhra Pradesh courts.</p>

        {/* Area selector */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', paddingBottom: '20px' }}>
          {AREAS.map(a => (
            <div key={a} onClick={() => setArea(a)} style={{ background: area === a ? GOLD : 'rgba(255,255,255,.1)', color: area === a ? NAVY : '#fff', borderRadius: '20px', padding: '8px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all .2s' }}>{a}</div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 48px' }}>
        <div style={{ background: '#EAF1F8', borderLeft: '3px solid #3D6FB0', borderRadius: '0 8px 8px 0', padding: '10px 16px', marginBottom: '28px' }}>
          <p style={{ fontSize: '12px', color: '#2A547F', lineHeight: 1.6, margin: 0 }}>All insights are drawn from publicly available court judgements (eCourts, Indian Kanoon). This is informational research only — not legal advice. Use this to be better prepared for your conversations with your advocate.</p>
        </div>

        {/* Tab selector */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
          {TABS.map(([id, label]) => (
            <div key={id} onClick={() => setTab(id)} style={{ padding: '9px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: tab === id ? NAVY : '#fff', color: tab === id ? '#fff' : GRAY, border: `1.5px solid ${tab === id ? NAVY : '#E2E8F0'}`, transition: 'all .15s' }}>{label}</div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Left panel */}
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '26px' }}>
            {tab === 'precedents' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>📜</div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: NAVY }}>Similar Precedents Found</div>
                    <div style={{ fontSize: '12px', color: GRAY }}>Public court records · {area} matters</div>
                  </div>
                </div>
                {data.precedents.map((p, i) => (
                  <div key={i} style={{ border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px', marginBottom: '10px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: NAVY, marginBottom: '4px' }}>{p.case}</div>
                    <div style={{ fontSize: '12px', color: GRAY, marginBottom: '6px' }}>📍 {p.court}</div>
                    <div style={{ fontSize: '12px', background: '#DCFCE7', color: '#15803D', borderRadius: '6px', padding: '5px 10px', display: 'inline-block', fontWeight: 600 }}>✓ {p.outcome}</div>
                  </div>
                ))}
                <button onClick={() => navigate('/case-library')} style={{ width: '100%', marginTop: '6px', padding: '10px', background: 'transparent', border: `1.5px solid ${NAVY}`, borderRadius: '9px', color: NAVY, fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>Browse Full Case Library →</button>
              </>
            )}
            {tab === 'keypoints' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#FFF8E8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>💡</div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: NAVY }}>What Courts Look For</div>
                    <div style={{ fontSize: '12px', color: GRAY }}>Key factors in {area} cases</div>
                  </div>
                </div>
                {data.keyPoints.map((k, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: GRAD, color: '#fff', fontSize: '11px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>{i + 1}</div>
                    <p style={{ fontSize: '13px', color: '#1E293B', lineHeight: 1.65, margin: 0 }}>{k}</p>
                  </div>
                ))}
              </>
            )}
            {tab === 'crossexam' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${PURPLE}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>⚖</div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: NAVY }}>Suggested Cross-Examination Angles</div>
                    <div style={{ fontSize: '12px', color: GRAY }}>From similar {area} cases</div>
                  </div>
                </div>
                {data.crossExam.map((q, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '10px', background: `${PURPLE}10`, borderRadius: '8px', marginBottom: '8px' }}>
                    <span style={{ color: PURPLE, fontSize: '14px', flexShrink: 0 }}>→</span>
                    <p style={{ fontSize: '13px', color: '#1E293B', lineHeight: 1.55, margin: 0 }}>{q}</p>
                  </div>
                ))}
                <div style={{ marginTop: '14px', borderTop: '1px solid #F1F5F9', paddingTop: '14px' }}>
                  <button onClick={() => navigate('/case-strategy')} style={{ width: '100%', padding: '10px', background: NAVY, color: '#fff', border: 'none', borderRadius: '9px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>Send to Case Strategy Tools →</button>
                </div>
              </>
            )}
            {tab === 'patterns' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>📊</div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: NAVY }}>Court Patterns Observed</div>
                    <div style={{ fontSize: '12px', color: GRAY }}>From public judgement analysis</div>
                  </div>
                </div>
                <div style={{ background: '#DCFCE7', borderRadius: '10px', padding: '16px', marginBottom: '14px' }}>
                  <div style={{ fontSize: '13px', color: '#15803D', fontWeight: 600, marginBottom: '8px' }}>Patterns identified in public records:</div>
                  {data.patterns.map((pat, i) => (
                    <p key={i} style={{ fontSize: '13px', color: '#1E293B', lineHeight: 1.65, margin: '0 0 6px' }}>• {pat}</p>
                  ))}
                </div>
                <div style={{ background: '#FFF8E8', borderRadius: '8px', padding: '12px' }}>
                  <p style={{ fontSize: '12px', color: '#92400E', lineHeight: 1.6, margin: 0 }}>⚠ Based on publicly available judgements. Your specific case may differ. Always discuss with your advocate.</p>
                </div>
              </>
            )}
          </div>

          {/* Right panel — CTA */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '26px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${PURPLE}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>✏️</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: NAVY }}>Build Your Case Strategy</div>
              </div>
              <p style={{ fontSize: '13px', color: GRAY, lineHeight: 1.7, marginBottom: '14px' }}>Use these insights to prepare cross-examination questions, flag gaps, and build your argument notes — all in one place.</p>
              <button onClick={() => navigate('/case-strategy')} style={{ width: '100%', padding: '11px', background: NAVY, color: '#fff', border: 'none', borderRadius: '9px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>Open Case Strategy Tools →</button>
            </div>

            <div style={{ background: '#1C2A40', borderRadius: '16px', padding: '26px', border: '1px solid rgba(61,111,176,.2)' }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>Search the Case Library</div>
              <p style={{ color: 'rgba(255,255,255,.58)', fontSize: '14px', marginBottom: '18px', lineHeight: 1.7 }}>Browse similar cases by keywords, court, year, or outcome. Own your case completely.</p>
              <button onClick={() => navigate('/case-library')} style={{ padding: '12px 24px', background: GRAD, color: '#fff', border: 'none', borderRadius: '9px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>Open Case Library →</button>
            </div>

            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: `${PURPLE}15`, border: `1px solid ${PURPLE}40`, borderRadius: '20px', padding: '4px 14px', marginBottom: '10px' }}>
                <span style={{ color: PURPLE, fontSize: '11px', fontWeight: 700 }}>⚡ BETA</span>
              </div>
              <p style={{ fontSize: '12px', color: GRAY, lineHeight: 1.7, margin: 0 }}>AI-generated content is for research assistance only. All legal strategy decisions must be made by a qualified, enrolled advocate. ClearCase does not provide legal advice.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
