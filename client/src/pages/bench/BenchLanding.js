import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BenchNav from '../../components/bench/BenchNav';
import { C, TIERS, STEPS, DISCLAIMER, BenchAvatar, TierBadge, SlotBar, benchFetch } from './benchConstants';

function DiscStrip() {
  return (
    <div style={{ background: 'rgba(196,152,42,.06)', borderBottom: `1px solid ${C.borderGold}`, padding: '8px 48px' }}>
      <p style={{ fontSize: 12, color: C.gray, maxWidth: 1100, margin: '0 auto', lineHeight: 1.5 }}>
        ⚖ {DISCLAIMER}
      </p>
    </div>
  );
}

const TIER_DESCS = {
  hc:       'Presided over High Court appeals — the broadest appellate view, including constitutional matters and appeals from all lower courts.',
  district: 'Handled full criminal sessions, civil suits of high value, and appeals from subordinate courts. The workhorse of serious litigation.',
  senior:   'Senior Civil Judge with 10–15+ years, having handled a high volume of civil trials, consumer matters, and family law.',
  junior:   'Recently retired civil judge — fresh knowledge of evolving procedure and court practice, accessible rate.',
};
const TIER_BEST = {
  hc:       'High-stakes matters, HC appeals, complex civil/criminal disputes, constitutional questions.',
  district: 'Criminal sessions, major civil suits, land disputes, family matters at the district level.',
  senior:   'Everyday civil disputes, consumer complaints, matrimonial matters, smaller civil suits.',
  junior:   'Straightforward civil matters, consumer cases, first-time court situations.',
};

