import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';
import Logo from '../components/Logo';
import { api } from '../utils/api';

const BLUE = '#3D6FB0', TEAL = '#2E8E86', INK = '#1C2A40', INK_3 = '#121C2C';
const GRAD = 'linear-gradient(135deg, #3D6FB0, #2E8E86)';
const BG = '#F5F5F1', MUTED = '#5E6577', WHITE = '#FFFFFF';
const INFO = '#2A547F', INFO_BG = '#EAF1F8';
const OK = '#2F8F5B', OK_BG = '#E7F3EC';

const STORIES = [
  { stat: '50M+', sub: 'cases actively before Indian courts' },
  { stat: '24×7', sub: 'case monitoring and follow-up, always on' },
  { stat: '100%', sub: 'advocates enrolled with Bar Council, verified' },
  { stat: '⚖', sub: 'consult retired judges for real judicial perspective' },
];

const SPEC_COLORS = {
  Criminal: '#B91C1C', Civil: '#1D4ED8', Family: '#7C3AED', Corporate: '#0F766E',
  Banking: '#0369A1', 'Real Estate': '#C2410C', Consumer: '#0E7490', Revenue: '#92400E',
};

function SpecBadge({ spec }) {
  const c = SPEC_COLORS[spec] || INK;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: '11px', fontWeight: 700, borderRadius: '20px', padding: '3px 11px', whiteSpace: 'nowrap', background: `${c}18`, color: c }}>
      {spec}
    </span>
  );
}

