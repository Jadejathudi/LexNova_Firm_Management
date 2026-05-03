import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const NAVY = "#0A1628", GOLD = "#C9A84C", BG = "#F8FAFC", DARK = "#1A1A2E", GRAY = "#64748B", WHITE = "#FFFFFF";

const STORIES = [
  { stat: "50M+", sub: "cases pending in Indian courts" },
  { stat: "82%", sub: "of litigants don't know their case status" },
  { stat: "₹0", sub: "transparency in most law firms. We're changing that." },
  { stat: "30 min", sub: "free. No card. Know exactly where you stand." }
];

export default function Landing() {
  const navigate = useNavigate();
  const [storyIdx, setStoryIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStoryIdx((prev) => (prev + 1) % STORIES.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  const s = STORIES[storyIdx];

  return (
    <div>
      {/* Nav */}
      <div style={{ background: NAVY, padding: '0 48px', height: '60px', display: 'flex', alignItems: 'center', gap: '32px', position: 'sticky', top: 0, zIndex: 50 }}>
        <span onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: WHITE, fontSize: '17px', fontWeight: 800, fontFamily: 'Georgia, serif' }}>
          ⚖️ CLEAR CASE
        </span>
        <div style={{ flex: 1 }}></div>
        <span onClick={() => navigate('/advocates')} style={{ color: 'rgba(255,255,255,0.75)', fontSize: '14px', cursor: 'pointer' }}>Find an Advocate</span>
        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px', cursor: 'pointer' }}>For Advocates</span>
        <button className="btn btn-gold" onClick={() => navigate('/register')} style={{ padding: '9px 20px' }}>Register Free</button>
      </div>

      {/* Hero */}
      <div style={{ background: `linear-gradient(135deg,${NAVY} 0%,#0D1440 100%)`, padding: '100px 48px 80px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.03, backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)', backgroundSize: '20px 20px' }}></div>
        <div style={{ position: 'relative', maxWidth: '780px', margin: '0 auto' }}>
          <h1 style={{ color: WHITE, fontSize: '48px', fontWeight: 800, fontFamily: 'Georgia, serif', marginBottom: '16px' }}>
            India's First <span style={{ color: GOLD }}>Transparent</span> Legal Platform
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '20px', marginBottom: '32px' }}>
            Connect directly with verified advocates. Track your case in real-time. No hidden fees, no surprises.
          </p>
          <div style={{ fontSize: '32px', fontWeight: 700, color: GOLD, marginBottom: '8px' }}>{s.stat}</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '16px', marginBottom: '48px' }}>{s.sub}</div>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-gold" onClick={() => navigate('/book')} style={{ padding: '14px 32px', fontSize: '16px' }}>
              Book Free Consultation →
            </button>
            <button className="btn-outline" onClick={() => navigate('/advocates')} style={{ padding: '14px 32px', fontSize: '16px', background: 'transparent', color: WHITE, border: `2px solid ${WHITE}` }}>
              Browse Advocates
            </button>
          </div>
        </div>
      </div>

      {/* Features */}
      <div style={{ background: WHITE, padding: '72px 48px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 800, fontFamily: 'Georgia, serif', textAlign: 'center', marginBottom: '16px' }}>
            Why Choose Clear Case?
          </h2>
          <p style={{ color: GRAY, fontSize: '16px', textAlign: 'center', marginBottom: '48px' }}>
            We're not just another legal app. We're building India's most trusted legal ecosystem.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚖️</div>
              <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px' }}>Verified Advocates</h3>
              <p style={{ color: GRAY }}>All advocates are verified with Bar Council credentials. No fake lawyers.</p>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
              <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px' }}>Real-Time Tracking</h3>
              <p style={{ color: GRAY }}>Track your case progress, hearings, and documents in real-time.</p>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>💰</div>
              <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px' }}>Transparent Pricing</h3>
              <p style={{ color: GRAY }}>Know exactly what you're paying for. No hidden charges.</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ background: NAVY, padding: '72px 48px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ color: WHITE, fontSize: '32px', fontWeight: 800, fontFamily: 'Georgia, serif', marginBottom: '16px' }}>
            Ready to Get Started?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '18px', marginBottom: '32px' }}>
            Join thousands of clients who trust Clear Case for their legal needs.
          </p>
          <button className="btn btn-gold" onClick={() => navigate('/register')} style={{ padding: '16px 40px', fontSize: '18px' }}>
            Create Free Account →
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: DARK, padding: '32px 48px', textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>© 2025 Clear Case Legal Services · Hyderabad · DPDP Act 2023 Compliant</p>
      </div>
    </div>
  );
}
