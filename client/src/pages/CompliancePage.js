import React from 'react';
import { useNavigate } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';

const NAVY = '#1B2559', GRAY = '#64748B', BG = '#F4F6FB';

const sections = [
  ['Nature of Platform', 'ClearCase (clearcase.in) is a technology platform. It is not a law firm and does not practice law, provide legal advice, or represent clients in any capacity.'],
  ['No Solicitation', 'This website is not an advertisement for legal services. No solicitation of work is made by this platform or by any advocate listed herein, in compliance with Rule 36 of the Bar Council of India Rules.'],
  ['Independent Advocates', 'All advocates are independently enrolled with their State Bar Councils and maintain independent professional practices. ClearCase does not supervise their legal work.'],
  ['No Ranking or Recommendation', 'ClearCase does not rank, rate, compare, or recommend any advocate. The display of advocates is neutral and informational only.'],
  ['Platform Fees', 'ClearCase charges advocates a platform subscription fee (B2B SaaS). Client facilitation fees, where applicable, are for use of the scheduling technology — not for legal services. Advocate professional fees are entirely separate.'],
  ['Data Protection', 'Personal data is handled under DPDP Act 2023. Session recordings (with user consent only) are stored encrypted. Users may request deletion at any time via privacy@clearcase.in'],
  ['Grievance Redressal', 'Grievance Officer: legal@clearcase.in. Acknowledged within 48 hours, resolved within 30 days. Jurisdiction: Hyderabad, Telangana.'],
];

export default function CompliancePage() {
  const navigate = useNavigate();
  return (
    <div style={{ fontFamily: "'Outfit', 'Inter', sans-serif" }}>
      <PublicNavbar />
      <div style={{ background: BG, minHeight: '100vh', padding: '44px 48px' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <div onClick={() => navigate(-1)} style={{ color: GRAY, fontSize: '14px', cursor: 'pointer', marginBottom: '22px' }}>← Back</div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '34px', color: NAVY, marginBottom: '8px' }}>Compliance & Disclaimer</h1>
          <p style={{ color: GRAY, fontSize: '14px', marginBottom: '28px' }}>As required under the Advocates Act 1961, BCI Rules, and DPDP Act 2023.</p>
          {sections.map(([h, t]) => (
            <div key={h} style={{ background: '#fff', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '22px', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: NAVY, marginBottom: '8px' }}>{h}</h3>
              <p style={{ fontSize: '13px', color: GRAY, lineHeight: 1.8 }}>{t}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
