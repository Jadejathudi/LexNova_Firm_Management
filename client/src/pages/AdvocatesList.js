import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

const NAVY = '#0A1628';
const GOLD = '#C9A84C';
const BG = '#F8FAFC';
const WHITE = '#FFFFFF';
const GRAY = '#64748B';

const SPEC_COLORS = {
  Criminal: '#B91C1C',
  Civil: '#1D4ED8',
  Family: '#7C3AED',
  Corporate: '#0F766E',
  Banking: '#0369A1',
  'Real Estate': '#C2410C',
  Consumer: '#0E7490',
  Revenue: '#92400E',
};

function SpecBadge({ spec }) {
  const c = SPEC_COLORS[spec] || NAVY;
  return (
    <span style={{ display: 'inline-block', fontSize: '11px', background: `${c}18`, color: c, borderRadius: '20px', padding: '5px 12px', fontWeight: 600, whiteSpace: 'nowrap' }}>
      {spec}
    </span>
  );
}

function AdvocateCard({ advocate, onViewProfile, onBook }) {
  const displayName = advocate.full_name || advocate.name || 'Advocate';
  const initials = displayName.split(' ').map((part) => part[0]).join('').slice(0, 2);

  return (
    <div style={{ background: WHITE, borderRadius: '14px', padding: '22px', border: '1px solid #E5E7EB', minHeight: '320px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
        <div style={{ width: '54px', height: '54px', borderRadius: '27px', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', color: GOLD, fontSize: '18px', fontWeight: 700 }}>{initials}</div>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: NAVY }}>{displayName}</div>
          <div style={{ fontSize: '13px', color: GRAY, marginTop: '4px' }}>{advocate.experience_years} yrs · {advocate.city}</div>
          <div style={{ fontSize: '12px', color: GRAY, marginTop: '6px' }}>{advocate.languages?.join(' · ') || 'English'}</div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: NAVY }}>{advocate.rating?.toFixed(1) ?? 'N/A'}</div>
          <div style={{ fontSize: '12px', color: GRAY }}>{advocate.review_count || 0} reviews</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
        {(advocate.specializations || advocate.specs || []).slice(0, 4).map((spec) => <SpecBadge key={spec} spec={spec} />)}
      </div>
      <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: GRAY, marginBottom: '18px' }}>
        <span>📁 {advocate.cases_handled || advocate.cases || 0} cases</span>
        <span>✅ {advocate.success_rate || advocate.success || 0}% success</span>
        <span>{advocate.available ? 'Available now' : 'Booking by request'}</span>
      </div>
      <div style={{ marginTop: 'auto', display: 'grid', gap: '10px' }}>
        <button className="btn btn-navy" style={{ width: '100%', padding: '12px' }} onClick={() => onViewProfile(advocate)}>View Profile</button>
        <button className="btn btn-gold" style={{ width: '100%', padding: '12px' }} onClick={() => onBook(advocate)}>
          Book Free 30 Min
        </button>
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

  useEffect(() => {
    fetchAdvocates();
  }, [stateFilter, specFilter, availableOnly]);

  const fetchAdvocates = async () => {
    setLoading(true);
    try {
      const result = await api.getAdvocates({ state: stateFilter !== 'all' ? stateFilter : undefined, spec: specFilter !== 'all' ? specFilter : undefined, available: availableOnly });
      setAdvocates(result || []);
    } catch (error) {
      console.error('Error fetching advocates:', error);
      setAdvocates([]);
    } finally {
      setLoading(false);
    }
  };

  const openProfile = (advocate) => {
    navigate(`/advocates/${advocate.advocate_id}`);
  };

  const bookAdvocate = (advocate) => {
    navigate(`/book?advocateId=${advocate.advocate_id}`);
  };

  const availableSpecs = Array.from(new Set(advocates.flatMap((a) => a.specializations || a.specs || [])));
  const states = Array.from(new Set(advocates.map((a) => a.state).filter(Boolean)));

  return (
    <div style={{ background: BG, minHeight: '100vh' }}>
      <div style={{ background: NAVY, padding: '0 48px', height: '60px', display: 'flex', alignItems: 'center', gap: '32px', position: 'sticky', top: 0, zIndex: 50 }}>
        <span onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: WHITE, fontSize: '17px', fontWeight: 800, fontFamily: 'Georgia, serif' }}>
          ⚖️ CLEAR CASE
        </span>
        <div style={{ flex: 1 }} />
        <span onClick={() => navigate('/advocates')} style={{ color: 'rgba(255,255,255,0.75)', fontSize: '14px', cursor: 'pointer' }}>Find an Advocate</span>
        <span onClick={() => navigate('/login')} style={{ color: 'rgba(255,255,255,0.75)', fontSize: '14px', cursor: 'pointer' }}>For Advocates</span>
        <button className="btn btn-gold" onClick={() => navigate('/register')} style={{ padding: '9px 20px' }}>Register Free</button>
      </div>

      <div style={{ background: NAVY, padding: '32px 48px' }}>
        <h1 style={{ color: WHITE, fontSize: '28px', fontWeight: 800, fontFamily: 'Georgia, serif', marginBottom: '6px' }}>Find Your Advocate</h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>Verified advocates serving Telangana & Andhra Pradesh.</p>
        <div style={{ display: 'flex', gap: '12px', marginTop: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} style={{ padding: '10px 14px', borderRadius: '10px', border: 'none', background: 'rgba(255,255,255,0.12)', color: WHITE, minWidth: '180px' }}>
            <option value="all">All States</option>
            {states.map((state) => <option key={state} value={state}>{state}</option>)}
          </select>
          <select value={specFilter} onChange={(e) => setSpecFilter(e.target.value)} style={{ padding: '10px 14px', borderRadius: '10px', border: 'none', background: 'rgba(255,255,255,0.12)', color: WHITE, minWidth: '220px' }}>
            <option value="all">All Specializations</option>
            {availableSpecs.map((spec) => <option key={spec} value={spec}>{spec}</option>)}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: WHITE, fontSize: '14px' }}>
            <input type="checkbox" checked={availableOnly} onChange={(e) => setAvailableOnly(e.target.checked)} />
            Available now
          </label>
        </div>
      </div>

      <div style={{ padding: '32px 48px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ color: GRAY, fontSize: '14px' }}>Showing {advocates.length} advocate{advocates.length !== 1 ? 's' : ''}</div>
          <button className="btn btn-outline" onClick={() => navigate('/book')} style={{ padding: '10px 18px' }}>Book Consultation</button>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: GRAY }}>Loading advocates...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {advocates.length > 0 ? advocates.map((advocate) => (
              <AdvocateCard
                key={advocate.advocate_id}
                advocate={advocate}
                onViewProfile={openProfile}
                onBook={bookAdvocate}
              />
            )) : (
              <div style={{ gridColumn: '1/-1', padding: '60px', textAlign: 'center', color: GRAY, border: '1px dashed #E5E7EB', borderRadius: '16px' }}>
                No advocates found. Try a different location or specialization.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
