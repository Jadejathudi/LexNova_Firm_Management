import React, { useState } from 'react';
import { api } from '../../utils/api';
import { C, TIERS } from '../../pages/bench/benchConstants';

const EMPTY_FORM = {
  name: '', initials: '', email: '', phone: '', password: '', tier: 'hc',
  retired_year: '', years_on_bench: '', city: '', state: '', total_slots: '8',
  areas: '', bio: '', education: '', notable_areas: '', languages: '', profile_photo: '',
};

const fieldStyle = {
  width: '100%', padding: '9px 11px', border: '1px solid #CBD5E1', borderRadius: 5,
  fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit', color: '#1C2A40',
};
const labelStyle = {
  display: 'block', marginBottom: 5, fontSize: 11, fontWeight: 700,
  color: '#475569', textTransform: 'uppercase',
};

export default function JudgeAdminForm({ onCancel, onCreated }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (event) => setForm(current => ({ ...current, [event.target.name]: event.target.value }));

  const handleImage = (event) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type)) {
      setError('Choose a JPG, PNG, or WebP image.');
      event.target.value = '';
      return;
    }
    if (selected.size > 500 * 1024) {
      setError('Judge image must be 500 KB or smaller.');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const profilePhoto = String(reader.result || '');
      setForm(current => ({ ...current, profile_photo: profilePhoto }));
      setPreview(profilePhoto);
      setError('');
    };
    reader.onerror = () => setError('Could not read the selected image.');
    reader.readAsDataURL(selected);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.createBenchJudge(form);
      onCreated();
    } catch (err) {
      setError(err.message || 'Failed to create judge.');
    } finally {
      setSubmitting(false);
    }
  };

  const textField = (label, name, options = {}) => (
    <div>
      <label htmlFor={`judge-${name}`} style={labelStyle}>{label}{options.required ? ' *' : ''}</label>
      <input
        id={`judge-${name}`}
        name={name}
        value={form[name]}
        onChange={update}
        required={options.required}
        type={options.type || 'text'}
        min={options.min}
        max={options.max}
        maxLength={options.maxLength}
        minLength={options.minLength}
        placeholder={options.placeholder}
        autoComplete={options.autoComplete}
        style={fieldStyle}
      />
    </div>
  );

  const areaOptions = { hc: 'Retired High Court Judge', district: 'Retired District Judge', senior: 'Retired Senior Civil Judge', junior: 'Retired Junior Civil Judge' };

  return (
    <section style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 8, padding: 22, marginBottom: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <div>
          <h3 style={{ margin: 0, color: '#1C2A40', fontSize: 18 }}>Add Bench Judge</h3>
          <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: 12 }}>Creates the judge profile and sign-in account.</p>
        </div>
        <button type="button" onClick={onCancel} style={{ background: 'white', border: '1px solid #CBD5E1', borderRadius: 5, padding: '7px 12px', color: '#475569', cursor: 'pointer' }}>Cancel</button>
      </div>

      {error && <div role="alert" style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 5, padding: '9px 12px', marginBottom: 14, color: '#B42318', fontSize: 13 }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 13, marginBottom: 14 }}>
          {textField('Full name', 'name', { required: true, placeholder: 'Hon. Justice Full Name (Retd.)' })}
          {textField('Initials', 'initials', { required: true, maxLength: 4, placeholder: 'e.g. AB' })}
          <div>
            <label htmlFor="judge-tier" style={labelStyle}>Judicial tier *</label>
            <select id="judge-tier" name="tier" value={form.tier} onChange={update} required style={fieldStyle}>
              {Object.entries(TIERS).map(([key, tier]) => <option key={key} value={key}>{areaOptions[key]}</option>)}
            </select>
          </div>
          {textField('Email', 'email', { required: true, type: 'email', autoComplete: 'email' })}
          {textField('Phone', 'phone', { required: true, type: 'tel', autoComplete: 'tel' })}
          {textField('Initial password', 'password', { required: true, type: 'password', minLength: 8, autoComplete: 'new-password' })}
          {textField('Year retired', 'retired_year', { required: true, type: 'number', min: 1900, max: new Date().getFullYear() })}
          {textField('Years on bench', 'years_on_bench', { required: true, type: 'number', min: 0, max: 80 })}
          {textField('City', 'city', { required: true })}
          {textField('State', 'state', { required: true })}
          {textField('Monthly session slots', 'total_slots', { type: 'number', min: 1, placeholder: '8' })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 13, marginBottom: 14 }}>
          <div>
            <label htmlFor="judge-areas" style={labelStyle}>Areas of judicial experience *</label>
            <input id="judge-areas" name="areas" value={form.areas} onChange={update} required placeholder="Criminal, Civil, Family" style={fieldStyle} />
          </div>
          <div>
            <label htmlFor="judge-languages" style={labelStyle}>Languages *</label>
            <input id="judge-languages" name="languages" value={form.languages} onChange={update} required placeholder="Telugu, English, Hindi" style={fieldStyle} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 13, marginBottom: 14 }}>
          <div>
            <label htmlFor="judge-bio" style={labelStyle}>Judicial biography *</label>
            <textarea id="judge-bio" name="bio" value={form.bio} onChange={update} required rows={4} style={{ ...fieldStyle, resize: 'vertical' }} />
          </div>
          <div>
            <label htmlFor="judge-education" style={labelStyle}>Education <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
            <textarea id="judge-education" name="education" value={form.education} onChange={update} rows={4} style={{ ...fieldStyle, resize: 'vertical' }} />
          </div>
          <div>
            <label htmlFor="judge-notable-areas" style={labelStyle}>Notable areas <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
            <textarea id="judge-notable-areas" name="notable_areas" value={form.notable_areas} onChange={update} rows={4} style={{ ...fieldStyle, resize: 'vertical' }} />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
          <div>
            <label htmlFor="judge-image" style={labelStyle}>Portrait <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional · JPG/PNG/WebP · max 500 KB)</span></label>
            <input id="judge-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImage} style={{ maxWidth: '100%', fontSize: 12 }} />
          </div>
          {preview && <img src={preview} alt="Judge portrait preview" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${C.gold}` }} />}
        </div>

        <button type="submit" disabled={submitting} style={{ background: C.gold, color: C.ink, border: 'none', borderRadius: 5, padding: '10px 18px', fontWeight: 700, cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
          {submitting ? 'Creating judge…' : 'Create Judge'}
        </button>
      </form>
    </section>
  );
}
