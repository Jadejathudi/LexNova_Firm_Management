import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import BenchNav from '../../components/bench/BenchNav';
import { C, TIERS, SERVICES, DISCLAIMER, BenchAvatar, TierBadge, benchFetch } from './benchConstants';

function DiscStrip() {
  return (
    <div style={{ background: 'rgba(196,152,42,.06)', borderBottom: `1px solid ${C.borderGold}`, padding: '8px 48px' }}>
      <p style={{ fontSize: 12, color: C.gray, maxWidth: 1100, margin: '0 auto', lineHeight: 1.5 }}>⚖ {DISCLAIMER}</p>
    </div>
  );
}

function fmt(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export default function BenchSchedule() {
  const { judgeId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [judge, setJudge] = useState(null);
  const [slots, setSlots] = useState({ available_dates: [], time_slots: [], blocked_slots: [] });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Check authentication
  const token = localStorage.getItem('clearcase_token');
  const userStr = localStorage.getItem('clearcase_user');
  const user = userStr ? JSON.parse(userStr) : null;

  const [form, setForm] = useState({
    service_type: location.state?.serviceId || 'review',
    selected_date: '',
    selected_slot: '',
    session_format: 'video',
    consent: false,
  });

  const setF = (patch) => setForm(prev => ({ ...prev, ...patch }));

  useEffect(() => {
    // Enforce login requirement
    if (!token) {
      navigate('/login', { state: { from: `/bench/schedule/${judgeId}` } });
      return;
    }

    Promise.all([
      benchFetch(`/judges/${judgeId}`),
      benchFetch(`/judges/${judgeId}/slots`),
    ])
      .then(([j, s]) => { setJudge(j); setSlots(s); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [judgeId, token, navigate]);

  // Re-fetch blocked slots when date changes
  useEffect(() => {
    if (!form.selected_date || !judgeId) return;
    benchFetch(`/judges/${judgeId}/slots?date=${form.selected_date}`)
      .then(s => setSlots(prev => ({ ...prev, blocked_slots: s.blocked_slots })))
      .catch(() => {});
  }, [form.selected_date, judgeId]);

  async function handleSubmit() {
    if (isFull) return setError('This judge is fully booked for the month. Please choose another judge.');
    if (!form.selected_date) return setError('Please select a preferred date.');
    if (!form.selected_slot) return setError('Please select a preferred time slot.');
    if (!form.consent) return setError('Please confirm the session conditions before proceeding.');

    setSubmitting(true);
    setError('');
    try {
      const payload = {
        judge_id: judgeId,
        service_type: form.service_type,
        preferred_date: form.selected_date,
        preferred_slot: form.selected_slot,
        session_format: form.session_format,
      };
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
      const res = await fetch(`${API_BASE}/bench/bookings`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Booking failed');
      }
      
      const result = await res.json();
      // Merge server response with local form so BenchConfirmed has service_type + session_format
      // replace:true so the filled-out form isn't reachable via the browser back button after submit
      navigate(`/bench/confirmed/${result.booking_ref}`, { state: { booking: { ...result, service_type: form.service_type, session_format: form.session_format }, judge }, replace: true });
    } catch (err) {
      setError(err.message || 'Booking failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return (
    <div style={{ fontFamily: "'Jost',sans-serif", background: C.ink, color: C.parchment, minHeight: '100vh' }}>
      <BenchNav />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: C.gray }}>Loading…</div>
    </div>
  );

  if (!judge) return (
    <div style={{ fontFamily: "'Jost',sans-serif", background: C.ink, color: C.parchment, minHeight: '100vh' }}>
      <BenchNav />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <button onClick={() => navigate('/bench/directory')} style={{ background: C.gold, color: C.ink, border: 'none', borderRadius: 3, padding: '10px 24px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Jost',sans-serif" }}>Back to Directory</button>
      </div>
    </div>
  );

  const t = TIERS[judge.tier] || TIERS.junior;
  const isFull = judge.slots_left === 0;

  const inputStyle = {
    background: C.charcoalMid, border: `1px solid ${C.border}`, borderRadius: 3,
    padding: '11px 14px', fontSize: 14, width: '100%', fontFamily: "'Jost',sans-serif",
    outline: 'none', color: C.parchment,
  };

  const labelStyle = { fontSize: 10, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '.1em', display: 'block', marginBottom: 6 };

  return (
    <div style={{ fontFamily: "'Jost',sans-serif", background: C.ink, color: C.parchment, minHeight: '100vh' }}>
      <BenchNav />
      <DiscStrip />

      <div style={{ background: C.ink, minHeight: '100vh', padding: '36px 80px 80px' }}>
        <div onClick={() => navigate(`/bench/judges/${judgeId}`)} style={{ color: C.gray, fontSize: 13, cursor: 'pointer', marginBottom: 24 }}>
          ← Back to Profile
        </div>

        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          {/* Judge strip */}
          <div style={{ background: C.charcoal, border: `1px solid ${t.border}`, borderRadius: 4, padding: 18, marginBottom: 22 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <BenchAvatar judge={judge} size={48} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'EB Garamond',serif", fontSize: 17, fontWeight: 600, color: C.parchment }}>{judge.name}</div>
                <div style={{ fontSize: 12, color: C.gray, marginTop: 2 }}>{t.badge} · {judge.city}</div>
              </div>
              <TierBadge tier={judge.tier} />
            </div>
          </div>

          {/* What happens after booking */}
          <div style={{ background: 'rgba(196,152,42,.06)', border: `1px solid ${C.borderGold}`, borderRadius: 4, padding: 20, marginBottom: 22 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.gold, marginBottom: 10 }}>What happens after you book</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
              {[
                ['📞', 'Within 24 hrs', 'Our team calls you for the intake session — structured notes taken.'],
                ['📋', 'Notes prepared', 'Your case brief is sent to the judge ahead of the session.'],
                ['📹', 'Your session', 'Video or phone call with the retired judge at the time you choose.'],
              ].map(([icon, title, desc]) => (
                <div key={title} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.parchment, marginBottom: 4 }}>{title}</div>
                  <div style={{ fontSize: 11, color: C.gray, lineHeight: 1.55 }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>

          {isFull && (
            <div style={{ background: 'rgba(220,38,38,.08)', border: '1px solid rgba(220,38,38,.3)', borderRadius: 4, padding: 16, marginBottom: 22, textAlign: 'center' }}>
              <div style={{ color: '#FCA5A5', fontSize: 14, fontWeight: 600 }}>This judge is fully booked for the month.</div>
              <div style={{ color: C.gray, fontSize: 12, marginTop: 4 }}>Please check back next month or choose another judge from the directory.</div>
            </div>
          )}

          {/* 1. Service */}
          <div style={{ background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 4, padding: 22, marginBottom: 16 }}>
            <h3 style={{ fontFamily: "'EB Garamond',serif", fontSize: 17, color: C.parchment, marginBottom: 14 }}>1. Choose a service</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {SERVICES.map(s => (
                <div key={s.id} onClick={() => setF({ service_type: s.id })}
                  style={{ display: 'flex', gap: 13, alignItems: 'center', padding: 12, borderRadius: 3, cursor: 'pointer', transition: 'all .15s', border: `1.5px solid ${form.service_type === s.id ? C.gold : C.border}`, background: form.service_type === s.id ? 'rgba(196,152,42,.07)' : 'transparent' }}>
                  <span style={{ fontSize: 20 }}>{s.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.parchment }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: C.gray, marginTop: 1 }}>{s.dur}</div>
                  </div>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${form.service_type === s.id ? C.gold : C.border}`, background: form.service_type === s.id ? C.gold : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {form.service_type === s.id && <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.ink }} />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2+3. Date + Slot */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            {/* Date picker */}
            <div style={{ background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 4, padding: 20 }}>
              <h3 style={{ fontFamily: "'EB Garamond',serif", fontSize: 15, color: C.parchment, marginBottom: 12 }}>2. Preferred date</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 5 }}>
                {slots.available_dates.map(date => {
                  const d = new Date(date + 'T12:00:00');
                  const day = d.toLocaleDateString('en-IN', { weekday: 'short' });
                  const num = d.getDate();
                  const sel = form.selected_date === date;
                  return (
                    <div key={date} onClick={() => setF({ selected_date: date, selected_slot: '' })}
                      style={{ padding: '8px 3px', borderRadius: 2, cursor: 'pointer', textAlign: 'center', transition: 'all .15s', border: `1px solid ${sel ? C.gold : C.border}`, background: sel ? 'rgba(196,152,42,.14)' : 'transparent' }}>
                      <div style={{ fontSize: 9, color: C.gray }}>{day}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: sel ? C.gold : C.parchment, marginTop: 1 }}>{num}</div>
                    </div>
                  );
                })}
              </div>
              {form.selected_date && (
                <div style={{ marginTop: 10, padding: 8, background: C.charcoalMid, borderRadius: 2, fontSize: 11, color: C.gray }}>
                  📅 {fmt(form.selected_date)} selected
                </div>
              )}
            </div>

            {/* Time slot picker */}
            <div style={{ background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 4, padding: 20 }}>
              <h3 style={{ fontFamily: "'EB Garamond',serif", fontSize: 15, color: C.parchment, marginBottom: 12 }}>3. Preferred time</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {(slots.time_slots || []).map(slot => {
                  const isBlocked = slots.blocked_slots.includes(slot);
                  const isSel = form.selected_slot === slot;
                  return (
                    <div key={slot} onClick={() => !isBlocked && setF({ selected_slot: slot })}
                      style={{ padding: 9, borderRadius: 2, textAlign: 'center', fontSize: 12, fontWeight: 600, transition: 'all .15s', cursor: isBlocked ? 'not-allowed' : 'pointer', border: `1px solid ${isBlocked ? 'rgba(255,255,255,.05)' : isSel ? C.gold : C.border}`, background: isBlocked ? 'rgba(255,255,255,.02)' : isSel ? 'rgba(196,152,42,.14)' : 'transparent', color: isBlocked ? C.border : isSel ? C.gold : C.grayLight }}>
                      {isBlocked ? <s>{slot}</s> : isSel ? `✓ ${slot}` : slot}
                    </div>
                  );
                })}
              </div>
              <p style={{ fontSize: 10, color: C.gray, marginTop: 8 }}>Preference — final time confirmed after intake call.</p>
            </div>
          </div>

          {/* 4. Format */}
          <div style={{ background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 4, padding: 20, marginBottom: 14 }}>
            <h3 style={{ fontFamily: "'EB Garamond',serif", fontSize: 15, color: C.parchment, marginBottom: 12 }}>4. Session format</h3>
            <div style={{ display: 'flex', gap: 10 }}>
              {[{ t: 'video', i: '📹', l: 'Video Call' }, { t: 'phone', i: '📞', l: 'Phone Call' }].map(o => (
                <div key={o.t} onClick={() => setF({ session_format: o.t })}
                  style={{ flex: 1, padding: 14, borderRadius: 2, textAlign: 'center', cursor: 'pointer', transition: 'all .15s', border: `1px solid ${form.session_format === o.t ? C.gold : C.border}`, background: form.session_format === o.t ? 'rgba(196,152,42,.09)' : 'transparent' }}>
                  <div style={{ fontSize: 22, marginBottom: 5 }}>{o.i}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: form.session_format === o.t ? C.gold : C.grayLight }}>{o.l}</div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11, color: C.gray, marginTop: 10, lineHeight: 1.5 }}>
              Note: You do not upload documents at this stage. The intake team collects all information from you on the call and prepares the case brief for the judge.
            </p>
          </div>

          {/* 5. Details — only if not logged in */}
          {!token && (
            <div style={{ background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 4, padding: 20, marginBottom: 14 }}>
              <h3 style={{ fontFamily: "'EB Garamond',serif", fontSize: 15, color: C.parchment, marginBottom: 12 }}>5. Your details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={labelStyle}>Full Name *</label>
                  <input value={form.guest_name} onChange={e => setF({ guest_name: e.target.value })} placeholder="Your full name" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Mobile Number *</label>
                  <input value={form.guest_phone} onChange={e => setF({ guest_phone: e.target.value })} placeholder="+91 XXXXX XXXXX" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Email (optional)</label>
                <input value={form.guest_email} onChange={e => setF({ guest_email: e.target.value })} placeholder="your@email.com" style={inputStyle} />
              </div>
              <p style={{ fontSize: 11, color: C.gray, marginTop: 10, lineHeight: 1.5 }}>Your mobile number is how the intake team will reach you to schedule the call.</p>
            </div>
          )}

          {/* Consent */}
          <div style={{ background: 'rgba(196,152,42,.06)', border: `1px solid ${C.borderGold}`, borderRadius: 3, padding: 14, marginBottom: 16 }}>
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.consent} onChange={e => setF({ consent: e.target.checked })}
                style={{ width: 15, height: 15, accentColor: C.gold, flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontSize: 13, color: C.grayLight, lineHeight: 1.65, fontFamily: "'EB Garamond',serif" }}>
                I understand this is a knowledge consultation with a retired judge, not legal advice. I will conduct the session with respect befitting the judge's former office.
              </span>
            </label>
          </div>

          {error && (
            <div style={{ background: 'rgba(220,38,38,.1)', border: '1px solid rgba(220,38,38,.3)', borderRadius: 3, padding: '12px 16px', marginBottom: 14, color: '#FCA5A5', fontSize: 13 }}>
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{ width: '100%', padding: 15, fontSize: 15, justifyContent: 'center', borderRadius: 3, background: submitting ? C.charcoalMid : C.gold, color: submitting ? C.gray : C.ink, border: 'none', fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: "'Jost',sans-serif" }}
          >
            {submitting ? 'Submitting…' : 'Confirm Session Request →'}
          </button>
          <p style={{ fontSize: 12, color: C.gray, textAlign: 'center', marginTop: 10 }}>
            Our team will call you within 24 hours to schedule the intake call.
          </p>
        </div>
      </div>
    </div>
  );
}
