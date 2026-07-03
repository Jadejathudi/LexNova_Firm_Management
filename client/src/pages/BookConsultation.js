import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import Logo from '../components/Logo';

const NAVY = '#1C2A40';
const WHITE = '#FFFFFF';
const BG = '#F5F5F1';
const GRAY = '#5E6577';
const GOLD = '#3D6FB0';
const GRAD = 'linear-gradient(135deg, #3D6FB0, #2E8E86)';

const MATTER_TYPES = [
  { value: 'criminal', label: 'Criminal' },
  { value: 'civil', label: 'Civil' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'family', label: 'Family' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'other', label: 'Other' },
];
const MODES = [
  { value: 'video', icon: '📹', label: 'Video Call' },
  { value: 'phone', icon: '📞', label: 'Phone Call' },
  { value: 'office', icon: '🏢', label: 'Office Visit' },
];
function formatDateLabel(date) {
  return date.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getCalendarDates() {
  const dates = [];
  for (let i = 1; i <= 14; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    dates.push(date); // include all days; server will mark day-off days
  }
  return dates;
}

export default function BookConsultation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const query = new URLSearchParams(location.search);
  const advocateId = query.get('advocateId');

  const [advocate, setAdvocate] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [availData, setAvailData] = useState(null);   // slot availability for selected date
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [form, setForm] = useState({
    client_name: '',
    client_phone: '',
    client_email: '',
    matter_type: '',
    description: '',
    urgency: 'normal',
    consultation_mode: 'video',
    preferred_date: '',
    preferred_time: '',
  });

  // Redirect if no advocate selected
  useEffect(() => {
    if (!advocateId) {
      navigate('/advocates');
    }
  }, [advocateId, navigate]);

  // Redirect to register if not authenticated (first-time users go to sign-up, not login)
  useEffect(() => {
    if (!authLoading && advocateId && !user) {
      navigate('/register', {
        state: {
          from: location.pathname + location.search,
          message: 'Create a free account to book your consultation',
        },
      });
    }
  }, [advocateId, user, authLoading, navigate, location]);

  // Pre-fill user details once loaded
  useEffect(() => {
    if (user) {
      setForm(prev => ({
        ...prev,
        client_name: prev.client_name || user.full_name || '',
        client_email: prev.client_email || user.email || '',
      }));
    }
  }, [user]);

  // Load advocate info
  useEffect(() => {
    if (advocateId) {
      api.getAdvocate(advocateId)
        .then(setAdvocate)
        .catch(() => setError('Unable to load advocate details. Please go back and try again.'));
    }
  }, [advocateId]);

  // Fetch available slots whenever date changes
  useEffect(() => {
    if (!advocateId || !form.preferred_date) { setAvailData(null); return; }
    setSlotsLoading(true);
    setAvailData(null);
    update('preferred_time', ''); // clear previously selected time
    api.getAdvocateAvailableSlots(advocateId, form.preferred_date)
      .then(setAvailData)
      .catch(() => setAvailData(null))
      .finally(() => setSlotsLoading(false));
  }, [advocateId, form.preferred_date]); // eslint-disable-line

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const validate = () => {
    if (!form.client_name || form.client_name.trim().length < 2) {
      setError('Please enter your full name (at least 2 characters)');
      return false;
    }
    if (!/^\d{10}$/.test(form.client_phone.trim())) {
      setError('Please enter a valid 10-digit phone number');
      return false;
    }
    if (form.client_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.client_email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!form.matter_type) {
      setError('Please select a matter type');
      return false;
    }
    if (!form.preferred_date) {
      setError('Please select a preferred date');
      return false;
    }
    if (!form.preferred_time) {
      setError('Please select a preferred time slot');
      return false;
    }
    return true;
  };

  const submitBooking = async () => {
    setError('');
    if (!validate()) return;
    setSubmitting(true);
    try {
      const result = await api.createConsultationRequest({
        advocate_id: advocateId,
        client_name: form.client_name.trim(),
        client_phone: form.client_phone.trim(),
        client_email: form.client_email.trim() || null,
        matter_type: form.matter_type,
        brief: form.description,
        urgency: form.urgency,
        preferred_mode: form.consultation_mode,
        preferred_date: form.preferred_date,
        preferred_time: form.preferred_time,
      });
      setBooking({ ...result, ...form, advocate });
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Unable to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG, fontFamily: 'inherit' }}>Loading...</div>;
  if (!user || !advocateId) return null;

  // ── Confirmation Screen ──────────────────────────────────────────────────────
  if (submitted && booking) {
    const modeIcon = form.consultation_mode === 'video' ? '📹' : form.consultation_mode === 'phone' ? '📞' : '🏢';
    const modeName = MODES.find(m => m.value === form.consultation_mode)?.label;
    const dateFormatted = form.preferred_date
      ? new Date(form.preferred_date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : form.preferred_date;

    return (
      <div style={{ background: BG, minHeight: '100vh', padding: '40px 24px' }}>
        <div style={{ maxWidth: '560px', margin: '0 auto', background: WHITE, borderRadius: '18px', padding: '36px', boxShadow: '0 24px 70px rgba(15,23,42,0.08)' }}>
          <div style={{ fontSize: '52px', textAlign: 'center', marginBottom: '16px' }}>✅</div>
          <h2 style={{ textAlign: 'center', color: NAVY, marginBottom: '8px', fontSize: '22px' }}>Consultation Scheduled!</h2>
          <p style={{ color: GRAY, lineHeight: 1.6, textAlign: 'center', marginBottom: '24px', fontSize: '14px' }}>
            Your appointment is confirmed. Both you and the advocate can join at the scheduled time.
          </p>

          {/* Video Meeting Join Block — video only */}
          {form.consultation_mode === 'video' && booking.meeting_link && (
            <div style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid #BFDBFE', marginBottom: '20px' }}>
              <div style={{ background: '#EFF6FF', padding: '16px 20px', textAlign: 'center' }}>
                <div style={{ fontWeight: 700, color: '#1D4ED8', fontSize: '15px', marginBottom: '4px' }}>📹 Your Video Meeting Room</div>
                <div style={{ fontSize: '12px', color: '#3B82F6', marginBottom: '14px', lineHeight: 1.6 }}>
                  📅 Please join on <strong>{form.preferred_date ? new Date(form.preferred_date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}</strong> at <strong>{form.preferred_time}</strong><br />
                  Sign in with your own Google account to enter the meeting.
                </div>
                <a
                  href={booking.meeting_link}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-block', padding: '12px 28px',
                    background: '#1A73E8', color: '#fff',
                    borderRadius: '10px', fontWeight: 700, fontSize: '15px',
                    textDecoration: 'none',
                  }}
                >
                  Join Video Meeting →
                </a>
              </div>
              <div style={{ padding: '10px 16px', background: '#F0F7FF', borderTop: '1px solid #BFDBFE', fontSize: '11px', color: '#60A5FA', fontFamily: 'monospace', wordBreak: 'break-all', textAlign: 'center', letterSpacing: '0.02em' }}>
                {booking.meeting_link}
              </div>
            </div>
          )}

          {/* Phone / Office info */}
          {form.consultation_mode === 'phone' && (
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '14px', padding: '18px', marginBottom: '20px' }}>
              <div style={{ fontWeight: 700, color: '#166534', fontSize: '14px', marginBottom: '4px' }}>📞 Phone Consultation</div>
              <div style={{ fontSize: '13px', color: '#15803D' }}>The advocate will call you at <strong>{form.client_phone}</strong> at the scheduled time.</div>
            </div>
          )}
          {form.consultation_mode === 'office' && (
            <div style={{ background: '#FFF8E8', border: '1px solid #FDE68A', borderRadius: '14px', padding: '18px', marginBottom: '20px' }}>
              <div style={{ fontWeight: 700, color: '#92400E', fontSize: '14px', marginBottom: '4px' }}>🏢 In-Person Appointment</div>
              <div style={{ fontSize: '13px', color: '#92400E' }}>Visit the advocate's chambers at the scheduled time. Check your dashboard for contact details.</div>
            </div>
          )}

          {/* Booking Summary */}
          <div style={{ background: '#F1F5F9', borderRadius: '14px', padding: '18px', marginBottom: '20px', fontSize: '14px' }}>
            <div style={{ fontWeight: 700, color: NAVY, marginBottom: '12px', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Appointment Details</div>
            <div style={{ display: 'grid', gap: '8px', color: GRAY }}>
              <div>🎯 <strong>Advocate:</strong> {advocate?.full_name || advocate?.name || 'Your selected advocate'}</div>
              <div>📋 <strong>Matter:</strong> {MATTER_TYPES.find(m => m.value === form.matter_type)?.label || form.matter_type}</div>
              <div>📅 <strong>Date:</strong> {dateFormatted}</div>
              <div>🕐 <strong>Time:</strong> {form.preferred_time} (30 min)</div>
              <div>{modeIcon} <strong>Mode:</strong> {modeName}</div>
            </div>
          </div>

          <div style={{ background: '#DCFCE7', borderRadius: '10px', padding: '12px 16px', marginBottom: '24px', color: '#166534', fontSize: '13px', fontWeight: 600 }}>
            ✅ Status: Confirmed — view anytime in your dashboard
          </div>

          <button
            className="btn btn-navy"
            onClick={() => navigate('/dashboard')}
            style={{ width: '100%', padding: '14px', marginBottom: '12px', fontSize: '15px' }}
          >
            Go to My Dashboard →
          </button>
          <button
            className="btn btn-outline"
            onClick={() => navigate('/advocates')}
            style={{ width: '100%', padding: '14px', color: GRAY }}
          >
            Browse More Advocates
          </button>
        </div>
      </div>
    );
  }

  // ── Booking Form ─────────────────────────────────────────────────────────────
  return (
    <div style={{ background: BG, minHeight: '100vh' }}>
      {/* Navbar */}
      <div style={{ background: NAVY, padding: '0 48px', height: '60px', display: 'flex', alignItems: 'center', gap: '32px', position: 'sticky', top: 0, zIndex: 50 }}>
        <span
          onClick={() => navigate('/')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: WHITE, fontSize: '17px', fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif" }}
        >
          <Logo size={22} />
          ClearCase
        </span>
        <div style={{ flex: 1 }} />
        <span onClick={() => navigate('/advocates')} style={{ color: 'rgba(255,255,255,0.75)', fontSize: '14px', cursor: 'pointer' }}>
          Find an Advocate
        </span>
      </div>

      <div style={{ padding: '24px 20px 80px' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          <button className="back-btn" onClick={() => navigate(-1)} style={{ marginBottom: '20px' }}>
            ← Back
          </button>

          <div style={{ background: WHITE, borderRadius: '18px', padding: '32px', boxShadow: '0 24px 70px rgba(15,23,42,0.08)' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <h2 style={{ fontSize: '22px', color: NAVY, margin: '0 0 6px' }}>Book a Free Consultation</h2>
                {advocate && (
                  <p style={{ color: GRAY, fontSize: '14px', margin: 0 }}>
                    with <strong>{advocate.full_name || advocate.name}</strong>
                    {advocate.state ? ` · ${advocate.state}` : ''}
                    {advocate.experience_years ? ` · ${advocate.experience_years} yrs exp.` : ''}
                  </p>
                )}
              </div>
              <div style={{ padding: '10px 18px', borderRadius: '12px', background: '#FEF3C7', color: '#92400E', fontWeight: 700, fontSize: '13px', whiteSpace: 'nowrap' }}>
                FREE · 30 MIN
              </div>
            </div>

            {error && (
              <div style={{ color: '#B91C1C', marginBottom: '20px', padding: '12px 16px', background: '#FEF2F2', borderRadius: '10px', fontSize: '14px' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'grid', gap: '20px' }}>

              {/* ── Contact Details ── */}
              <div>
                <div style={{ fontWeight: 700, color: NAVY, marginBottom: '12px', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Contact Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px', color: NAVY }}>Full Name *</label>
                    <input
                      type="text"
                      value={form.client_name}
                      onChange={e => update('client_name', e.target.value)}
                      placeholder="Your full name"
                      style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #CBD5E1', fontSize: '14px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px', color: NAVY }}>Phone Number *</label>
                    <input
                      type="tel"
                      value={form.client_phone}
                      onChange={e => update('client_phone', e.target.value)}
                      placeholder="10-digit mobile"
                      style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #CBD5E1', fontSize: '14px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
                <div style={{ marginTop: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px', color: NAVY }}>Email Address</label>
                  <input
                    type="email"
                    value={form.client_email}
                    onChange={e => update('client_email', e.target.value)}
                    placeholder="your@email.com"
                    style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #CBD5E1', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                  <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>
                    Optional — used for follow-up communication only.
                  </div>
                </div>
              </div>

              {/* ── Matter Details ── */}
              <div>
                <div style={{ fontWeight: 700, color: NAVY, marginBottom: '12px', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Matter Details</div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px', color: NAVY }}>Matter Type *</label>
                  <select
                    value={form.matter_type}
                    onChange={e => update('matter_type', e.target.value)}
                    style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #CBD5E1', fontSize: '14px', background: WHITE }}
                  >
                    <option value="">Select matter type</option>
                    {MATTER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div style={{ marginTop: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px', color: NAVY }}>Brief Description</label>
                  <textarea
                    value={form.description}
                    onChange={e => update('description', e.target.value)}
                    rows={3}
                    placeholder="Briefly describe your situation (optional)…"
                    style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #CBD5E1', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
                  {[{ v: 'normal', label: 'Standard', bg: '#EFF6FF', border: '#93C5FD' }, { v: 'high', label: 'Urgent ⚡', bg: '#FEF3C7', border: '#FACC15' }].map(opt => (
                    <label key={opt.v} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', background: form.urgency === opt.v ? opt.bg : WHITE, borderRadius: '10px', border: `1.5px solid ${form.urgency === opt.v ? opt.border : '#CBD5E1'}`, cursor: 'pointer', fontSize: '14px' }}>
                      <input type="radio" checked={form.urgency === opt.v} onChange={() => update('urgency', opt.v)} style={{ accentColor: NAVY }} />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* ── Consultation Mode ── */}
              <div>
                <div style={{ fontWeight: 700, color: NAVY, marginBottom: '12px', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Consultation Mode</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {MODES.map(mode => (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => update('consultation_mode', mode.value)}
                      style={{
                        padding: '16px 10px',
                        borderRadius: '12px',
                        border: `1.5px solid ${form.consultation_mode === mode.value ? NAVY : '#CBD5E1'}`,
                        background: form.consultation_mode === mode.value ? '#EFF6FF' : WHITE,
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ fontSize: '22px', marginBottom: '6px' }}>{mode.icon}</div>
                      <div style={{ fontWeight: form.consultation_mode === mode.value ? 700 : 500, fontSize: '13px', color: NAVY }}>{mode.label}</div>
                    </button>
                  ))}
                </div>
                {form.consultation_mode === 'video' && (
                  <div style={{ marginTop: '10px', padding: '10px 14px', background: '#EFF6FF', borderRadius: '8px', fontSize: '12px', color: '#1D4ED8', lineHeight: 1.5 }}>
                    📹 A video meeting room is created instantly on booking. Use your Google account to sign in and join — no Clear Case login needed inside the meeting.
                  </div>
                )}
              </div>

              {/* ── Date Selection ── */}
              <div>
                <div style={{ fontWeight: 700, color: NAVY, marginBottom: '12px', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Preferred Date *</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {getCalendarDates().map(date => {
                    const value = date.toISOString().split('T')[0];
                    const selected = form.preferred_date === value;
                    const isSunday = date.getDay() === 0;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => !isSunday && update('preferred_date', value)}
                        disabled={isSunday}
                        style={{
                          minWidth: '80px',
                          padding: '10px 8px',
                          borderRadius: '12px',
                          border: `1.5px solid ${selected ? NAVY : '#CBD5E1'}`,
                          background: selected ? '#EFF6FF' : isSunday ? '#F8FAFC' : WHITE,
                          cursor: isSunday ? 'not-allowed' : 'pointer',
                          textAlign: 'center',
                          opacity: isSunday ? 0.4 : 1,
                        }}
                      >
                        <div style={{ fontSize: '10px', color: selected ? NAVY : GRAY, marginBottom: '2px' }}>{formatDateLabel(date)}</div>
                        <div style={{ fontWeight: 700, fontSize: '17px', color: selected ? NAVY : isSunday ? GRAY : NAVY }}>{value.split('-').pop()}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Time Slot Selection — live availability ── */}
              {form.preferred_date && (
                <div>
                  <div style={{ fontWeight: 700, color: NAVY, marginBottom: '8px', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Available Times *
                  </div>

                  {slotsLoading && (
                    <div style={{ padding: '20px', textAlign: 'center', color: GRAY, fontSize: '13px' }}>
                      Checking availability…
                    </div>
                  )}

                  {!slotsLoading && availData && !availData.is_available && (
                    <div style={{ padding: '16px', background: '#FEF2F2', borderRadius: '10px', fontSize: '13px', color: '#B91C1C', fontWeight: 600 }}>
                      ❌ Advocate is not available on this day. Please select another date.
                    </div>
                  )}

                  {!slotsLoading && availData?.is_available && availData.slots.length === 0 && (
                    <div style={{ padding: '16px', background: '#FEF9C3', borderRadius: '10px', fontSize: '13px', color: '#92400E', fontWeight: 600 }}>
                      ⚠️ All slots are fully booked for this day. Please choose another date.
                    </div>
                  )}

                  {!slotsLoading && availData?.is_available && availData.slots.length > 0 && (
                    <>
                      {availData.working_hours && (
                        <div style={{ fontSize: '12px', color: GRAY, marginBottom: '10px' }}>
                          🕐 Working hours: {availData.working_hours.start_display} – {availData.working_hours.end_display}
                          &nbsp;·&nbsp;
                          <span style={{ color: availData.available_count > 0 ? '#15803D' : '#B91C1C', fontWeight: 600 }}>
                            {availData.available_count} slot{availData.available_count !== 1 ? 's' : ''} available
                          </span>
                        </div>
                      )}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                        {availData.slots.map(slot => {
                          const selected = form.preferred_time === slot.time_display;
                          return (
                            <button
                              key={slot.time_24}
                              type="button"
                              onClick={() => !slot.is_booked && update('preferred_time', slot.time_display)}
                              disabled={slot.is_booked}
                              style={{
                                padding: '10px 6px',
                                borderRadius: '10px',
                                border: `1.5px solid ${selected ? GOLD : slot.is_booked ? '#E2E8F0' : '#CBD5E1'}`,
                                background: selected ? '#FEF3C7' : slot.is_booked ? '#F8FAFC' : WHITE,
                                cursor: slot.is_booked ? 'not-allowed' : 'pointer',
                                textAlign: 'center',
                                opacity: slot.is_booked ? 0.5 : 1,
                              }}
                            >
                              <div style={{ fontSize: '13px', fontWeight: selected ? 700 : 500, color: slot.is_booked ? '#CBD5E1' : NAVY }}>
                                {slot.time_display}
                              </div>
                              {slot.is_booked && (
                                <div style={{ fontSize: '10px', color: '#CBD5E1', marginTop: '2px' }}>Booked</div>
                              )}
                              {!slot.is_booked && selected && (
                                <div style={{ fontSize: '10px', color: GOLD, marginTop: '2px', fontWeight: 700 }}>Selected ✓</div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <button
              className="btn btn-gold"
              onClick={submitBooking}
              disabled={submitting}
              style={{ marginTop: '28px', width: '100%', padding: '16px', fontSize: '16px', fontWeight: 700, opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? 'Submitting…' : 'Request Consultation →'}
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}
