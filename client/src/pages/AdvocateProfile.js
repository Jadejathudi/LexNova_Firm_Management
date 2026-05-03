import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
    <span style={{ display: 'inline-block', fontSize: '11px', background: `${c}18`, color: c, borderRadius: '20px', padding: '5px 12px', margin: '0 6px 6px 0', fontWeight: 600, whiteSpace: 'nowrap' }}>
      {spec}
    </span>
  );
}

function renderStars(score) {
  const value = Math.round(score || 0);
  return '★'.repeat(value) + '☆'.repeat(5 - value);
}

export default function AdvocateProfile() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [advocate, setAdvocate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState([]);
  const [earnings, setEarnings] = useState({ total_earnings: 0, total_sessions: 0, avg_session_length: 0 });
  const [earningsPeriod, setEarningsPeriod] = useState('month');

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  useEffect(() => {
    fetchAdvocate();
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchAvailability();
      fetchEarnings(earningsPeriod);
    }
  }, [id, earningsPeriod]);

  const fetchAdvocate = async () => {
    try {
      const data = await api.getAdvocate(id);
      setAdvocate(data);
    } catch (error) {
      console.error('Error fetching advocate:', error);
      setAdvocate(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailability = async () => {
    try {
      const data = await api.getAdvocateAvailability(id);
      setAvailability(data || []);
    } catch (error) {
      console.error('Error fetching availability:', error);
      setAvailability([]);
    }
  };

  const fetchEarnings = async (period) => {
    try {
      const data = await api.getAdvocateEarnings(id, period);
      setEarnings(data || { total_earnings: 0, total_sessions: 0, avg_session_length: 0 });
    } catch (error) {
      console.error('Error fetching earnings:', error);
      setEarnings({ total_earnings: 0, total_sessions: 0, avg_session_length: 0 });
    }
  };

  const getDayName = (dayOfWeek) => {
    if (typeof dayOfWeek === 'number') return dayLabels[dayOfWeek] || '';
    const parsed = Number(dayOfWeek);
    return !Number.isNaN(parsed) ? dayLabels[parsed] : String(dayOfWeek);
  };

  const getAvailabilityForDay = (dayIndex) => {
    const dayKey = dayLabels[dayIndex];
    return availability.find((item) => {
      if (typeof item.day_of_week === 'string') {
        return item.day_of_week.toLowerCase().startsWith(dayKey.toLowerCase());
      }
      return Number(item.day_of_week) === dayIndex;
    }) || null;
  };

  const formatCurrency = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading advocate profile...</div>;
  }

  if (!advocate) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Advocate not found</div>;
  }

  const a = advocate;
  const displayName = a.full_name || a.name || 'Advocate';
  const initials = displayName.split(' ').map((part) => part[0]).join('').slice(0, 2);

  return (
    <div style={{ background: BG, minHeight: '100vh' }}>
      <div style={{ background: NAVY, padding: '0 48px', height: '60px', display: 'flex', alignItems: 'center', gap: '32px' }}>
        <span onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: WHITE, fontSize: '17px', fontWeight: 800, fontFamily: 'Georgia, serif' }}>
          ⚖️ CLEAR CASE
        </span>
        <div style={{ flex: 1 }} />
        <span onClick={() => navigate('/advocates')} style={{ color: 'rgba(255,255,255,0.75)', fontSize: '14px', cursor: 'pointer' }}>Find an Advocate</span>
        <button className="btn btn-gold" onClick={() => navigate('/register')} style={{ padding: '9px 20px' }}>Register Free</button>
      </div>

      <div style={{ background: NAVY, padding: '32px 48px' }}>
        <div onClick={() => navigate('/advocates')} style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', cursor: 'pointer', marginBottom: '20px' }}>← Back to Advocates</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '40px', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', color: GOLD, fontSize: '28px', fontWeight: 700 }}>
            {initials}
          </div>
          <div>
            <h1 style={{ color: WHITE, fontSize: '28px', fontWeight: 800, fontFamily: 'Georgia, serif', marginBottom: '4px' }}>{displayName}</h1>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '16px' }}>{a.experience_years} years experience • {a.city}, {a.state}</p>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ color: GOLD, fontSize: '20px', fontWeight: 600 }}>{renderStars(a.rating)} {Number(a.rating || 0).toFixed(1)}</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>{a.review_count || 0} reviews</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 48px', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '28px', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ background: WHITE, borderRadius: '14px', padding: '24px', border: '1px solid #E5E7EB' }}>
            <h3 style={{ color: NAVY, fontSize: '16px', fontWeight: 700, fontFamily: 'Georgia, serif', marginBottom: '12px' }}>About</h3>
            <p style={{ color: GRAY, fontSize: '14px', lineHeight: '1.8' }}>{a.bio}</p>
            <div style={{ display: 'flex', gap: '22px', marginTop: '18px', paddingTop: '18px', borderTop: '1px solid #F3F4F6' }}>
              <div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: NAVY }}>{a.cases_handled}</div>
                <div style={{ fontSize: '12px', color: GRAY }}>Cases handled</div>
              </div>
              <div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: NAVY }}>{a.experience_years}</div>
                <div style={{ fontSize: '12px', color: GRAY }}>Years experience</div>
              </div>
              <div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: NAVY }}>{(a.languages || []).length}</div>
                <div style={{ fontSize: '12px', color: GRAY }}>Languages</div>
              </div>
            </div>
          </div>

          <div style={{ background: WHITE, borderRadius: '14px', padding: '24px', border: '1px solid #E5E7EB' }}>
            <h3 style={{ color: NAVY, fontSize: '16px', fontWeight: 700, fontFamily: 'Georgia, serif', marginBottom: '12px' }}>Credentials</h3>
            <div style={{ fontSize: '13px', color: GRAY, marginBottom: '8px' }}>🏛 Bar No: {a.bar_number || 'N/A'}</div>
            <div style={{ fontSize: '13px', color: GRAY, marginBottom: '14px' }}>🗣 {(a.languages || []).join(' · ') || 'English'}</div>
            <div style={{ padding: '12px', background: '#F3F4F6', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '18px' }}>✅</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: NAVY }}>Clear Case Verified Advocate</span>
            </div>
          </div>

          {(a.specializations || a.specs || []).length > 0 && (
            <div style={{ background: WHITE, borderRadius: '14px', padding: '24px', border: '1px solid #E5E7EB' }}>
              <h3 style={{ color: NAVY, fontSize: '16px', fontWeight: 700, fontFamily: 'Georgia, serif', marginBottom: '12px' }}>Practice Areas</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {(a.specializations || a.specs || []).map((spec) => <SpecBadge key={spec} spec={spec} />)}
              </div>
            </div>
          )}

          {(a.reviews || []).length > 0 && (
            <div style={{ background: WHITE, borderRadius: '14px', padding: '24px', border: '1px solid #E5E7EB' }}>
              <h3 style={{ color: NAVY, fontSize: '16px', fontWeight: 700, fontFamily: 'Georgia, serif', marginBottom: '12px' }}>Client Reviews</h3>
              {(a.reviews || []).slice(0, 3).map((review) => (
                <div key={review.review_id || review.client_name} style={{ marginBottom: '18px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: NAVY }}>{review.client_name}</div>
                  <div style={{ fontSize: '13px', color: GRAY, marginBottom: '6px' }}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</div>
                  <div style={{ fontSize: '13px', color: GRAY }}>{review.review_text}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ position: 'sticky', top: '80px' }}>
          <div style={{ background: WHITE, borderRadius: '14px', padding: '24px', border: `2px solid ${GOLD}` }}>
            <div style={{ background: '#FFF8E8', borderRadius: '8px', padding: '12px', textAlign: 'center', marginBottom: '18px' }}>
              <div style={{ fontSize: '22px', fontWeight: 800, color: NAVY }}>FREE</div>
              <div style={{ fontSize: '13px', color: '#7A5A00' }}>30-minute consultation</div>
              <div style={{ fontSize: '12px', color: GRAY, marginTop: '2px' }}>No card · No commitment</div>
            </div>
            <div style={{ fontSize: '13px', color: GRAY, marginBottom: '16px', lineHeight: '1.8' }}>
              ✓ Video, phone, or in-person<br />
              ✓ Advocate reviews your case beforehand<br />
              ✓ Get clarity and a clear plan<br />
              ✓ Option to retain after
            </div>
            <button className="btn btn-gold" onClick={() => navigate(`/book?advocateId=${a.advocate_id}`)} style={{ width: '100%', padding: '14px', fontSize: '15px' }}>Book Free 30 Minutes →</button>
            <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #F3F4F6', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: NAVY, marginBottom: '8px' }}>Or retain {displayName}</div>
              <button className="btn btn-outline" onClick={() => navigate(`/book?advocateId=${a.advocate_id}`)} style={{ width: '100%', padding: '10px', fontSize: '13px' }}>View Retainer Plans</button>
            </div>
          </div>

          <div style={{ background: WHITE, borderRadius: '14px', padding: '24px', border: '1px solid #E5E7EB', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: NAVY }}>Earnings</div>
                <div style={{ fontSize: '12px', color: GRAY }}>Last {earningsPeriod === 'month' ? '30 days' : '12 months'}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={() => setEarningsPeriod('month')} style={{ padding: '8px 10px', borderRadius: '10px', border: `1px solid ${earningsPeriod === 'month' ? NAVY : '#CBD5E1'}`, background: earningsPeriod === 'month' ? '#EFF6FF' : WHITE, color: NAVY, cursor: 'pointer' }}>
                  30d
                </button>
                <button type="button" onClick={() => setEarningsPeriod('year')} style={{ padding: '8px 10px', borderRadius: '10px', border: `1px solid ${earningsPeriod === 'year' ? NAVY : '#CBD5E1'}`, background: earningsPeriod === 'year' ? '#EFF6FF' : WHITE, color: NAVY, cursor: 'pointer' }}>
                  1y
                </button>
              </div>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: NAVY, marginBottom: '18px' }}>{formatCurrency(earnings.total_earnings)}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
              <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '11px', color: GRAY, marginBottom: '8px' }}>Sessions</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: NAVY }}>{earnings.total_sessions || 0}</div>
              </div>
              <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '11px', color: GRAY, marginBottom: '8px' }}>Avg length</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: NAVY }}>{Math.round(earnings.avg_session_length || 0)} mins</div>
              </div>
            </div>
          </div>

          <div style={{ background: WHITE, borderRadius: '14px', padding: '20px', border: '1px solid #E5E7EB', marginTop: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: NAVY, marginBottom: '14px' }}>Availability this week</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
              {[1, 2, 3, 4, 5].map((dayIndex) => {
                const entry = getAvailabilityForDay(dayIndex);
                const isOpen = entry ? Boolean(entry.is_available) : false;
                return (
                  <div key={dayIndex} style={{ borderRadius: '12px', padding: '12px', background: isOpen ? '#DCFCE7' : '#F3F4F6', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: GRAY }}>{dayLabels[dayIndex]}</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: isOpen ? '#166534' : GRAY, marginTop: '6px' }}>{entry ? (isOpen ? 'Open' : 'Busy') : 'Not set'}</div>
                  </div>
                );
              })}
            </div>
            {availability.length === 0 && (
              <div style={{ marginTop: '14px', fontSize: '12px', color: GRAY }}>This advocate has not published weekly availability yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
