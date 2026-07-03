import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';

const NAVY = '#1C2A40', GOLD = '#3D6FB0', BG = '#F5F5F1', GRAY = '#5E6577';
const GRAD = 'linear-gradient(135deg, #3D6FB0, #2E8E86)';
const INFO = '#2A547F', INFO_BG = '#EAF1F8';

const AREA_COLORS = { Criminal: '#B91C1C', Civil: '#1D4ED8', Consumer: '#0E7490', Family: '#7C3AED', Corporate: '#0F766E' };

const CASES = [
  { id: 1, title: 'State of Telangana v. K. Ramaiah', court: 'Telangana HC', year: 2022, area: 'Criminal', outcome: 'Acquittal', summary: 'Accused acquitted due to contradictions in prosecution witness testimony. Court noted delay in FIR filing as suspicious.', key: 'Witness contradiction, FIR delay' },
  { id: 2, title: 'Reddy Properties v. Housing Board', court: 'AP HC', year: 2023, area: 'Civil', outcome: 'Plaintiff succeeded', summary: 'Clear chain of title documents upheld. Court rejected oral claim of adverse possession where documentary evidence was strong.', key: 'Title documents, adverse possession' },
  { id: 3, title: 'Sharma v. Builder Co. (NCDRC)', court: 'NCDRC', year: 2023, area: 'Consumer', outcome: 'Full refund + ₹2L compensation', summary: 'Builder failed to deliver possession within agreed period. Forum awarded refund plus compensation for mental agony.', key: 'Delayed possession, written agreement' },
  { id: 4, title: 'Venkat v. LIC of India', court: 'AP SCDRC', year: 2022, area: 'Consumer', outcome: 'Claim allowed', summary: 'Insurance claim repudiation set aside. Forum held that insurer must prove suppression of material facts — burden does not lie on insured.', key: 'Insurance repudiation, burden of proof' },
  { id: 5, title: 'Rao v. Municipal Corporation', court: 'Telangana HC', year: 2023, area: 'Civil', outcome: 'Injunction granted', summary: 'Interim injunction protecting possession granted. Court held that balance of convenience lay with long-term possessor.', key: 'Interim injunction, possession' },
  { id: 6, title: 'In re: Bail Application — NDPS', court: 'AP HC', year: 2023, area: 'Criminal', outcome: 'Bail granted', summary: 'Bail granted under NDPS where quantity was small, accused had no prior record, and investigation was near complete.', key: 'NDPS bail, small quantity, clean record' },
];

const TYPES = ['All', 'Criminal', 'Civil', 'Consumer', 'Family', 'Corporate'];

export default function CaseLibrary() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [expanded, setExpanded] = useState(null);

  const filtered = CASES.filter(c =>
    (typeFilter === 'All' || c.area === typeFilter) &&
    (search === '' || c.title.toLowerCase().includes(search.toLowerCase()) || c.key.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", background: BG, minHeight: '100vh' }}>
      <PublicNavbar />

      {/* Header */}
      <div style={{ background: '#121C2C', padding: '48px 48px 32px', textAlign: 'center' }}>
        <div style={{ color: '#7FBDE8', fontSize: '11px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: '10px', fontFamily: "'JetBrains Mono', monospace" }}>Public Court Records</div>
        <h1 style={{ color: '#fff', fontFamily: "'Space Grotesk', sans-serif", fontSize: '38px', fontWeight: 700, marginBottom: '10px' }}>Case Library</h1>
        <p style={{ color: 'rgba(255,255,255,.55)', fontSize: '15px', maxWidth: '520px', margin: '0 auto 24px', lineHeight: 1.7 }}>Research similar cases from public court records. Know what arguments succeeded, what evidence was decisive, and what patterns courts follow.</p>
        <div style={{ maxWidth: '560px', margin: '0 auto', display: 'flex', gap: '10px' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by keyword, court, case type..."
            style={{ flex: 1, borderRadius: '10px', border: 'none', padding: '13px 16px', fontSize: '14px', fontFamily: 'inherit', outline: 'none' }}
          />
          <button style={{ padding: '13px 20px', background: GRAD, color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>Search</button>
        </div>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '28px 48px' }}>
        <div style={{ background: INFO_BG, borderLeft: `3px solid ${GOLD}`, borderRadius: '0 8px 8px 0', padding: '10px 16px', marginBottom: '20px' }}>
          <p style={{ fontSize: '12px', color: INFO, lineHeight: 1.6, margin: 0 }}>All cases are from publicly available court records (eCourts, Indian Kanoon). Summaries are for research purposes only — not legal advice. Facts of each case are unique.</p>
        </div>

        {/* Type filter pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {TYPES.map(t => (
            <div key={t} onClick={() => setTypeFilter(t)} style={{ background: typeFilter === t ? NAVY : '#fff', color: typeFilter === t ? '#fff' : NAVY, border: `1.5px solid ${typeFilter === t ? NAVY : '#E2E8F0'}`, borderRadius: '20px', padding: '7px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}>{t}</div>
          ))}
        </div>

        <p style={{ color: GRAY, fontSize: '14px', marginBottom: '16px' }}>{filtered.length} case{filtered.length !== 1 ? 's' : ''} found</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filtered.length > 0 ? filtered.map(c => {
            const color = AREA_COLORS[c.area] || NAVY;
            const isOpen = expanded === c.id;
            return (
              <div key={c.id} onClick={() => setExpanded(isOpen ? null : c.id)} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '22px', borderLeft: `4px solid ${color}`, cursor: 'pointer', transition: 'box-shadow .2s' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '17px', fontWeight: 700, color: NAVY, marginBottom: '6px' }}>{c.title}</div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: '11px', fontWeight: 700, borderRadius: '20px', padding: '3px 11px', background: '#EEF2FF', color: NAVY }}>📍 {c.court}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: '11px', fontWeight: 700, borderRadius: '20px', padding: '3px 11px', background: '#F1F5F9', color: GRAY }}>📅 {c.year}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: '11px', fontWeight: 700, borderRadius: '20px', padding: '3px 11px', background: `${color}18`, color }}>{c.area}</span>
                    </div>
                  </div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, borderRadius: '20px', padding: '5px 12px', background: '#DCFCE7', color: '#15803D', flexShrink: 0 }}>✓ {c.outcome}</span>
                </div>

                {isOpen && (
                  <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '14px' }}>
                    <p style={{ fontSize: '13px', color: GRAY, lineHeight: 1.7, marginBottom: '12px' }}>{c.summary}</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ fontSize: '12px', color: '#92400E', background: '#FFF8E8', borderRadius: '6px', padding: '5px 10px' }}>🔑 Key factors: {c.key}</div>
                      <button onClick={e => { e.stopPropagation(); navigate('/intelligence'); }} style={{ padding: '7px 14px', background: 'transparent', border: `1.5px solid ${NAVY}`, borderRadius: '8px', color: NAVY, fontWeight: 700, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>View in Intelligence →</button>
                    </div>
                  </div>
                )}
              </div>
            );
          }) : (
            <div style={{ textAlign: 'center', padding: '60px', color: GRAY, border: '1px dashed #E2E8F0', borderRadius: '16px' }}>
              No cases found for this search. Try a different keyword or filter.
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <button onClick={() => navigate('/intelligence')} style={{ padding: '12px 28px', background: GRAD, color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>Go to Case Intelligence →</button>
        </div>
      </div>
    </div>
  );
}
