import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

const NAVY = '#1C2A40';
const GRAY = '#64748B';
const BORDER = '#E2E8F0';
const BLUE = '#3D6FB0';
const SPEC_OPTIONS = ['Criminal', 'Civil', 'Family', 'Corporate', 'Banking', 'Real Estate', 'Consumer', 'Revenue'];

const emptyForm = {
  full_name: '',
  email: '',
  phone: '',
  experience_years: '',
  state: '',
  city: '',
  bio: '',
  languages: '',
  specializations: [],
  profile_photo: '',
  bar_number: '',
  is_available: true,
};

export default function AdvocateSelfProfile() {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    api.getMyAdvocateProfile()
      .then((data) => {
        if (!mounted) return;
        setForm({
          full_name: data.full_name || '',
          email: data.email || '',
          phone: data.phone || '',
          experience_years: data.experience_years || '',
          state: data.state || '',
          city: data.city || '',
          bio: data.bio || '',
          languages: Array.isArray(data.languages) ? data.languages.join(', ') : '',
          specializations: Array.isArray(data.specializations) ? data.specializations : [],
          profile_photo: data.profile_photo || '',
          bar_number: data.bar_number || '',
          is_available: Boolean(data.is_available),
        });
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.message || 'Unable to load advocate profile');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, []);

  function toggleSpec(spec) {
    setForm((prev) => ({
      ...prev,
      specializations: prev.specializations.includes(spec)
        ? prev.specializations.filter((item) => item !== spec)
        : [...prev.specializations, spec],
    }));
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, profile_photo: String(reader.result || '') }));
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.updateMyAdvocateProfile({
        ...form,
        experience_years: Number(form.experience_years || 0),
        languages: form.languages.split(',').map((item) => item.trim()).filter(Boolean),
        specializations: form.specializations,
      });
      setMessage('Advocate profile updated successfully.');
    } catch (err) {
      setError(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const photoPreview = useMemo(() => form.profile_photo || '', [form.profile_photo]);

  if (loading) return <div style={{ padding: 40, color: GRAY }}>Loading advocate profile…</div>;

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, color: NAVY }}>Advocate Profile</h2>
          <div style={{ color: GRAY, fontSize: 14, marginTop: 4 }}>Manage your professional details and visibility.</div>
        </div>
        <button onClick={() => navigate('/profile')} style={{ border: `1px solid ${BORDER}`, background: '#fff', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', color: NAVY, fontWeight: 700 }}>Back to My Profile</button>
      </div>

      {message && <div style={{ background: '#ECFDF5', border: '1px solid #86EFAC', color: '#166534', padding: 12, borderRadius: 8, marginBottom: 16 }}>{message}</div>}
      {error && <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', padding: 12, borderRadius: 8, marginBottom: 16 }}>{error}</div>}

      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 700, color: GRAY }}>Full name</label>
            <input value={form.full_name} onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${BORDER}` }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 700, color: GRAY }}>Email</label>
            <input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${BORDER}` }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 700, color: GRAY }}>Phone</label>
            <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${BORDER}` }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 700, color: GRAY }}>Bar number</label>
            <input value={form.bar_number} readOnly style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, background: '#F8FAFC', color: '#64748B' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 700, color: GRAY }}>Experience years</label>
            <input type="number" min="0" value={form.experience_years} onChange={(e) => setForm((p) => ({ ...p, experience_years: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${BORDER}` }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 700, color: GRAY }}>City</label>
            <input value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${BORDER}` }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 700, color: GRAY }}>State</label>
            <input value={form.state} onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${BORDER}` }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 700, color: GRAY }}>Languages</label>
            <input value={form.languages} onChange={(e) => setForm((p) => ({ ...p, languages: e.target.value }))} placeholder="English, Telugu" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${BORDER}` }} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 700, color: GRAY }}>Bio</label>
            <textarea rows={4} value={form.bio} onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, resize: 'vertical' }} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 12, fontWeight: 700, color: GRAY }}>Specializations</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {SPEC_OPTIONS.map((spec) => {
                const active = form.specializations.includes(spec);
                return (
                  <button key={spec} type="button" onClick={() => toggleSpec(spec)} style={{ border: `1px solid ${active ? BLUE : BORDER}`, borderRadius: 999, background: active ? '#EAF2FF' : '#fff', color: active ? BLUE : '#64748B', padding: '7px 12px', cursor: 'pointer' }}>
                    {spec}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 700, color: GRAY }}>Profile photo</label>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              {photoPreview && <img src={photoPreview} alt="Preview" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 12, border: `1px solid ${BORDER}` }} />}
              <input type="file" accept="image/*" onChange={handleFileChange} />
            </div>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="checkbox" checked={Boolean(form.is_available)} onChange={(e) => setForm((p) => ({ ...p, is_available: e.target.checked }))} />
              <span style={{ fontSize: 13, color: NAVY, fontWeight: 600 }}>I am available for consultation bookings</span>
            </label>
          </div>
        </div>

        <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
          <button onClick={handleSave} disabled={saving} style={{ background: saving ? '#CBD5E1' : BLUE, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700 }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
