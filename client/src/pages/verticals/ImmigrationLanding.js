import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';
import PublicNavbar from '../../components/PublicNavbar';

const NAVY = '#1B2559', GOLD = '#C9A84C', BG = '#F4F6FB', BLUE = '#0369A1';

const MATTERS = [
  'Visa refusals and appeal proceedings',
  'OCI card application and renunciation',
  'Passport impounding or revocation',
  'Work permit and employment visa issues',
  'Citizenship acquisition and surrender',
  'Foreign national detention & FRRO matters',
];

const JOURNEY = [
  { step: '01', title: 'Describe your situation', desc: 'Share the immigration matter you are facing — visa refusal, OCI, or otherwise.' },
  { step: '02', title: 'Advocate match', desc: 'We match you with an immigration advocate with relevant country experience.' },
  { step: '03', title: 'Consultation', desc: 'Get a clear assessment of your options and the path forward.' },
  { step: '04', title: 'Application & appeals', desc: 'Advocate handles filings, correspondence, and tribunal appearances.' },
];

const BLANK_FORM = { full_name: '', matterDetail: '', country: '', state: '', brief: '' };

export default function ImmigrationLanding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [advocates, setAdvocates] = useState([]);
  const [form, setForm] = useState(BLANK_FORM);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getAdvocates({ spec: 'Immigration' }).then(setAdvocates).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    navigate('/advocates', { state: { spec: 'Immigration', intakeData: { ...form, matter_type: 'immigration' } } });
  };

  return (
    <>
      <PublicNavbar />
      <div style={{ background: BG, minHeight: '100vh' }}>

        {/* Hero */}
        <div style={{ background: `linear-gradient(135deg, ${BLUE} 0%, #1E3A5F 100%)`, color: '#fff', padding: '72px 40px 60px', textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>✈</div>
          <h1 style={{ fontSize: 42, fontFamily: 'Georgia, serif', margin: '0 0 16px', fontWeight: 700 }}>Visas, OCI, passports — handled with clarity.</h1>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,.8)', maxWidth: 540, margin: '0 auto 32px', lineHeight: 1.6 }}>
            Immigration advocates who know Indian and international law — ready to help.
          </p>
          <button onClick={() => document.getElementById('intake-form').scrollIntoView({ behavior: 'smooth' })}
            style={{ background: GOLD, color: NAVY, border: 'none', borderRadius: 10, padding: '14px 32px',
              fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
            Get Help Now →
          </button>
        </div>

        {/* Matters handled */}
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '60px 24px 40px' }}>
          <h2 style={{ color: NAVY, textAlign: 'center', fontSize: 26, marginBottom: 8 }}>Immigration matters we handle</h2>
          <p style={{ color: '#64748B', textAlign: 'center', marginBottom: 36 }}>Indian immigration law across borders and jurisdiction</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {MATTERS.map((m, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #E2E8F0',
                display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 28, height: 28, borderRadius: '50%', background: BLUE + '20', color: BLUE,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>✓</span>
                <span style={{ color: '#334155', fontSize: 14, fontWeight: 500 }}>{m}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Journey */}
        <div style={{ background: '#fff', padding: '50px 24px' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <h2 style={{ color: NAVY, textAlign: 'center', fontSize: 26, marginBottom: 36 }}>How it works</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 20 }}>
              {JOURNEY.map((j, i) => (
                <div key={i} style={{ textAlign: 'center', padding: '20px 16px' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: BLUE, color: GOLD,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800,
                    margin: '0 auto 14px' }}>{j.step}</div>
                  <div style={{ fontWeight: 700, color: NAVY, marginBottom: 6, fontSize: 15 }}>{j.title}</div>
                  <div style={{ color: '#64748B', fontSize: 13, lineHeight: 1.5 }}>{j.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Advocates */}
        {advocates.length > 0 && (
          <div style={{ maxWidth: 960, margin: '0 auto', padding: '50px 24px 30px' }}>
            <h2 style={{ color: NAVY, textAlign: 'center', fontSize: 26, marginBottom: 32 }}>Matched advocates</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
              {advocates.slice(0, 3).map(a => (
                <div key={a.advocate_id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '20px', cursor: 'pointer' }}
                  onClick={() => navigate(`/advocates/${a.advocate_id}`)}>
                  <div style={{ fontWeight: 700, color: NAVY, fontSize: 15, marginBottom: 4 }}>{a.full_name || a.name}</div>
                  <div style={{ fontSize: 12, color: '#64748B', marginBottom: 8 }}>{a.city}, {a.state} · {a.experience_years}y exp</div>
                  <div style={{ fontSize: 12, color: BLUE, fontWeight: 600 }}>View Profile →</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Intake Form */}
        <div id="intake-form" style={{ maxWidth: 560, margin: '0 auto', padding: '50px 24px 70px' }}>
          <h2 style={{ color: NAVY, textAlign: 'center', fontSize: 26, marginBottom: 8 }}>Tell us about your immigration matter</h2>
          <p style={{ color: '#64748B', textAlign: 'center', marginBottom: 30, fontSize: 14 }}>
            Takes 2 minutes. An immigration advocate will be matched to you.
          </p>
          <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '28px 28px' }}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#64748B', fontWeight: 600, marginBottom: 5 }}>Your Full Name</label>
              <input type="text" value={form.full_name} required onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#64748B', fontWeight: 600, marginBottom: 5 }}>Immigration Matter</label>
              <select value={form.matterDetail} onChange={e => setForm(p => ({ ...p, matterDetail: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14 }}>
                <option value="">Select matter type</option>
                <option value="Visa Refusal">Visa Refusal / Rejection</option>
                <option value="OCI">OCI Card Application / Issue</option>
                <option value="Passport">Passport Impounding / Revocation</option>
                <option value="Work Permit">Work Permit / Employment Visa</option>
                <option value="Citizenship">Citizenship Acquisition / Surrender</option>
                <option value="FRRO">FRRO / Foreigners Registration</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#64748B', fontWeight: 600, marginBottom: 5 }}>Country Involved</label>
              <input type="text" value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))} placeholder="e.g. USA, UK, Canada"
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#64748B', fontWeight: 600, marginBottom: 5 }}>Your State (India)</label>
              <select value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14 }}>
                <option value="">Select state</option>
                {['Andhra Pradesh','Delhi','Karnataka','Maharashtra','Telangana','Tamil Nadu','Gujarat','Rajasthan','West Bengal','Kerala'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 22 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#64748B', fontWeight: 600, marginBottom: 5 }}>Brief description</label>
              <textarea value={form.brief} onChange={e => setForm(p => ({ ...p, brief: e.target.value }))} required rows={4}
                placeholder="Describe your immigration situation..."
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }} />
            </div>
            <button type="submit" disabled={submitting}
              style={{ width: '100%', padding: '13px', borderRadius: 10, background: BLUE, color: '#fff',
                border: 'none', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>
              Find an Immigration Advocate →
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
