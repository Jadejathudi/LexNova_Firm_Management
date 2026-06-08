import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import BenchNav from '../../components/bench/BenchNav';
import { C, TIERS, DISCLAIMER, BenchAvatar, TierBadge, SlotBar, benchFetch } from './benchConstants';

function DiscStrip() {
  return (
    <div style={{ background: 'rgba(196,152,42,.06)', borderBottom: `1px solid ${C.borderGold}`, padding: '8px 48px' }}>
      <p style={{ fontSize: 12, color: C.gray, maxWidth: 1100, margin: '0 auto', lineHeight: 1.5 }}>⚖ {DISCLAIMER}</p>
    </div>
  );
}

function JudgeCard({ judge, onClick }) {
  const t = TIERS[judge.tier] || TIERS.junior;
  const isFull = judge.slots_left === 0;
  const isScarce = judge.slots_left <= 2 && judge.slots_left > 0;
  return (
    <div onClick={onClick} style={{
      background: `linear-gradient(135deg,${C.charcoal},${t.bg})`,
      border: `1px solid ${t.border}`, borderRadius: 4, padding: 28, cursor: 'pointer',
      transition: 'transform .22s,box-shadow .22s', fontFamily: "'Jost',sans-serif",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(0,0,0,.45)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
        <BenchAvatar judge={judge} size={60} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <h3 style={{ fontFamily: "'EB Garamond',serif", fontSize: 17, fontWeight: 600, color: C.parchment, lineHeight: 1.3 }}>{judge.name}</h3>
            {isScarce && <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 2, padding: '3px 9px', background: 'rgba(220,38,38,.15)', color: '#FCA5A5', border: '1px solid rgba(220,38,38,.3)' }}>⚡ {judge.slots_left} left</span>}
            {isFull && <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 2, padding: '3px 9px', background: 'rgba(255,255,255,.05)', color: C.gray }}>Fully Booked</span>}
          </div>
          <TierBadge tier={judge.tier} />
          <div style={{ fontSize: 12, color: C.gray, marginTop: 6 }}>{judge.years_on_bench} yrs on bench · {judge.city} · Retired {judge.retired_year}</div>
        </div>
      </div>
      <div style={{ fontSize: 13, color: C.grayLight, lineHeight: 1.7, marginBottom: 14, fontFamily: "'EB Garamond',serif" }}>
        {judge.bio.split('.').slice(0, 2).join('.') + '.'}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
        {(judge.areas || []).map(a => (
          <span key={a} style={{ fontSize: 11, fontWeight: 700, borderRadius: 2, padding: '3px 9px', background: 'rgba(255,255,255,.04)', color: C.grayLight, border: `1px solid ${C.border}` }}>{a}</span>
        ))}
      </div>
      <SlotBar left={judge.slots_left} total={judge.total_slots} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: 14 }}>
        <button style={{
          background: isFull ? C.charcoalMid : C.gold,
          color: isFull ? C.grayLight : C.ink,
          border: isFull ? `1px solid ${C.border}` : 'none',
          borderRadius: 3, padding: '8px 16px', fontSize: 13, fontWeight: 600,
          cursor: 'pointer', fontFamily: "'Jost',sans-serif",
        }}>{isFull ? 'Join Waitlist' : 'View & Book →'}</button>
      </div>
    </div>
  );
}

export default function BenchDirectory() {
  const navigate = useNavigate();
  const location = useLocation();
  const [judges, setJudges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tierFilter, setTierFilter] = useState(location.state?.tierFilter || 'all');
  const [areaFilter, setAreaFilter] = useState('all');

  useEffect(() => {
    setLoading(true);
    benchFetch('/judges').then(setJudges).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const allAreas = [...new Set(judges.flatMap(j => j.areas || []))].sort();

  const filtered = judges.filter(j => {
    const tOk = tierFilter === 'all' || j.tier === tierFilter;
    const aOk = areaFilter === 'all' || (j.areas || []).includes(areaFilter);
    return tOk && aOk;
  });

  const pilStyle = (active) => ({
    padding: '7px 16px', borderRadius: 2, cursor: 'pointer', fontSize: 13, fontWeight: 600,
    border: `1.5px solid ${active ? C.gold : C.border}`,
    background: active ? 'rgba(196,152,42,.12)' : 'transparent',
    color: active ? C.gold : C.grayLight,
    transition: 'all .15s', fontFamily: "'Jost',sans-serif",
  });

  return (
    <div style={{ fontFamily: "'Jost',sans-serif", background: C.ink, color: C.parchment, minHeight: '100vh' }}>
      <BenchNav />
      <DiscStrip />

      {/* Header + Filters */}
      <div style={{ background: C.charcoal, padding: '36px 80px 28px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: C.gold, marginBottom: 8 }}>Exclusive to The Bench</div>
        <h1 style={{ fontFamily: "'EB Garamond',serif", fontSize: 36, fontWeight: 700, marginBottom: 6 }}>Judicial Directory</h1>
        <p style={{ color: C.grayLight, fontSize: 14, marginBottom: 24, fontFamily: "'EB Garamond',serif" }}>Each judge is individually listed. Sessions limited by design.</p>

        {/* Tier pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {['all', ...Object.keys(TIERS)].map(k => (
            <div key={k} onClick={() => setTierFilter(k)} style={pilStyle(tierFilter === k)}>
              {k === 'all' ? 'All Courts' : TIERS[k].badge}
            </div>
          ))}
          <div style={{ width: 1, height: 22, background: C.border }} />
          {/* Area pills */}
          {['all', ...allAreas].map(a => (
            <div key={a} onClick={() => setAreaFilter(a)} style={{
              padding: '7px 14px', borderRadius: 2, cursor: 'pointer', fontSize: 12, fontWeight: 600,
              border: `1px solid ${areaFilter === a ? 'rgba(196,152,42,.4)' : C.border}`,
              background: areaFilter === a ? 'rgba(196,152,42,.08)' : 'transparent',
              color: areaFilter === a ? C.gold : C.gray,
              fontFamily: "'Jost',sans-serif",
            }}>{a === 'all' ? 'All Areas' : a}</div>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div style={{ background: C.ink, padding: '36px 80px', minHeight: '80vh' }}>
        <p style={{ color: C.gray, fontSize: 13, marginBottom: 24 }}>
          {loading ? 'Loading…' : `${filtered.length} judge${filtered.length !== 1 ? 's' : ''} · Sorted by court seniority`}
        </p>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: C.gray }}>Loading judges…</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: 18 }}>
            {filtered.length ? filtered.map(j => (
              <JudgeCard key={j.judge_id} judge={j} onClick={() => navigate(`/bench/judges/${j.judge_id}`)} />
            )) : (
              <div style={{ textAlign: 'center', padding: 80, color: C.gray, gridColumn: '1/-1' }}>
                No judges listed for this combination.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
