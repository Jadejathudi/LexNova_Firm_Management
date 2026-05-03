import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../utils/api';

const NAVY = '#0A1628';
const BG = '#F8FAFC';
const WHITE = '#FFFFFF';
const GRAY = '#64748B';
const GOLD = '#C9A84C';

const MATTER_TYPES = ['Criminal', 'Civil', 'Corporate', 'Family', 'Real Estate', 'Other'];
const MODES = [
  { value: 'video', icon: '📹', label: 'Video Call' },
  { value: 'phone', icon: '📞', label: 'Phone Call' },
  { value: 'office', icon: '🏢', label: 'Office Visit' },
];
const TIME_SLOTS = ['10:00 AM', '11:00 AM', '12:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'];

function formatDateLabel(date) {
  return date.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function BookConsultation() {
  const navigate = useNavigate();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const advocateId = query.get('advocateId');

  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [booking, setBooking] = useState(null);
  const [advocate, setAdvocate] = useState(null);
  const [form, setForm] = useState({
    guest_name: '',
    guest_phone: '',
    guest_email: '',
    matter_type: '',
    description: '',
    urgency: 'standard',
    consultation_mode: 'video',
    preferred_date: '',
    preferred_time: '',
  });

  useEffect(() => {
    if (advocateId) {
      fetchAdvocate();
    }
  }, [advocateId]);

  const fetchAdvocate = async () => {
    try {
      const data = await api.getAdvocate(advocateId);
      setAdvocate(data);
    } catch (err) {
      console.error('Failed to load advocate details', err);
    }
  };

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const validateStepOne = () => {
    if (!form.guest_name || form.guest_name.length < 2) {
      setError('Please enter your name (at least 2 characters)');
      return false;
    }
    if (!/^\d{10}$/.test(form.guest_phone)) {
      setError('Please enter a valid 10-digit phone number');
      return false;
    }
    if (form.guest_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.guest_email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!form.matter_type) {
      setError('Please select a matter type');
      return false;
    }
    return true;
  };

  const validateStepTwo = () => {
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

  const nextStep = () => {
    setError('');
    if (step === 1) {
      if (!validateStepOne()) return;
      setStep(2);
    }
  };

  const submitBooking = async () => {
    if (!validateStepTwo()) return;
    setError('');

    if (advocateId) {
      const payload = {
        advocate_id: advocateId,
        client_name: form.guest_name,
        client_phone: form.guest_phone,
        client_email: form.guest_email || null,
        matter_type: form.matter_type,
        brief: form.description,
        urgency: form.urgency,
        preferred_mode: form.consultation_mode,
        preferred_date: form.preferred_date,
        preferred_time: form.preferred_time,
      };

      try {
        const result = await api.createConsultationRequest(payload);
        setBooking(result);
        setStep(3);
      } catch (err) {
        setError(err.message || 'Unable to book consultation. Please try again.');
      }
      return;
    }

    const guestPayload = {
      guest_name: form.guest_name,
      guest_phone: form.guest_phone,
      matter_type: form.matter_type,
      description: form.description,
      urgency: form.urgency,
      consultation_mode: form.consultation_mode,
      preferred_date: form.preferred_date,
      preferred_time: form.preferred_time,
    };

    try {
      const result = await api.guestBook(guestPayload);
      setBooking(result);
      setStep(3);
    } catch (err) {
      setError(err.message || 'Unable to book consultation. Please try again.');
    }
  };

  const getAvailableDates = () => {
    const dates = [];
    for (let i = 1; i <= 14; i += 1) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      if (date.getDay() !== 0) {
        dates.push(date);
      }
    }
    return dates;
  };

  if (step === 3 && booking) {
    return (
      <div className="booking-page" style={{ background: BG, minHeight: '100vh', padding: '40px 24px' }}>
        <div style={{ maxWidth: '540px', margin: '0 auto', background: WHITE, borderRadius: '18px', padding: '32px', boxShadow: '0 24px 70px rgba(15,23,42,0.08)' }}>
          <div style={{ fontSize: '48px', color: GOLD, marginBottom: '16px', textAlign: 'center' }}>✓</div>
          <h2 style={{ textAlign: 'center', marginBottom: '12px' }}>Consultation Booked!</h2>
          <p style={{ color: GRAY, lineHeight: 1.7, textAlign: 'center', marginBottom: '24px' }}>{booking.message}</p>
          <div style={{ fontSize: '14px', color: GRAY, marginBottom: '10px' }}>📅 {form.preferred_date} at {form.preferred_time}</div>
          <div style={{ fontSize: '14px', color: GRAY, marginBottom: '10px' }}>
            {form.consultation_mode === 'video' ? '📹 Video call' : form.consultation_mode === 'phone' ? '📞 Phone call' : '🏢 Office visit'}
          </div>
          {advocate && <div style={{ fontSize: '14px', color: GRAY, marginBottom: '20px' }}>Advocate: {advocate.full_name || advocate.name}</div>}
          <button className="btn btn-navy btn-full" onClick={() => navigate('/register')} style={{ width: '100%', marginBottom: '14px' }}>Create Account to Track Case</button>
          <button className="btn btn-outline btn-full" onClick={() => navigate('/')} style={{ width: '100%', color: GRAY }}>Maybe Later — Continue Browsing</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: BG, minHeight: '100vh', padding: '24px 20px 60px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <button className="back-btn" onClick={() => (step > 1 ? setStep((prev) => prev - 1) : navigate('/'))} style={{ marginBottom: '24px' }}>
          ← Back
        </button>
        <div style={{ background: WHITE, borderRadius: '18px', padding: '28px', boxShadow: '0 24px 70px rgba(15,23,42,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <div style={{ fontSize: '14px', color: GRAY, marginBottom: '6px' }}>Step {step} of 3</div>
              <h2 style={{ fontSize: '28px', margin: 0 }}>Book Your Free Consultation</h2>
              {advocate && <p style={{ color: GRAY, marginTop: '10px' }}>You are booking with {advocate.full_name || advocate.name}.</p>}
            </div>
            <div style={{ width: '120px', padding: '12px 16px', borderRadius: '14px', background: '#FEF3C7', color: '#92400E', fontWeight: 700, textAlign: 'center' }}>
              FREE 30 MIN
            </div>
          </div>

          <div style={{ height: '8px', background: '#E2E8F0', borderRadius: '999px', overflow: 'hidden', marginBottom: '24px' }}>
            <div style={{ width: `${(step / 3) * 100}%`, height: '100%', background: GOLD, transition: 'width 0.3s ease' }} />
          </div>

          {error && <div style={{ color: '#B91C1C', marginBottom: '20px' }}>{error}</div>}

          {step === 1 && (
            <>
              <div style={{ display: 'grid', gap: '18px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Your Name *</label>
                  <input value={form.guest_name} onChange={(e) => update('guest_name', e.target.value)} placeholder="e.g. Rahul Sharma" style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #CBD5E1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Phone Number *</label>
                  <input value={form.guest_phone} maxLength={10} onChange={(e) => update('guest_phone', e.target.value.replace(/\D/g, ''))} placeholder="10-digit mobile number" style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #CBD5E1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Email (optional)</label>
                  <input value={form.guest_email} onChange={(e) => update('guest_email', e.target.value)} placeholder="you@example.com" style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #CBD5E1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Matter Type *</label>
                  <select value={form.matter_type} onChange={(e) => update('matter_type', e.target.value)} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #CBD5E1' }}>
                    <option value="">Select matter type</option>
                    {MATTER_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Brief description (optional)</label>
                  <textarea value={form.description} onChange={(e) => update('description', e.target.value)} rows={4} placeholder="Describe your situation..." style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #CBD5E1' }} />
                  <div style={{ marginTop: '8px', color: GRAY, fontSize: '13px' }}>{form.description.length}/500</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', background: form.urgency === 'standard' ? '#EFF6FF' : '#FFFFFF', borderRadius: '12px', border: `1px solid ${form.urgency === 'standard' ? '#93C5FD' : '#CBD5E1'}`, cursor: 'pointer' }}>
                    <input type="radio" checked={form.urgency === 'standard'} onChange={() => update('urgency', 'standard')} /> Standard
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', background: form.urgency === 'urgent' ? '#FEF3C7' : '#FFFFFF', borderRadius: '12px', border: `1px solid ${form.urgency === 'urgent' ? '#FACC15' : '#CBD5E1'}`, cursor: 'pointer' }}>
                    <input type="radio" checked={form.urgency === 'urgent'} onChange={() => update('urgency', 'urgent')} /> Urgent
                  </label>
                </div>
              </div>
              <button className="btn btn-gold" onClick={nextStep} style={{ marginTop: '28px', width: '100%', padding: '16px' }}>Continue →</button>
            </>
          )}

          {step === 2 && (
            <>
              <div style={{ display: 'grid', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '12px', fontWeight: 600 }}>Meeting mode</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                    {MODES.map((mode) => (
                      <button key={mode.value} type="button" onClick={() => update('consultation_mode', mode.value)} style={{ padding: '16px', borderRadius: '16px', border: `1px solid ${form.consultation_mode === mode.value ? NAVY : '#CBD5E1'}`, background: form.consultation_mode === mode.value ? '#EFF6FF' : WHITE, cursor: 'pointer', textAlign: 'left' }}>
                        <div style={{ fontSize: '18px', marginBottom: '8px' }}>{mode.icon}</div>
                        <div style={{ fontWeight: 700 }}>{mode.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '12px', fontWeight: 600 }}>Select a date</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {getAvailableDates().map((date) => {
                      const value = date.toISOString().split('T')[0];
                      return (
                        <button key={value} type="button" onClick={() => update('preferred_date', value)} style={{ minWidth: '96px', padding: '12px', borderRadius: '14px', border: `1px solid ${form.preferred_date === value ? NAVY : '#CBD5E1'}`, background: form.preferred_date === value ? '#EFF6FF' : WHITE, cursor: 'pointer' }}>
                          <div style={{ fontSize: '12px', color: GRAY }}>{formatDateLabel(date)}</div>
                          <div style={{ fontWeight: 700, marginTop: '4px' }}>{value.split('-').pop()}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {form.preferred_date && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '12px', fontWeight: 600 }}>Choose a time slot</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                      {TIME_SLOTS.map((slot) => (
                        <button key={slot} type="button" onClick={() => update('preferred_time', slot)} style={{ padding: '14px', borderRadius: '14px', border: `1px solid ${form.preferred_time === slot ? GOLD : '#CBD5E1'}`, background: form.preferred_time === slot ? '#FEF3C7' : WHITE, cursor: 'pointer' }}>
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button className="btn btn-gold" onClick={submitBooking} style={{ marginTop: '24px', width: '100%', padding: '16px' }}>Confirm Booking</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
