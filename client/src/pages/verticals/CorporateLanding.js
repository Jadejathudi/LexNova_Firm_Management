import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';
import PublicNavbar from '../../components/PublicNavbar';

const NAVY = '#1C2A40', GOLD = '#3D6FB0', BG = '#F5F5F1', TEAL = '#0E7490';
const GRAD = 'linear-gradient(135deg, #3D6FB0, #2E8E86)';

const MATTERS = [
  'Company incorporation & structuring',
  'Shareholder agreements & disputes',
  'Employment contracts & HR compliance',
  'M&A due diligence & documentation',
  'NCLT / insolvency proceedings',
  'Regulatory compliance & licensing',
];

const JOURNEY = [
  { step: '01', title: 'Describe your matter', desc: 'Fill in your company details and the legal issue you are facing.' },
  { step: '02', title: 'Get matched', desc: 'We match you with a verified corporate law advocate based on your needs.' },
  { step: '03', title: 'Book a consultation', desc: 'Schedule a video, phone, or in-person session at your convenience.' },
  { step: '04', title: 'Ongoing support', desc: 'Your matter is tracked — documents, notes, and updates in one place.' },
];

const BLANK_FORM = { full_name: '', company: '', role: '', state: '', brief: '' };

export default function CorporateLanding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [advocates, setAdvocates] = useState([]);
  const [form, setForm] = useState(BLANK_FORM);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getAdvocates({ spec: 'Corporate' }).then(setAdvocates).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    navigate('/advocates', { state: { spec: 'Corporate', intakeData: { ...form, matter_type: 'corporate' } } });
  };

  return (
    <>
      <PublicNavbar />
      <div style={{ background: BG, minHeight: '100vh' }}>

        {/* Hero */}
        <div style={{ background: '#121C2C', color: '#fff', padding: '72px 40px 60px', textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🏢</div>
          <h1 style={{ fontSize: 42, fontFamily: "'Space Grotesk', sans-serif", margin: '0 0 16px', fontWeight: 700 }}>Legal clarity for your business.</h1>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,.8)', maxWidth: 540, margin: '0 auto 32px', lineHeight: 1.6 }}>
            From incorporation to disputes — verified corporate advocates ready to guide you.
          </p>
          <button onClick={() => document.getElementById('intake-form').scrollIntoView({ behavior: 'smooth' })}
            style={{ background: GRAD, color: '#fff', border: 'none', borderRadius: 10, padding: '14px 32px',
              fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 24px -8px rgba(61,111,176,.5)' }}>
            Start — It's Free →
          </button>
        </div>

        {/* Matters handled */}
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '60px 24px 40px' }}>
          <h2 style={{ color: NAVY, textAlign: 'center', fontSize: 26, marginBottom: 8 }}>What we handle</h2>
          <p style={{ color: '#64748B', textAlign: 'center', marginBottom: 36 }}>Corporate legal matters across all stages of your business lifecycle</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {MATTERS.map((m, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #E2E8F0',
                display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 28, height: 28, borderRadius: '50%', background: TEAL + '20', color: TEAL,
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
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: GRAD, color: '#fff',
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
            <h2 style={{ color: NAVY, textAlign: 'center', fontSize: 26, marginBottom: 8 }}>Matched advocates</h2>
            <p style={{ color: '#64748B', textAlign: 'center', marginBottom: 32 }}>Verified corporate law specialists on ClearCase</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
              {advocates.slice(0, 3).map(a => (
                <div key={a.advocate_id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '20px', cursor: 'pointer' }}
                  onClick={() => navigate(`/advocates/${a.advocate_id}`)}>
                  <div style={{ fontWeight: 700, color: NAVY, fontSize: 15, marginBottom: 4 }}>{a.full_name || a.name}</div>
                  <div style={{ fontSize: 12, color: '#64748B', marginBottom: 8 }}>{a.city}, {a.state} · {a.experience_years}y exp</div>
                  <div style={{ fontSize: 12, color: TEAL, fontWeight: 600 }}>View Profile →</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Intake Form */}
        <div id="intake-form" style={{ maxWidth: 560, margin: '0 auto', padding: '50px 24px 70px' }}>
          <h2 style={{ color: NAVY, textAlign: 'center', fontSize: 26, marginBottom: 8 }}>Tell us about your matter</h2>
          <p style={{ color: '#64748B', textAlign: 'center', marginBottom: 30, fontSize: 14 }}>
            Takes 2 minutes. We'll match you with the right advocate.
          </p>
          <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '28px 28px' }}>
            {[
              { key: 'full_name', label: 'Your Full Name', type: 'text', required: true },
              { key: 'company', label: 'Company Name', type: 'text', required: true },
              { key: 'role', label: 'Your Role', type: 'text', placeholder: 'e.g. Founder, CFO, Legal Head' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#64748B', fontWeight: 600, marginBottom: 5 }}>{f.label}</label>
                <input type={f.type} value={form[f.key]} required={f.required} placeholder={f.placeholder || ''}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
            ))}
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
              <label style={{ display: 'block', fontSize: 13, color: '#64748B', fontWeight: 600, marginBottom: 5 }}>Describe your legal matter</label>
              <textarea value={form.brief} onChange={e => setForm(p => ({ ...p, brief: e.target.value }))} required rows={4}
                placeholder="What is the legal issue you are facing?"
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }} />
            </div>
            <button type="submit" disabled={submitting}
              style={{ width: '100%', padding: '13px', borderRadius: 10, background: NAVY, color: '#fff',
                border: 'none', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>
              Find a Corporate Advocate →
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