export default function BenchLanding() {
  const navigate = useNavigate();
  const [judges, setJudges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    benchFetch('/judges').then(setJudges).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const featured = judges.filter(j => j.tier === 'hc');
  const tierCounts = Object.fromEntries(Object.keys(TIERS).map(k => [k, judges.filter(j => j.tier === k).length]));

  const wrap = { fontFamily: "'Jost',sans-serif", background: C.ink, color: C.parchment, lineHeight: 1.6, minHeight: '100vh' };

  return (
    <div style={wrap}>
      <BenchNav />
      <DiscStrip />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section style={{
        position: 'relative', overflow: 'hidden', padding: '110px 80px 90px',
        textAlign: 'center',
        background: `radial-gradient(ellipse 80% 60% at 50% 0%,rgba(196,152,42,.1) 0%,transparent 65%),${C.ink}`,
      }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <div style={{ fontSize: 52, marginBottom: 24, display: 'inline-block' }}>⚖️</div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: C.gold, marginBottom: 18 }}>
            Exclusive to ClearCase · Telangana &amp; Andhra Pradesh
          </div>
          <h1 style={{ fontFamily: "'EB Garamond',serif", fontSize: 58, fontWeight: 700, lineHeight: 1.1, marginBottom: 22 }}>
            Decades on the Bench.<br />
            <span style={{
              background: `linear-gradient(90deg,${C.gold} 0%,${C.goldLight} 35%,#F5D060 55%,${C.gold} 80%)`,
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>Now Answering Your Questions.</span>
          </h1>
          <p style={{ fontSize: 17, color: C.grayLight, lineHeight: 1.82, maxWidth: 600, margin: '0 auto 14px', fontFamily: "'EB Garamond',serif", fontStyle: 'italic' }}>
            Retired judges from the High Courts and subordinate courts of Telangana and Andhra Pradesh — offering their judicial perspective on your legal matter. Available exclusively through ClearCase.
          </p>
          <p style={{ fontSize: 13, color: C.gray, marginBottom: 44 }}>Sessions are knowledge consultations. Not legal advice.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/bench/directory')} style={{ background: C.gold, color: C.ink, border: 'none', borderRadius: 3, padding: '15px 40px', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: "'Jost',sans-serif" }}>
              Meet the Judges →
            </button>
            <button onClick={() => navigate('/bench/how-it-works')} style={{ background: 'rgba(255,255,255,.07)', color: C.parchment, border: '1px solid rgba(255,255,255,.12)', borderRadius: 3, padding: '15px 40px', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: "'Jost',sans-serif" }}>
              How It Works
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', maxWidth: 680, margin: '64px auto 0', border: `1px solid ${C.border}`, borderRadius: 4, overflow: 'hidden', background: C.charcoal }}>
          {[
            [loading ? '…' : String(judges.length), 'Judges', 'on The Bench'],
            ['HC to Civil', 'Four tiers', 'of judicial experience'],
            ['24 hrs', 'Intake call', 'within one day'],
            ['Only here', 'Exclusive', 'to ClearCase'],
          ].map(([v, l, s], i) => (
            <div key={i} style={{ padding: '22px 12px', textAlign: 'center', borderRight: i < 3 ? `1px solid ${C.border}` : 'none' }}>
              <div style={{ fontFamily: "'EB Garamond',serif", fontSize: 24, fontWeight: 700, color: C.gold }}>{v}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.parchment, marginTop: 3 }}>{l}</div>
              <div style={{ fontSize: 11, color: C.gray, marginTop: 2 }}>{s}</div>
            </div>
          ))}
        </div>
      </section>

      <div style={{ height: 1, background: `linear-gradient(90deg,transparent,${C.gold},transparent)` }} />

      {/* ── What The Bench Is ─────────────────────────────────── */}
      <section style={{ padding: '90px 80px', background: C.charcoal }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: C.gold, marginBottom: 14 }}>A resource that didn't exist before</div>
            <h2 style={{ fontFamily: "'EB Garamond',serif", fontSize: 42, fontWeight: 700, lineHeight: 1.2, marginBottom: 22 }}>
              The knowledge that sits inside a judge's mind.
            </h2>
            <p style={{ fontSize: 15, color: C.grayLight, lineHeight: 1.85, fontFamily: "'EB Garamond',serif", marginBottom: 16 }}>
              A retired judge has presided over thousands of cases. They have heard every argument, watched every strategy succeed or fail, and made the decisions that determined people's lives — from the most powerful seat in the room.
            </p>
            <p style={{ fontSize: 15, color: C.grayLight, lineHeight: 1.85, fontFamily: "'EB Garamond',serif", marginBottom: 32 }}>
              That accumulated knowledge does not disappear when they retire. The Bench makes it accessible — so you can understand how a judge would see your matter before it ever reaches the court.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              {[
                ['Not legal advice', 'A judicial perspective — candid, experienced, based on real courtroom decisions.'],
                ['Not a referral', 'No advocate is recommended. This is independent judicial knowledge.'],
                ['Not available elsewhere', 'The Bench is exclusive to ClearCase.'],
              ].map(([t, d]) => (
                <div key={t} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.gold, flexShrink: 0, marginTop: 9 }} />
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.parchment }}>{t} — </span>
                    <span style={{ fontSize: 14, color: C.grayLight }}>{d}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Featured HC judges */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: C.gray, marginBottom: 4 }}>High Court Judges on The Bench</div>
            {loading ? (
              <div style={{ color: C.gray, fontSize: 14 }}>Loading judges…</div>
            ) : featured.map(j => (
              <div key={j.judge_id} onClick={() => navigate(`/bench/judges/${j.judge_id}`)}
                style={{ background: C.charcoal, border: `1px solid ${TIERS[j.tier].border}`, borderRadius: 4, padding: 20, cursor: 'pointer', background: `linear-gradient(135deg,${C.charcoal},${TIERS[j.tier].bg})` }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 12 }}>
                  <BenchAvatar judge={j} size={52} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'EB Garamond',serif", fontSize: 16, fontWeight: 600, color: C.parchment, lineHeight: 1.3, marginBottom: 4 }}>{j.name}</div>
                    <div style={{ fontSize: 12, color: C.gray }}>{j.years_on_bench} yrs · {j.city} · Retired {j.retired_year}</div>
                  </div>
                </div>
                <SlotBar left={j.slots_left} total={j.total_slots} />
              </div>
            ))}
            <button onClick={() => navigate('/bench/directory')} style={{ background: 'transparent', color: C.gold, border: `1.5px solid ${C.gold}`, borderRadius: 3, padding: 11, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Jost',sans-serif" }}>
              View All Judges →
            </button>
          </div>
        </div>
      </section>

      <div style={{ height: 1, background: `linear-gradient(90deg,transparent,${C.gold},transparent)` }} />

      {/* ── How It Works (concise) ─────────────────────────────── */}
      <section style={{ padding: '90px 80px', background: C.ink }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: C.gold, marginBottom: 14 }}>The process</div>
          <h2 style={{ fontFamily: "'EB Garamond',serif", fontSize: 44, fontWeight: 700, marginBottom: 14 }}>Simple. Structured. Thorough.</h2>
          <p style={{ color: C.grayLight, fontSize: 16, maxWidth: 500, margin: '0 auto 52px', fontFamily: "'EB Garamond',serif" }}>You never arrive cold. The judge never arrives cold.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 0, position: 'relative' }}>
            <div style={{ position: 'absolute', top: 20, left: '10%', right: '10%', height: 1, background: `linear-gradient(90deg,${C.gold},rgba(196,152,42,.2))`, zIndex: 0 }} />
            {STEPS.map((s, i) => (
              <div key={i} style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '0 10px' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: i === 0 ? C.gold : C.charcoalMid,
                  border: `2px solid ${i === 0 ? C.gold : C.border}`,
                  color: i === 0 ? C.ink : C.gold,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 800, margin: '0 auto 14px',
                }}>0{i + 1}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.parchment, marginBottom: 6, lineHeight: 1.3 }}>{s.t}</div>
                <div style={{ fontSize: 11, color: C.gray, lineHeight: 1.6 }}>{s.d.split('.')[0]}.</div>
              </div>
            ))}
          </div>
          <button onClick={() => navigate('/bench/how-it-works')} style={{ marginTop: 44, background: C.gold, color: C.ink, border: 'none', borderRadius: 3, padding: '13px 36px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Jost',sans-serif" }}>
            Read the Full Process →
          </button>
        </div>
      </section>

      <div style={{ height: 1, background: `linear-gradient(90deg,transparent,${C.gold},transparent)` }} />

      {/* ── Tiers ─────────────────────────────────────────────── */}
      <section style={{ padding: '90px 80px', background: C.charcoal }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: C.gold, marginBottom: 14 }}>Four tiers of judicial experience</div>
            <h2 style={{ fontFamily: "'EB Garamond',serif", fontSize: 44, fontWeight: 700, marginBottom: 12 }}>Choose the perspective that fits.</h2>
            <p style={{ color: C.grayLight, fontSize: 15, maxWidth: 520, margin: '0 auto', fontFamily: "'EB Garamond',serif" }}>
              Every judge on The Bench has spent years on the bench. The difference is the level of court — and therefore the scope of cases they presided over.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
            {Object.entries(TIERS).map(([key, t]) => (
              <div key={key} style={{ background: C.charcoal, border: `1px solid ${t.border}`, borderRadius: 4, padding: 22, background: t.bg }}>
                <div style={{ fontFamily: "'EB Garamond',serif", fontSize: 14, fontWeight: 700, color: t.color, marginBottom: 4 }}>{t.badge}</div>
                <p style={{ fontSize: 12, color: C.grayLight, lineHeight: 1.7, marginBottom: 12 }}>{TIER_DESCS[key]}</p>
                <div style={{ height: 1, background: C.border, marginBottom: 12 }} />
                <div style={{ fontSize: 11, color: C.gray, marginBottom: 12, fontStyle: 'italic', fontFamily: "'EB Garamond',serif" }}>Best for: {TIER_BEST[key]}</div>
                <div style={{ fontSize: 11, color: t.color, marginBottom: 14 }}>{tierCounts[key] || 0} judge{(tierCounts[key] || 0) !== 1 ? 's' : ''} available</div>
                <button
                  onClick={() => navigate('/bench/directory', { state: { tierFilter: key } })}
                  style={{ width: '100%', background: 'transparent', color: C.gold, border: `1.5px solid ${C.gold}`, borderRadius: 3, padding: '8px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Jost',sans-serif" }}
                >Browse →</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Scarcity ──────────────────────────────────────────── */}
      <section style={{ padding: '72px 80px', background: C.ink, textAlign: 'center' }}>
        <div style={{ maxWidth: 580, margin: '0 auto' }}>
          <div style={{ fontSize: 40, marginBottom: 18 }}>⚡</div>
          <h2 style={{ fontFamily: "'EB Garamond',serif", fontSize: 38, fontWeight: 700, marginBottom: 14 }}>Monthly slots fill quickly.</h2>
          <p style={{ fontFamily: "'EB Garamond',serif", fontSize: 16, color: C.grayLight, lineHeight: 1.85, marginBottom: 10 }}>
            Each judge accepts a fixed number of sessions per month — by design. This ensures every client receives their full, undivided attention.
          </p>
          <p style={{ fontSize: 13, color: C.gray, marginBottom: 32, fontStyle: 'italic' }}>Sessions do not roll over. Unfilled slots expire at month-end.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 32, textAlign: 'left' }}>
            {judges.filter(j => j.is_available).slice(0, 4).map(j => (
              <div key={j.judge_id} onClick={() => navigate(`/bench/judges/${j.judge_id}`)}
                style={{ background: C.charcoal, border: `1px solid ${j.slots_left <= 2 ? 'rgba(220,38,38,.3)' : C.border}`, borderRadius: 4, padding: 14, cursor: 'pointer' }}>
                <div style={{ fontFamily: "'EB Garamond',serif", fontSize: 13, color: C.parchment, marginBottom: 7, lineHeight: 1.3 }}>{j.name.split('(')[0].trim()}</div>
                <div style={{ fontSize: 11, color: C.gray, marginBottom: 7 }}>{TIERS[j.tier]?.badge}</div>
                <SlotBar left={j.slots_left} total={j.total_slots} />
              </div>
            ))}
          </div>
          <button onClick={() => navigate('/bench/directory')} style={{ background: C.gold, color: C.ink, border: 'none', borderRadius: 3, padding: '14px 44px', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: "'Jost',sans-serif" }}>
            Reserve Your Session →
          </button>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer style={{ background: C.charcoal, borderTop: `1px solid ${C.border}`, padding: '36px 80px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ color: C.gold, fontSize: 16 }}>⚖</span>
              <span style={{ fontFamily: "'EB Garamond',serif", fontSize: 18, fontWeight: 600, color: C.parchment }}>The Bench</span>
              <span style={{ fontSize: 11, color: C.gray }}>by ClearCase</span>
            </div>
            <p style={{ fontSize: 12, color: C.gray, lineHeight: 1.65, maxWidth: 340 }}>{DISCLAIMER}</p>
          </div>
          <div style={{ fontSize: 12, color: C.gray, textAlign: 'right' }}>
            <div>© 2025 ClearCase Technology Pvt. Ltd.</div>
            <div style={{ marginTop: 4 }}>clearcase.in · Hyderabad</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
