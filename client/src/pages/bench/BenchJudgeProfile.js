import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BenchNav from '../../components/bench/BenchNav';
import { C, TIERS, SERVICES, DISCLAIMER, BenchAvatar, TierBadge, SlotBar, benchFetch } from './benchConstants';

function DiscStrip() {
  return (
    <div style={{ background: 'rgba(196,152,42,.06)', borderBottom: `1px solid ${C.borderGold}`, padding: '8px 48px' }}>
      <p style={{ fontSize: 12, color: C.gray, maxWidth: 1100, margin: '0 auto', lineHeight: 1.5 }}>⚖ {DISCLAIMER}</p>
    </div>
  );
}

export default function BenchJudgeProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [judge, setJudge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    benchFetch(`/judges/${id}`)
      .then(setJudge)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ fontFamily: "'Jost',sans-serif", background: C.ink, color: C.parchment, minHeight: '100vh' }}>
        <BenchNav />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: C.gray }}>Loading judge profile…</div>
      </div>
    );
  }
  if (error || !judge) {
    return (
      <div style={{ fontFamily: "'Jost',sans-serif", background: C.ink, color: C.parchment, minHeight: '100vh' }}>
        <BenchNav />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 40 }}>⚖️</div>
          <div style={{ color: C.gray }}>Judge not found or unavailable.</div>
          <button onClick={() => navigate('/bench/directory')} style={{ background: C.gold, color: C.ink, border: 'none', borderRadius: 3, padding: '10px 24px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Jost',sans-serif" }}>Back to Directory</button>
        </div>
      </div>
    );
  }

  const t = TIERS[judge.tier] || TIERS.junior;
  const isFull = judge.slots_left === 0;
  const isScarce = judge.slots_left <= 2 && judge.slots_left > 0;

  return (
    <div style={{ fontFamily: "'Jost',sans-serif", background: C.ink, color: C.parchment, minHeight: '100vh' }}>
      <BenchNav />
      <DiscStrip />

      {/* Profile header */}
      <div style={{ background: `linear-gradient(135deg,${C.charcoal},${t.bg})`, borderBottom: `1px solid ${t.border}`, padding: '44px 80px' }}>
        <div onClick={() => navigate('/bench/directory')} style={{ color: C.gray, fontSize: 13, cursor: 'pointer', marginBottom: 22, display: 'flex', alignItems: 'center', gap: 5 }}>
          ← Judicial Directory
        </div>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', gap: 28, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <BenchAvatar judge={judge} size={88} />
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
              <TierBadge tier={judge.tier} />
              {isScarce && (
                <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 2, padding: '3px 9px', background: 'rgba(220,38,38,.15)', color: '#FCA5A5', border: '1px solid rgba(220,38,38,.3)' }}>
                  ⚡ Only {judge.slots_left} session{judge.slots_left !== 1 ? 's' : ''} left this month
                </span>
              )}
            </div>
            <h1 style={{ fontFamily: "'EB Garamond',serif", fontSize: 30, fontWeight: 700, lineHeight: 1.2, marginBottom: 8 }}>{judge.name}</h1>
            <div style={{ fontSize: 14, color: C.grayLight, marginBottom: 4 }}>{judge.city}, {judge.state} · Retired {judge.retired_year}</div>
            <div style={{ fontSize: 13, color: C.gray }}>{judge.years_on_bench} years on the bench · {(judge.languages || []).join(' · ')}</div>
          </div>
        </div>
      </div>

      {/* Content grid */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '36px 80px', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 28, alignItems: 'start' }}>

        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Judicial Profile */}
          <div style={{ background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 4, padding: 26 }}>
            <h3 style={{ fontFamily: "'EB Garamond',serif", fontSize: 20, fontWeight: 600, color: C.parchment, marginBottom: 12 }}>Judicial Profile</h3>
            <p style={{ fontSize: 14, color: C.grayLight, lineHeight: 1.85, fontFamily: "'EB Garamond',serif", marginBottom: 18 }}>{judge.bio}</p>
            <div style={{ height: 1, background: C.border, marginBottom: 18 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                ['🏛', 'Court served', judge.tier === 'hc' ? 'Telangana / AP High Court' : `${judge.state} District Courts`],
                ['📅', 'Years on bench', `${judge.years_on_bench} years`],
                ['🎓', 'Education', judge.education],
                ['⚖', 'Notable areas', judge.notable_areas],
              ].map(([ic, l, v]) => (
                <div key={l} style={{ background: C.charcoalMid, borderRadius: 3, padding: 13 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>{ic} {l}</div>
                  <div style={{ fontSize: 12, color: C.parchment, lineHeight: 1.5 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Services */}
          <div style={{ background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 4, padding: 26 }}>
            <h3 style={{ fontFamily: "'EB Garamond',serif", fontSize: 20, fontWeight: 600, color: C.parchment, marginBottom: 6 }}>Available Services</h3>
            <p style={{ fontSize: 13, color: C.gray, marginBottom: 18 }}>All services follow the same two-step process: intake call first, then the judge session.</p>
            {SERVICES.map(s => (
              <div key={s.id} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '14px 0', borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{s.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.parchment, marginBottom: 3 }}>
                    {s.name} <span style={{ fontSize: 11, color: C.gray, fontWeight: 400 }}>· {s.dur}</span>
                  </div>
                  <div style={{ fontSize: 12, color: C.grayLight, lineHeight: 1.6 }}>{s.desc}</div>
                </div>
                <div
                  onClick={() => navigate(`/bench/schedule/${judge.judge_id}`, { state: { serviceId: s.id } })}
                  style={{ fontSize: 12, color: C.gold, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap', paddingTop: 2, flexShrink: 0 }}
                >Book this →</div>
              </div>
            ))}
          </div>

          {/* Areas */}
          <div style={{ background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 4, padding: 26 }}>
            <h3 style={{ fontFamily: "'EB Garamond',serif", fontSize: 20, fontWeight: 600, color: C.parchment, marginBottom: 14 }}>Areas of Judicial Experience</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(judge.areas || []).map(a => (
                <div key={a} style={{ background: C.charcoalMid, border: `1px solid ${C.border}`, borderRadius: 3, padding: '9px 16px', fontSize: 13, fontWeight: 600, color: C.parchment }}>{a}</div>
              ))}
            </div>
          </div>

          {/* Conduct note */}
          <div style={{ background: 'rgba(196,152,42,.05)', border: `1px solid ${C.borderGold}`, borderRadius: 4, padding: 20 }}>
            <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 20 }}>🙏</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.gold, marginBottom: 5 }}>Conduct &amp; Etiquette</div>
                <div style={{ fontSize: 13, color: C.grayLight, lineHeight: 1.7, fontFamily: "'EB Garamond',serif" }}>
                  Sessions are conducted with the dignity befitting the judge's office. We ask clients to prepare their questions thoughtfully, arrive on time, and address the judge respectfully. The Bench may decline future sessions if conduct standards are not met.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column — booking sidebar */}
        <div style={{ position: 'sticky', top: 76, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: `linear-gradient(135deg,${C.charcoal},${t.bg})`, border: `1px solid ${t.border}`, borderRadius: 4, padding: 22 }}>
            <div style={{ fontFamily: "'EB Garamond',serif", fontSize: 17, fontWeight: 600, color: C.parchment, marginBottom: 4 }}>Book a Session</div>
            <div style={{ fontSize: 12, color: C.gray, marginBottom: 16 }}>{t.badge} · {judge.city}</div>
            <div style={{ height: 1, background: C.border, marginBottom: 14 }} />
            <SlotBar left={judge.slots_left} total={judge.total_slots} />
            <button
              onClick={() => navigate(`/bench/schedule/${judge.judge_id}`)}
              style={{
                width: '100%', marginTop: 14, padding: 13,
                background: isFull ? C.charcoalMid : C.gold,
                color: isFull ? C.grayLight : C.ink,
                border: isFull ? `1px solid ${C.border}` : 'none',
                borderRadius: 3, fontSize: 14, fontWeight: 600,
                cursor: 'pointer', fontFamily: "'Jost',sans-serif",
              }}
            >{isFull ? 'Join Waitlist →' : 'Book Session →'}</button>
            <p style={{ fontSize: 11, color: C.gray, textAlign: 'center', marginTop: 9, lineHeight: 1.5 }}>
              Intake call scheduled within 24 hours of booking.
            </p>
          </div>

          {/* Monthly availability indicator */}
          <div style={{ background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 4, padding: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.parchment, marginBottom: 12 }}>Monthly availability</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {['W1', 'W2', 'W3', 'W4'].map((w, i) => {
                const open = judge.slots_left > 0 && i < 2;
                return (
                  <div key={w} style={{ flex: 1, textAlign: 'center', padding: '8px 3px', borderRadius: 2, background: open ? 'rgba(21,128,61,.12)' : 'rgba(255,255,255,.03)' }}>
                    <div style={{ fontSize: 10, color: C.gray }}>{w}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: open ? '#15803D' : C.border, marginTop: 2 }}>{open ? 'Open' : 'Full'}</div>
                  </div>
                );
              })}
            </div>
            <p style={{ fontSize: 11, color: C.gray, marginTop: 9, lineHeight: 1.5 }}>Max {judge.total_slots} sessions/month. Slots reset on the 1st.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
