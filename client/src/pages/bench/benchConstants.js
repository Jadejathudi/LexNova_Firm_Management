// Shared constants and helpers for all Bench pages
export const TIERS = {
  hc:       { label: 'Retired High Court Judge',    color: '#C4982A', bg: 'rgba(196,152,42,.1)',   border: 'rgba(196,152,42,.3)',   badge: 'High Court',    rank: 1 },
  district: { label: 'Retired District Judge',       color: '#8B9CB5', bg: 'rgba(139,156,181,.08)', border: 'rgba(139,156,181,.25)', badge: 'District Court', rank: 2 },
  senior:   { label: 'Retired Senior Civil Judge',   color: '#A0A8C0', bg: 'rgba(160,168,192,.07)', border: 'rgba(160,168,192,.2)',  badge: 'Senior Civil',   rank: 3 },
  junior:   { label: 'Retired Junior Civil Judge',   color: '#7A8499', bg: 'rgba(122,132,153,.07)', border: 'rgba(122,132,153,.18)', badge: 'Junior Civil',   rank: 4 },
};

export const SERVICES = [
  { id: 'review',  icon: '📋', name: 'Case Review',           dur: '60 min call',
    desc: 'The judge reviews the structured notes from your intake call and gives a frank judicial assessment of where your case stands.' },
  { id: 'second',  icon: '🔍', name: 'Second Opinion',         dur: '45 min call',
    desc: "Share your advocate's strategy. The judge gives an independent view on whether the approach is sound — and what they would do differently." },
  { id: 'prehear', icon: '⚖️', name: 'Pre-Hearing Readiness',  dur: '45 min call',
    desc: 'Is your case actually ready to go before court? The judge does a structured readiness check — same rigour they applied from the bench.' },
  { id: 'settle',  icon: '🤝', name: 'Settlement Assessment',  dur: '30 min call',
    desc: 'Has the other side made an offer? The judge tells you what courts actually award in comparable cases — so you can decide with full information.' },
];

export const STEPS = [
  { n: '01', t: 'Choose a judge & book', d: 'Browse the directory by court tier and area of practice. Select a service and preferred time. Your slot request is submitted immediately.' },
  { n: '02', t: '20-minute intake call', d: 'A ClearCase legal team member calls you within 24 hours. They take structured notes on your matter — facts, documents, questions, what you need the judge to address.' },
  { n: '03', t: 'Notes submitted to the judge', d: 'Your case notes are prepared and sent to the judge before the session. The judge reviews them fully — so they arrive prepared, not cold.' },
  { n: '04', t: 'Your session with the judge', d: 'A video or phone call with the retired judge. They share their judicial perspective on your matter — candid, experienced, and grounded in real courtroom decisions.' },
  { n: '05', t: 'Session notes to you', d: "A summary of the judge's key points is sent to your ClearCase account. Share with your advocate, use it to prepare, or keep it for reference." },
];

export const DISCLAIMER = `ClearCase is a technology platform. Retired judges on The Bench are not practicing advocates. Sessions are knowledge consultations, not legal advice, and do not create any legal relationship.`;

// ── CSS-in-JS tokens ──────────────────────────────────────────────
export const C = {
  ink:          '#0C0E15',
  parchment:    '#F4EFE4',
  parchmentDk:  '#E8E0CC',
  gold:         '#C4982A',
  goldLight:    '#E2B94A',
  goldPale:     '#FBF5E6',
  charcoal:     '#181B28',
  charcoalMid:  '#22263A',
  charcoalLt:   '#2E324A',
  gray:         '#6E7288',
  grayLight:    '#A8ABBE',
  white:        '#fff',
  green:        '#15803D',
  red:          '#DC2626',
  border:       '#2E324A',
  borderGold:   'rgba(196,152,42,.3)',
};

// ── Helper: judge avatar ──────────────────────────────────────────
export function BenchAvatar({ judge, size = 64 }) {
  const t = TIERS[judge.tier] || TIERS.junior;
  const fs = Math.round(size * 0.3);
  return (
    <div style={{ position: 'relative', flexShrink: 0, display: 'inline-block' }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: `linear-gradient(135deg,${t.color}22,${t.color}44)`,
        border: `2px solid ${t.color}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', position: 'relative',
      }}>
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" style={{ position: 'absolute', inset: 0 }}>
          <circle cx="32" cy="23" r="10" fill={t.color} opacity=".22" />
          <ellipse cx="32" cy="50" rx="18" ry="11" fill={t.color} opacity=".16" />
        </svg>
        <span style={{ position: 'relative', zIndex: 1, fontFamily: "'EB Garamond',serif", fontSize: fs, fontWeight: 700, color: t.color }}>
          {judge.initials}
        </span>
      </div>
      <div style={{
        position: 'absolute', bottom: -3, right: -3,
        background: t.color, width: 18, height: 18, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, border: `2px solid ${C.charcoal}`,
      }}>⚖</div>
    </div>
  );
}

// ── Helper: tier badge ────────────────────────────────────────────
export function TierBadge({ tier }) {
  const t = TIERS[tier] || TIERS.junior;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', fontSize: 11, fontWeight: 700,
      borderRadius: 2, padding: '3px 9px', whiteSpace: 'nowrap', letterSpacing: '.04em',
      background: t.bg, color: t.color, border: `1px solid ${t.border}`,
    }}>{t.badge}</span>
  );
}

// ── Helper: slot availability bar ────────────────────────────────
export function SlotBar({ left, total }) {
  const full = left === 0;
  const scarce = left <= 2 && left > 0;
  const pct = total === 0 ? 0 : (left / total) * 100;
  const barColor = full ? 'rgba(255,255,255,.06)' : scarce ? C.red : C.gold;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', color: full ? C.gray : scarce ? '#FCA5A5' : C.gold }}>
          {full ? 'Fully Booked This Month' : scarce ? `⚡ ${left} session${left !== 1 ? 's' : ''} left` : `${left} of ${total} sessions available`}
        </span>
      </div>
      <div style={{ height: 3, background: 'rgba(255,255,255,.06)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 2 }} />
      </div>
    </div>
  );
}

export const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

export async function benchFetch(endpoint, options = {}) {
  const token = localStorage.getItem('clearcase_token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/bench${endpoint}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}