function AdvocatePreviewCard({ advocate, onBook }) {
  const name = advocate.full_name || advocate.name || 'Advocate';
  const initials = name.split(' ').map(p => p[0]).join('').slice(0, 2);
  const yrs = advocate.experience_years || 0;
  const barNo = advocate.bar_number || '—';
  const available = advocate.is_available;
  const specs = advocate.specializations || [];
  const langs = advocate.languages || [];

  return (
    <div style={{ background: WHITE, borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 2px 10px rgba(0,0,0,.05)', padding: '22px' }}>
      <div style={{ display: 'flex', gap: '13px', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div style={{ width: '50px', height: '50px', borderRadius: '25px', background: GRAD, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fff', fontSize: '16px', fontWeight: 800 }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '17px', fontWeight: 700, color: INK, lineHeight: 1.2 }}>{name}</div>
          <div style={{ fontSize: '12px', color: MUTED, marginTop: '3px' }}>{advocate.city} · {advocate.state} · {yrs} yrs at Bar</div>
          <div style={{ fontSize: '11px', color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace", marginTop: '2px' }}>{barNo}</div>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: '11px', fontWeight: 700, borderRadius: '20px', padding: '3px 11px', whiteSpace: 'nowrap', background: available ? OK_BG : '#F1F5F9', color: available ? OK : MUTED }}>
          {available ? '✓ Available' : '✗ Unavailable'}
        </span>
      </div>
      <div style={{ fontSize: '11px', fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '7px' }}>Handles matters in</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '14px' }}>
        {specs.slice(0, 3).map(s => <SpecBadge key={s} spec={s} />)}
      </div>
      <div style={{ fontSize: '12px', color: MUTED, marginBottom: '14px' }}>🗣 {langs.join(' · ') || 'English'}</div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={() => onBook(advocate, 'profile')} style={{ flex: 1, padding: '9px 8px', fontSize: '13px', background: 'transparent', border: `1.5px solid ${INK}`, borderRadius: '9px', color: INK, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          View Profile
        </button>
        <button onClick={() => onBook(advocate, 'book')} style={{ flex: 1, padding: '9px 8px', fontSize: '13px', background: GRAD, border: 'none', borderRadius: '9px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          Schedule Appointment
        </button>
      </div>
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const [storyIdx, setStoryIdx] = useState(0);
  const [advocates, setAdvocates] = useState([]);

  useEffect(() => {
    const timer = setInterval(() => setStoryIdx(prev => (prev + 1) % STORIES.length), 3800);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    api.getAdvocates({}).then(data => setAdvocates((data || []).slice(0, 3))).catch(() => {});
  }, []);

  const s = STORIES[storyIdx];

  const features = [
    { icon: '🔍', col: INK, t: 'Find & Connect', d: 'Browse Bar Council enrolled advocates by area of practice and location. Schedule appointments directly — video, phone, or in-person at chambers.', path: '/advocates', cta: 'Browse Advocates' },
    { icon: '⚖️', col: '#7C3AED', t: 'Ask a Judge', suffix: 'Retd.', d: 'Get candid judicial perspective from retired judges on your case. Case review, second opinion, pre-hearing readiness, settlement assessment — from the bench.', path: '/bench/directory', cta: 'Explore The Bench' },
    { icon: '🔔', col: TEAL, t: 'Case Monitoring & Nudges', d: 'ClearCase sends automated reminders to you and your advocate before every hearing. We follow up on your behalf — so nothing falls through the cracks.', path: '/dashboard', cta: 'See Dashboard' },
    { icon: '📁', col: '#C2410C', t: 'Evidence Vault', d: 'Upload, annotate, and organise all your case documents in one secure place. Control exactly what your advocate can see — you decide what to share.', path: '/documents', cta: 'View Vault' },
    { icon: '✏️', col: BLUE, t: 'Build Your Case Strategy', d: 'Submit questions for cross-examination, note argument gaps, and flag missing points — directly to your advocate through the platform.', path: '/case-strategy', cta: 'Open Case Tools' },
    { icon: '📚', col: '#15803D', t: 'Public Case Library', d: 'Access similar cases from eCourts and public records. Research outcomes, understand precedents, and own your case from the ground up.', path: '/case-library', cta: 'Search Cases' },
  ];

  const steps = [
    { n: '01', t: 'Find your advocate', d: 'Browse enrolled advocates by area and location. View their qualifications and schedule an appointment.' },
    { n: '02', t: 'Book your appointment', d: 'Choose a date, time, and format — video, phone, or in-person. Upload your documents ahead of the meeting.' },
    { n: '03', t: 'Use the platform tools', d: 'Prepare for hearings using AI insights. Submit questions for cross-examination. Track every development.' },
    { n: '04', t: 'We follow up for you', d: 'ClearCase sends automated nudges to your advocate before every hearing. You are always kept in the loop.' },
  ];

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <PublicNavbar />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div style={{ background: INK_3, padding: '90px 48px 72px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: .04, backgroundImage: 'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize: '32px 32px' }} />
        <div style={{ position: 'absolute', bottom: '-40px', left: '-60px', width: '320px', height: '320px', borderRadius: '50%', background: 'rgba(61,111,176,.12)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '280px', height: '280px', borderRadius: '50%', background: 'rgba(46,142,134,.10)', filter: 'blur(60px)' }} />

        <div style={{ position: 'relative', maxWidth: '820px', margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(61,111,176,.18)', border: '1px solid rgba(61,111,176,.4)', borderRadius: '20px', padding: '6px 18px', marginBottom: '24px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: TEAL, display: 'inline-block' }} />
            <span style={{ color: '#7FBDE8', fontSize: '13px', fontWeight: 600 }}>Now serving Telangana & Andhra Pradesh</span>
          </div>

          <h1 style={{ color: '#fff', fontSize: '56px', lineHeight: 1.1, marginBottom: '20px', fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>
            Take Control of<br />
            <span style={{ background: GRAD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Your Legal Matter.
            </span>
          </h1>

          <p style={{ color: 'rgba(255,255,255,.68)', fontSize: '17px', lineHeight: 1.8, maxWidth: '620px', margin: '0 auto 36px' }}>
            Connect with Bar Council enrolled advocates. Track every step of your case. Get AI-powered insights from real court records. ClearCase puts you in the driving seat.
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '52px' }}>
            <button onClick={() => navigate('/advocates')} style={{ padding: '15px 36px', fontSize: '15px', borderRadius: '10px', background: GRAD, color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 24px -8px rgba(61,111,176,.55)' }}>
              Find an Advocate →
            </button>
            <button onClick={() => navigate('/bench/directory')} style={{ padding: '15px 36px', fontSize: '15px', borderRadius: '10px', background: 'rgba(255,255,255,.08)', color: '#fff', border: '1px solid rgba(255,255,255,.2)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              ⚖ Ask a Judge <span style={{ fontSize: '0.6em', opacity: .75 }}>Retd.</span>
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
            {STORIES.map((_, i) => (
              <div key={i} onClick={() => setStoryIdx(i)} style={{ width: i === storyIdx ? '28px' : '8px', height: '8px', borderRadius: '4px', background: i === storyIdx ? TEAL : 'rgba(255,255,255,.2)', transition: 'all .4s', cursor: 'pointer' }} />
            ))}
          </div>
          <div style={{ padding: '20px 0' }}>
            <div style={{ fontSize: '52px', fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1, background: GRAD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', display: 'inline-block' }}>
              {s.stat}
            </div>
            <div style={{ color: 'rgba(255,255,255,.5)', fontSize: '15px', marginTop: '8px' }}>{s.sub}</div>
          </div>
        </div>
      </div>

      {/* ── Trust bar ─────────────────────────────────────────────────────── */}
      <div style={{ background: INK, padding: '14px 48px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 0 }}>
          {[['⚖', 'BCI Rule 36 Compliant'], ['🏛', 'Bar Council Verified Enrollment'], ['🛡', 'DPDP Act 2023'], ['⚖️', 'The Bench — Retired Judges'], ['🔔', '24×7 Case Monitoring']].map(([icon, text], idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 24px' }}>
              {idx > 0 && <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,.12)', marginRight: '24px' }} />}
              <span style={{ fontSize: '15px' }}>{icon}</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,.78)' }}>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Feature cards ─────────────────────────────────────────────────── */}
      <div style={{ background: WHITE, padding: '80px 48px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: BLUE, marginBottom: '10px', fontFamily: "'JetBrains Mono', monospace" }}>What ClearCase does for you</div>
            <h2 style={{ fontSize: '38px', color: INK, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>Your case. Your control.</h2>
            <p style={{ color: MUTED, fontSize: '16px', marginTop: '12px', maxWidth: '560px', margin: '12px auto 0' }}>Every tool you need to stay informed, stay organised, and never feel left in the dark about your legal matter.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '22px' }}>
            {features.map(f => (
              <div key={f.t} style={{ background: WHITE, borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 2px 10px rgba(0,0,0,.05)', padding: '28px', borderTop: `3px solid ${f.col}` }}>
                <div style={{ fontSize: '32px', marginBottom: '14px' }}>{f.icon}</div>
                <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", color: INK, fontSize: '20px', fontWeight: 700, marginBottom: '10px' }}>
                  {f.t}{f.suffix && <span style={{ fontSize: '0.5em', fontWeight: 700, color: MUTED, marginLeft: '4px' }}>{f.suffix}</span>}
                </h3>
                <p style={{ color: MUTED, fontSize: '14px', lineHeight: 1.75, marginBottom: '18px' }}>{f.d}</p>
                <button onClick={() => navigate(f.path)} style={{ fontSize: '13px', padding: '9px 16px', background: 'transparent', border: `1.5px solid ${INK}`, borderRadius: '9px', color: INK, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {f.cta} →
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Practice Area Verticals ────────────────────────────────────────── */}
      <div style={{ background: BG, padding: '80px 48px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: BLUE, marginBottom: '10px', fontFamily: "'JetBrains Mono', monospace" }}>Practice Areas</div>
            <h2 style={{ fontSize: '38px', color: INK, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>Specialised legal guidance for every situation.</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '22px' }}>
            {[
              { icon: '🏢', col: '#0E7490', title: 'Corporate Law', desc: 'Company formation, shareholder disputes, M&A, NCLT proceedings, and employment contracts handled by verified corporate advocates.', path: '/corporate', cta: 'Explore Corporate →' },
              { icon: '₹', col: '#7C3AED', title: 'Income Tax', desc: 'Scrutiny notices, reassessments, TDS defaults, ITAT appeals — income tax advocates who know the AO, CIT(A), and tribunal process.', path: '/income-tax', cta: 'Explore Income Tax →' },
              { icon: '✈', col: '#0369A1', title: 'Immigration', desc: 'Visa refusals, OCI applications, passport matters, FRRO registration, and citizenship — immigration law handled with precision.', path: '/immigration', cta: 'Explore Immigration →' },
            ].map(v => (
              <div key={v.title} style={{ background: WHITE, borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 2px 10px rgba(0,0,0,.05)', padding: '28px', borderTop: `3px solid ${v.col}` }}>
                <div style={{ fontSize: '36px', marginBottom: '14px' }}>{v.icon}</div>
                <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", color: INK, fontSize: '20px', fontWeight: 700, marginBottom: '10px' }}>{v.title}</h3>
                <p style={{ color: MUTED, fontSize: '14px', lineHeight: 1.75, marginBottom: '18px' }}>{v.desc}</p>
                <button onClick={() => navigate(v.path)} style={{ fontSize: '13px', padding: '9px 16px', background: v.col, border: 'none', borderRadius: '9px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{v.cta}</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <div style={{ background: INK_3, padding: '80px 48px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: .03, backgroundImage: 'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize: '24px 24px' }} />
        <div style={{ maxWidth: '1100px', margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: TEAL, marginBottom: '10px', fontFamily: "'JetBrains Mono', monospace" }}>Simple process</div>
          <h2 style={{ color: '#fff', fontSize: '38px', fontWeight: 700, marginBottom: '12px', fontFamily: "'Space Grotesk', sans-serif" }}>From confused to in control — in minutes.</h2>
          <p style={{ color: 'rgba(255,255,255,.5)', fontSize: '15px', marginBottom: '60px' }}>No more guessing. No more silence. ClearCase keeps you informed at every step.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '32px', textAlign: 'left' }}>
            {steps.map(x => (
              <div key={x.n}>
                <div style={{ color: TEAL, fontSize: '56px', fontWeight: 700, opacity: .35, fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1 }}>{x.n}</div>
                <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: '8px 0 10px', fontFamily: "'Space Grotesk', sans-serif" }}>{x.t}</h3>
                <p style={{ color: 'rgba(255,255,255,.5)', fontSize: '14px', lineHeight: 1.75 }}>{x.d}</p>
              </div>
            ))}
          </div>
          <button onClick={() => navigate('/register')} style={{ marginTop: '52px', padding: '15px 48px', fontSize: '15px', background: GRAD, color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 24px -8px rgba(61,111,176,.5)' }}>
            Get Started — It's Free →
          </button>
        </div>
      </div>

      {/* ── Advocate preview ──────────────────────────────────────────────── */}
      <div style={{ background: BG, padding: '80px 48px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: BLUE, marginBottom: '10px', fontFamily: "'JetBrains Mono', monospace" }}>Advocate Directory</div>
            <h2 style={{ fontSize: '38px', color: INK, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>Bar Council Enrolled Advocates</h2>
          </div>
          <div style={{ background: INFO_BG, borderLeft: `3px solid ${BLUE}`, borderRadius: '0 8px 8px 0', padding: '10px 16px', maxWidth: '760px', margin: '16px auto 28px' }}>
            <p style={{ fontSize: '12px', color: INFO, lineHeight: 1.6 }}>Listings are for informational purposes. ClearCase does not rank or recommend advocates. Information is self-declared by each advocate.</p>
          </div>
          {advocates.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
              {advocates.map(a => (
                <AdvocatePreviewCard
                  key={a.advocate_id}
                  advocate={a}
                  onBook={(adv, action) => navigate(action === 'book' ? `/book?advocateId=${adv.advocate_id}` : `/advocates/${adv.advocate_id}`)}
                />
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ background: WHITE, borderRadius: '16px', border: '1px solid #E2E8F0', padding: '22px', minHeight: '200px', animation: 'pulse 1.5s ease infinite' }}>
                  <div style={{ height: '50px', background: '#F1F5F9', borderRadius: '25px', width: '50px', marginBottom: '14px' }} />
                  <div style={{ height: '16px', background: '#F1F5F9', borderRadius: '8px', marginBottom: '8px', width: '70%' }} />
                  <div style={{ height: '12px', background: '#F1F5F9', borderRadius: '8px', width: '50%' }} />
                </div>
              ))}
            </div>
          )}
          <div style={{ textAlign: 'center', marginTop: '28px' }}>
            <button onClick={() => navigate('/advocates')} style={{ padding: '12px 32px', background: 'transparent', border: `1.5px solid ${INK}`, borderRadius: '9px', color: INK, fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>
              View Full Directory →
            </button>
          </div>
        </div>
      </div>

      {/* ── Urgent CTA ────────────────────────────────────────────────────── */}
      <div style={{ background: '#1A0808', padding: '48px', textAlign: 'center', borderTop: '3px solid #DC2626' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🚨</div>
          <h2 style={{ color: '#fff', fontSize: '28px', fontWeight: 700, marginBottom: '10px', fontFamily: "'Space Grotesk', sans-serif" }}>Facing an urgent legal situation?</h2>
          <p style={{ color: 'rgba(255,255,255,.58)', fontSize: '15px', lineHeight: 1.75, marginBottom: '8px' }}>Arrest. Property dispute. Legal notice. Get connected to an on-call advocate within 9 minutes — any time, any day.</p>
          <p style={{ color: 'rgba(255,255,255,.3)', fontSize: '12px', marginBottom: '24px' }}>Platform facilitation fee: ₹1,999. Auto-refunded if connection not made within 9 minutes.</p>
          <button onClick={() => navigate('/urgent')} style={{ padding: '15px 36px', fontSize: '15px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: '9px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Request Urgent Connection →
          </button>
        </div>
      </div>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <div style={{ background: INK_3, padding: '40px 48px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '40px', marginBottom: '28px' }}>
          <div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '20px', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Logo size={24} />
              <span style={{ background: GRAD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>ClearCase</span>
            </div>
            <p style={{ color: 'rgba(255,255,255,.38)', fontSize: '13px', lineHeight: 1.7 }}>Legal technology platform. Not a law firm. Does not provide legal advice.</p>
          </div>
          <div>
            <div style={{ color: 'rgba(255,255,255,.5)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '10px' }}>Compliance</div>
            {['BCI Rule 36 Compliant', 'Advocates Act 1961', 'DPDP Act 2023'].map(t => (
              <div key={t} style={{ color: 'rgba(255,255,255,.38)', fontSize: '13px', marginBottom: '5px' }}>✓ {t}</div>
            ))}
          </div>
          <div>
            <div style={{ color: 'rgba(255,255,255,.5)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '10px' }}>Links</div>
            {[['Full Disclaimer', '/compliance'], ['The Bench', '/bench/directory'], ['Find Advocate', '/advocates'], ['Corporate Law', '/corporate'], ['Income Tax', '/income-tax'], ['Immigration', '/immigration']].map(([label, path]) => (
              <div key={path} onClick={() => navigate(path)} style={{ color: 'rgba(255,255,255,.38)', fontSize: '13px', marginBottom: '5px', cursor: 'pointer', textDecoration: 'underline' }}>{label}</div>
            ))}
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,.1)', paddingTop: '20px', textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,.22)', fontSize: '12px', lineHeight: 1.7 }}>ClearCase is a technology platform. Not a law firm. Does not practice law. © 2025 ClearCase Technology Pvt. Ltd. · clearcase.in</p>
        </div>
      </div>
    </div>
  );
}
