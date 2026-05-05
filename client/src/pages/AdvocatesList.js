import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import PublicNavbar from '../components/PublicNavbar';

const NAVY = '#1B2559', GOLD = '#C9A84C', BG = '#F4F6FB', GRAY = '#64748B', WHITE = '#FFFFFF';
const GREEN = '#15803D', GREEN_BG = '#DCFCE7', AMBER = '#92400E', AMBER_BG = '#FFF8E8';

const SPEC_COLORS = { Criminal: '#B91C1C', Civil: '#1D4ED8', Family: '#7C3AED', Corporate: '#0F766E', Banking: '#0369A1', 'Real Estate': '#C2410C', Consumer: '#0E7490', Revenue: '#92400E' };

function SpecBadge({ spec }) {
  const c = SPEC_COLORS[spec] || NAVY;
  return <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: '11px', fontWeight: 700, borderRadius: '20px', padding: '3px 11px', whiteSpace: 'nowrap', background: `${c}18`, color: c }}>{spec}</span>;
}

function AdvocateCard({ advocate, onViewProfile, onBook }) {
  const name = advocate.full_name || 'Advocate';
  const initials = name.split(' ').map(p => p[0]).join('').slice(0, 2);
  const yrs = advocate.experience_years || 0;
  const barNo = advocate.bar_number || '—';
  const available = Boolean(advocate.is_available);
  const specs = advocate.specializations || [];
  const langs = advocate.languages || [];
  const currentYear = new Date().getFullYear();
  const enrolledYear = barNo.match(/\/(\d{4})\//)?.[1] || (currentYear - yrs);

  return (
    <div style={{ background: WHITE, borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 2px 10px rgba(0,0,0,.05)', padding: '22px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', gap: '13px', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div style={{ width: '50px', height: '50px', borderRadius: '25px', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: GOLD, fontSize: '16px', fontWeight: 800 }}>{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '17px', fontWeight: 700, color: NAVY, lineHeight: 1.2 }}>{name}</div>
          <div style={{ fontSize: '12px', color: GRAY, marginTop: '3px' }}>{advocate.city} · {advocate.state} · {yrs} yrs at Bar</div>
          <div style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'monospace', marginTop: '2px' }}>{barNo}</div>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: '11px', fontWeight: 700, borderRadius: '20px', padding: '3px 11px', whiteSpace: 'nowrap', flexShrink: 0, background: available ? GREEN_BG : '#F1F5F9', color: available ? GREEN : GRAY }}>
          {available ? '✓ Available' : '✗ Unavailable'}
        </span>
      </div>
      <div style={{ fontSize: '11px', fontWeight: 700, color: GRAY, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '7px' }}>Handles matters in</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '14px' }}>
        {specs.slice(0, 4).map(s => <SpecBadge key={s} spec={s} />)}
      </div>
      <div style={{ fontSize: '12px', color: GRAY, marginBottom: '14px' }}>🗣 {langs.join(' · ') || 'English'}</div>
      <div style={{ marginTop: 'auto', display: 'flex', gap: '8px' }}>
        <button onClick={() => onViewProfile(advocate)} style={{ flex: 1, padding: '9px 8px', fontSize: '13px', background: 'transparent', border: `1.5px solid ${NAVY}`, borderRadius: '9px', color: NAVY, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>View Profile</button>
        <button onClick={() => onBook(advocate)} style={{ flex: 1, padding: '9px 8px', fontSize: '13px', background: GOLD, border: 'none', borderRadius: '9px', color: NAVY, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Schedule Appointment</button>
      </div>
    </div>
  );
}

export default function AdvocatesList() {
  const navigate = useNavigate();
  const [advocates, setAdvocates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stateFilter, setStateFilter] = useState('all');
  const [specFilter, setSpecFilter] = useState('all');
  const [availableOnly, setAvailableOnly] = useState(false);

  useEffect(() => { fetchAdvocates(); }, [stateFilter, specFilter, availableOnly]);

  const fetchAdvocates = async () => {
    setLoading(true);
    try {
      const result = await api.getAdvocates({ state: stateFilter !== 'all' ? stateFilter : undefined, spec: specFilter !== 'all' ? specFilter : undefined, available: availableOnly });
      setAdvocates(result || []);
    } catch {
      setAdvocates([]);
    } finally {
      setLoading(false);
    }
  };

  const allSpecs = Array.from(new Set(advocates.flatMap(a => a.specializations || [])));

  return (
    <div style={{ background: BG, minHeight: '100vh', fontFamily: "'Outfit', 'Inter', sans-serif" }}>
      <PublicNavbar />

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#0B1237,#1B2559)', padding: '32px 48px 24px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <h1 style={{ color: '#fff', fontSize: '30px', fontWeight: 700, marginBottom: '6px', fontFamily: 'Georgia, serif' }}>Advocate Directory</h1>
          <p style={{ color: 'rgba(255,255,255,.5)', fontSize: '14px', marginBottom: '4px' }}>Bar Council enrolled advocates in Telangana & Andhra Pradesh</p>
          <p style={{ color: 'rgba(255,255,255,.3)', fontSize: '12px', fontStyle: 'italic', marginBottom: '20px' }}>ClearCase does not rank or recommend advocates. Listings are informational only.</p>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={stateFilter} onChange={e => setStateFilter(e.target.value)} style={{ background: 'rgba(255,255,255,.12)', color: '#fff', border: '1px solid rgba(255,255,255,.2)', borderRadius: '8px', padding: '9px 14px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              <option value="all" style={{ color: '#111' }}>All States</option>
              <option value="Telangana" style={{ color: '#111' }}>Telangana</option>
              <option value="Andhra Pradesh" style={{ color: '#111' }}>Andhra Pradesh</option>
              <option value="Karnataka" style={{ color: '#111' }}>Karnataka</option>
              <option value="Delhi" style={{ color: '#111' }}>Delhi</option>
            </select>

            {/* Area pills */}
            {['all', ...allSpecs].map(area => (
              <div key={area} onClick={() => setSpecFilter(area)} style={{ background: specFilter === area ? GOLD : 'rgba(255,255,255,.1)', color: specFilter === area ? NAVY : '#fff', borderRadius: '20px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}>
                {area === 'all' ? 'All Areas' : area}
              </div>
            ))}

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontSize: '13px', cursor: 'pointer' }}>
              <input type="checkbox" checked={availableOnly} onChange={e => setAvailableOnly(e.target.checked)} style={{ accentColor: GOLD }} />
              Available now
            </label>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '28px 48px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ background: AMBER_BG, borderLeft: '3px solid #C9A84C', borderRadius: '0 8px 8px 0', padding: '10px 16px', marginBottom: '20px', maxWidth: '800px' }}>
            <p style={{ fontSize: '12px', color: AMBER, lineHeight: 1.6 }}>All information is self-declared by each advocate. ClearCase independently verifies Bar Council enrollment numbers only.</p>
          </div>

          <p style={{ color: GRAY, fontSize: '14px', marginBottom: '20px' }}>{loading ? 'Loading...' : `${advocates.length} advocate${advocates.length !== 1 ? 's' : ''} listed`}</p>

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '20px' }}>
              {[1, 2, 3].map(i => <div key={i} style={{ background: WHITE, borderRadius: '16px', border: '1px solid #E2E8F0', padding: '22px', minHeight: '280px' }} />)}
            </div>
          ) : advocates.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '20px' }}>
              {advocates.map(a => (
                <AdvocateCard
                  key={a.advocate_id}
                  advocate={a}
                  onViewProfile={adv => navigate(`/advocates/${adv.advocate_id}`)}
                  onBook={adv => navigate(`/book?advocateId=${adv.advocate_id}`)}
                />
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '80px', color: GRAY, border: '1px dashed #E2E8F0', borderRadius: '16px' }}>
              No advocates listed for this combination. Try a different filter.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
