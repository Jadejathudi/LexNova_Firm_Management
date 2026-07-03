import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';
import PublicNavbar from '../../components/PublicNavbar';

const NAVY = '#1C2A40', GOLD = '#3D6FB0', BG = '#F5F5F1', PURPLE = '#7C3AED';
const GRAD = 'linear-gradient(135deg, #3D6FB0, #2E8E86)';

const MATTERS = [
  'Section 143(2) scrutiny assessment notice',
  'Section 148 income escapement & reassessment',
  'TDS defaults and demand notices',
  'ITAT appeals and CIT(A) hearings',
  'Search & seizure (Section 132) proceedings',
  'Penalty waiver and settlement applications',
];

const JOURNEY = [
  { step: '01', title: 'Share your notice', desc: 'Upload your income tax notice or describe your tax matter.' },
  { step: '02', title: 'Expert review', desc: 'A verified income tax advocate reviews your case within 24 hours.' },
  { step: '03', title: 'Strategy session', desc: 'Get a clear action plan: respond, appeal, or settle.' },
  { step: '04', title: 'Full representation', desc: 'Advocate represents you before the AO, CIT(A), or ITAT.' },
];

const BLANK_FORM = { full_name: '', noticeType: '', deadline: '', state: '', brief: '' };

export default function IncomeTaxLanding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [advocates, setAdvocates] = useState([]);
  const [form, setForm] = useState(BLANK_FORM);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getAdvocates({ spec: 'Tax' }).then(setAdvocates).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    navigate('/advocates', { state: { spec: 'Tax', intakeData: { ...form, matter_type: 'tax' } } });
  };

  return (
    <>
      <PublicNavbar />
      <div style={{ background: BG, minHeight: '100vh' }}>

        {/* Hero */}
        <div style={{ background: `linear-gradient(135deg, ${PURPLE} 0%, #4C1D95 100%)`, color: '#fff', padding: '72px 40px 60px', textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>₹</div>
          <h1 style={{ fontSize: 42, fontFamily: "'Space Grotesk', sans-serif", margin: '0 0 16px', fontWeight: 700 }}>Got a tax notice? Don't panic. Prepare.</h1>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,.8)', maxWidth: 540, margin: '0 auto 32px', lineHeight: 1.6 }}>
            Experienced income tax advocates to help you respond, appeal, and resolve.
          </p>
          <button onClick={() => document.getElementById('intake-form').scrollIntoView({ behavior: 'smooth' })}
            style={{ background: 'rgba(255,255,255,.15)', color: '#fff', border: '1px solid rgba(255,255,255,.3)', borderRadius: 10, padding: '14px 32px',
              fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
            Get Help Now →
          </button>
        </div>

        {/* Matters handled */}
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '60px 24px 40px' }}>
          <h2 style={{ color: NAVY, textAlign: 'center', fontSize: 26, marginBottom: 8 }}>Notices and matters we handle</h2>
          <p style={{ color: '#64748B', textAlign: 'center', marginBottom: 36 }}>From scrutiny assessments to ITAT appeals</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {MATTERS.map((m, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #E2E8F0',
                display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 28, height: 28, borderRadius: '50%', background: PURPLE + '20', color: PURPLE,
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
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: PURPLE, color: '#fff',
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
                  <div style={{ fontSize: 12, color: PURPLE, fontWeight: 600 }}>View Profile →</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Intake Form */}
        <div id="intake-form" style={{ maxWidth: 560, margin: '0 auto', padding: '50px 24px 70px' }}>
          <h2 style={{ color: NAVY, textAlign: 'center', fontSize: 26, marginBottom: 8 }}>Describe your tax notice</h2>
          <p style={{ color: '#64748B', textAlign: 'center', marginBottom: 30, fontSize: 14 }}>
            Takes 2 minutes. A tax advocate will review your matter.
          </p>
          <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '28px 28px' }}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#64748B', fontWeight: 600, marginBottom: 5 }}>Your Full Name</label>
              <input type="text" value={form.full_name} required onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#64748B', fontWeight: 600, marginBottom: 5 }}>Notice / Matter Type</label>
              <select value={form.noticeType} onChange={e => setForm(p => ({ ...p, noticeType: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14 }}>
                <option value="">Select type</option>
                <option value="143(2) Scrutiny">143(2) Scrutiny Notice</option>
                <option value="148 Reassessment">148 Reassessment Notice</option>
                <option value="TDS Default">TDS Default / Demand</option>
                <option value="ITAT Appeal">ITAT Appeal</option>
                <option value="Search & Seizure">Search & Seizure (132)</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#64748B', fontWeight: 600, marginBottom: 5 }}>Response Deadline (if any)</label>
              <input type="date" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#64748B', fontWeight: 600, marginBottom: 5 }}>State</label>
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
                placeholder="Describe your tax issue or what the notice says..."
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }} />
            </div>
            <button type="submit" disabled={submitting}
              style={{ width: '100%', padding: '13px', borderRadius: 10, background: PURPLE, color: '#fff',
                border: 'none', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>
              Find a Tax Advocate →
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
