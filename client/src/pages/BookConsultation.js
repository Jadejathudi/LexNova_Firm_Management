import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

const MATTER_TYPES = ['Criminal', 'Civil', 'Corporate', 'Family', 'Real Estate', 'Other'];
const MODES = [
  { value: 'video', icon: '📹', label: 'Video Call' },
  { value: 'phone', icon: '📞', label: 'Phone' },
  { value: 'office', icon: '🏢', label: 'In Office' },
];
const TIME_SLOTS = ['10:00 AM', '11:00 AM', '12:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'];

export default function BookConsultation() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [booking, setBooking] = useState(null);
  const [form, setForm] = useState({
    guest_name: '', guest_phone: '', matter_type: '', description: '', urgency: 'standard',
    consultation_mode: 'video', preferred_date: '', preferred_time: '',
  });

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const nextStep = () => {
    setError('');
    if (step === 1) {
      if (!form.guest_name || form.guest_name.length < 2) return setError('Please enter your name (min 2 characters)');
      if (!/^\d{10}$/.test(form.guest_phone)) return setError('Please enter a valid 10-digit phone number');
      if (!form.matter_type) return setError('Please select a matter type');
    }
    if (step === 2) {
      if (!form.preferred_date) return setError('Please select a date');
      if (!form.preferred_time) return setError('Please select a time slot');
    }
    setStep(s => s + 1);
  };

  const submitBooking = async () => {
    try {
      setError('');
      const result = await api.guestBook(form);
      setBooking(result);
      setStep(3);
    } catch (err) {
      setError(err.message);
    }
  };

  // Generate dates for next 14 days
  const getAvailableDates = () => {
    const dates = [];
    for (let i = 1; i <= 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      if (d.getDay() !== 0) dates.push(d); // Skip Sundays
    }
    return dates;
  };

  if (step === 3 && booking) {
    return (
      <div className="booking-page">
        <div className="confirmation">
          <div className="confirm-icon">✓</div>
          <h2 className="confirm-title">Consultation Booked!</h2>
          <p style={{ color: '#64748B', marginBottom: 24 }}>Your free 30-min consultation is confirmed.</p>
          <div className="confirm-detail">📅 {form.preferred_date} at {form.preferred_time}</div>
          <div className="confirm-detail">
            {form.consultation_mode === 'video' ? '📹' : form.consultation_mode === 'phone' ? '📞' : '🏢'}
            {' '}{form.consultation_mode === 'video' ? 'Video Call (link sent via SMS)' : form.consultation_mode === 'phone' ? 'Phone Call' : 'Office Visit'}
          </div>
          <div className="confirm-detail">👤 Advocate assigned within 2 hours</div>
          <hr style={{ margin: '24px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />
          <p style={{ color: '#64748B', marginBottom: 16 }}>Create an account to track your case after the consultation.</p>
          <button className="btn btn-navy btn-full" onClick={() => navigate('/register')} style={{ marginBottom: 12 }}>
            Create My Account
          </button>
          <button className="btn btn-full" onClick={() => navigate('/')} style={{ color: '#64748B' }}>
            Maybe Later — Skip
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-page">
      <button className="back-btn" onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/')}>
        ← Back
      </button>
      <div className="step-label">Step {step} of 3</div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${(step / 3) * 100}%` }} />
      </div>

      {error && <div className="error-msg">{error}</div>}

      {step === 1 && (
        <>
          <h2>Tell us about your matter</h2>
          <p className="subtitle">No signup needed. Free. Confidential.</p>

          <div className="form-group">
            <label>Your Name *</label>
            <input placeholder="e.g. Rahul Sharma" value={form.guest_name}
              onChange={e => update('guest_name', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Phone Number *</label>
            <input placeholder="10-digit number" value={form.guest_phone} maxLength={10}
              onChange={e => update('guest_phone', e.target.value.replace(/\D/g, ''))} />
          </div>
          <div className="form-group">
            <label>Matter Type *</label>
            <div className="radio-group">
              {MATTER_TYPES.map(t => (
                <label key={t} className={`radio-option ${form.matter_type === t.toLowerCase() ? 'selected' : ''}`}
                  onClick={() => update('matter_type', t.toLowerCase())}>
                  <input type="radio" name="matter_type" /> {t}
                </label>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>Brief description (optional)</label>
            <textarea rows={3} maxLength={500} placeholder="Describe your situation..."
              value={form.description} onChange={e => update('description', e.target.value)} />
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>{form.description.length}/500</div>
          </div>
          <div className="form-group">
            <label>Urgency</label>
            <div style={{ display: 'flex', gap: 12 }}>
              {['standard', 'urgent'].map(u => (
                <label key={u} className={`radio-option ${form.urgency === u ? 'selected' : ''}`}
                  style={{ flex: 1 }} onClick={() => update('urgency', u)}>
                  <input type="radio" name="urgency" /> {u === 'standard' ? '📋 Standard' : '🚨 Urgent'}
                </label>
              ))}
            </div>
          </div>
          <button className="btn btn-gold btn-full" onClick={nextStep}>Next →</button>
        </>
      )}

      {step === 2 && (
        <>
          <h2>Choose how you'd like to meet</h2>
          <div className="mode-selector">
            {MODES.map(m => (
              <div key={m.value} className={`mode-option ${form.consultation_mode === m.value ? 'selected' : ''}`}
                onClick={() => update('consultation_mode', m.value)}>
                <div className="icon">{m.icon}</div>
                <div className="label">{m.label}</div>
              </div>
            ))}
          </div>

          <h3 style={{ marginBottom: 12 }}>Pick a date</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
            {getAvailableDates().map(d => {
              const str = d.toISOString().split('T')[0];
              const label = d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
              return (
                <div key={str} className={`time-slot ${form.preferred_date === str ? 'selected' : ''}`}
                  onClick={() => update('preferred_date', str)}>
                  {label}
                </div>
              );
            })}
          </div>

          {form.preferred_date && (
            <>
              <h3 style={{ marginBottom: 12 }}>Available Slots</h3>
              <div className="time-slots">
                {TIME_SLOTS.map(t => (
                  <div key={t} className={`time-slot ${form.preferred_time === t ? 'selected' : ''}`}
                    onClick={() => update('preferred_time', t)}>
                    {t}
                  </div>
                ))}
              </div>
            </>
          )}

          <button className="btn btn-gold btn-full" style={{ marginTop: 24 }} onClick={() => { nextStep(); submitBooking(); }}>
            Confirm Booking
          </button>
        </>
      )}
    </div>
  );
}
