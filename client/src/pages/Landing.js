import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      <div className="landing-logo">⚖️</div>
      <h1 className="landing-title">LEX <span>NOVA</span></h1>
      <p className="landing-subtitle">Progressive Legal Services</p>
      <p className="landing-tagline">"Your case. Your right to know."</p>

      <div className="landing-buttons">
        <button className="btn btn-gold btn-full" onClick={() => navigate('/book')}>
          Book Free Consultation
        </button>
        <button className="btn landing-outline-btn btn-full" onClick={() => navigate('/login')}>
          Login / Sign Up
        </button>
      </div>
    </div>
  );
}
