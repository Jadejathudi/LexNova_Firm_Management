import React, { useState } from 'react';
import { api } from '../utils/api';

const TIERS = [
  ['hc', 'Retired High Court Judge'],
  ['district', 'Retired District Judge'],
  ['senior', 'Retired Senior Civil Judge'],
  ['junior', 'Retired Junior Civil Judge'],
];

const inputStyle = {
  width: '100%', padding: '9px 11px', border: '1px solid #CBD5E1', borderRadius: 5,
  fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit', color: '#1C2A40',
};
const labelStyle = {
  display: 'block', marginBottom: 5, fontSize: 11, fontWeight: 700,
  color: '#475569', textTransform: 'uppercase',
};

function parseList(value) {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value || '[]');
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return String(value || '').split(',').map(item => item.trim()).filter(Boolean);
}

function initialValues(member) {
  const common = { full_name: member.full_name || '', email: member.email || '', phone: member.phone || '' };
  if (member.role === 'judge') {
    return {
      ...common,
      profile: {
        initials: member.judge_initials || '',
        tier: member.judge_tier || 'hc',
        retired_year: member.retired_year ?? '',
        years_on_bench: member.years_on_bench ?? '',
        city: member.judge_city || '',
        state: member.judge_state || '',
        areas: parseList(member.judge_areas).join(', '),
        bio: member.judge_bio || '',
        education: member.judge_education || '',
        notable_areas: member.judge_notable_areas || '',
        languages: parseList(member.judge_languages).join(', '),
        profile_photo: member.judge_profile_photo || '',
      },
    };
  }
  if (member.role === 'senior_advocate' || member.role === 'junior_advocate') {
    return {
      ...common,
      profile: {
        bar_number: member.bar_number || '',
        experience_years: member.experience_years ?? '',
        specializations: parseList(member.advocate_specializations).join(', '),
        state: member.advocate_state || '',
        city: member.advocate_city || '',
        bio: member.advocate_bio || '',
        languages: parseList(member.advocate_languages).join(', '),
        profile_photo: member.advocate_profile_photo || '',
        is_verified: Boolean(member.is_verified),
      },
    };
  }
  return { ...common, profile: {} };
}

export default function TeamMemberEditForm({ member, onCancel, onSaved }) {
  const [form, setForm] = useState(() => initialValues(member));
  const [preview, setPreview] = useState(form.profile.profile_photo || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const isJudge = member.role === 'judge';
  const isAdvocate = member.role === 'senior_advocate' || member.role === 'junior_advocate';

  const update = event => {
    const { name, value, checked, type } = event.target;
    if (name.startsWith('profile.')) {
      const field = name.slice('profile.'.length);
      setForm(current => ({ ...current, profile: { ...current.profile, [field]: type === 'checkbox' ? checked : value } }));
    } else {
      setForm(current => ({ ...current, [name]: value }));
    }
  };

  const handlePhoto = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPG, PNG, or WebP image.');
      event.target.value = '';
      return;
    }
    if (file.size > 500 * 1024) {
      setError('Profile photo must be 500 KB or smaller.');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const profilePhoto = String(reader.result || '');
      setForm(current => ({ ...current, profile: { ...current.profile, profile_photo: profilePhoto } }));
      setPreview(profilePhoto);
      setError('');
    };
    reader.onerror = () => setError('Could not read the selected image.');
    reader.readAsDataURL(file);
  };

  const save = async event => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.updateTeamMember(member.user_id, form);
      onSaved(`${form.full_name} updated successfully.`);
    } catch (err) {
      setError(err.message || 'Failed to update team member.');
    } finally {
      setSaving(false);
    }
  };

  const field = (label, name, options = {}) => (
    <div>
      <label htmlFor={`team-edit-${name}`} style={labelStyle}>{label}{options.required ? ' *' : ''}</label>
      <input
        id={`team-edit-${name}`}
        name={name}
        type={options.type || 'text'}
        value={name.startsWith('profile.') ? form.profile[name.slice(8)] ?? '' : form[name] ?? ''}
        onChange={update}
        required={options.required}
        min={options.min}
        max={options.max}
        maxLength={options.maxLength}
        style={inputStyle}
      />
    </div>
  );

  const profileField = (label, name, options = {}) => field(label, `profile.${name}`, options);
  const currentYear = new Date().getFullYear();

  return (
    <section style={{ background: '#fff', border: '1px solid #CBD5E1', borderRadius: 8, padding: 22, margin: '0 0 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <div>
          <h3 style={{ margin: 0, color: '#1C2A40', fontSize: 18 }}>Edit {member.full_name}</h3>
          <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: 12 }}>{member.role.replaceAll('_', ' ')}</p>
        </div>
        <button type="button" onClick={onCancel} style={{ background: '#fff', border: '1px solid #CBD5E1', borderRadius: 5, padding: '7px 12px', color: '#475569', cursor: 'pointer' }}>Cancel</button>
      </div>

      {error && <div role="alert" style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 5, padding: '9px 12px', marginBottom: 14, color: '#B42318', fontSize: 13 }}>{error}</div>}

      <form onSubmit={save}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 13, marginBottom: 18 }}>
          {field('Full name', 'full_name', { required: true })}
          {field('Email', 'email', { required: true, type: 'email' })}
          {field('Phone', 'phone', { required: true, type: 'tel' })}
        </div>

        {isAdvocate && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 13, marginBottom: 14 }}>
              {profileField('Bar Council number', 'bar_number', { required: true })}
              {profileField('Experience (years)', 'experience_years', { required: true, type: 'number', min: 0, max: 80 })}
              {profileField('State', 'state', { required: true })}
              {profileField('City', 'city', { required: true })}
              {profileField('Specializations (comma-separated)', 'specializations', { required: true })}
              {profileField('Languages (comma-separated)', 'languages')}
            </div>
            <div style={{ marginBottom: 14 }}>
              <label htmlFor="team-edit-profile.bio" style={labelStyle}>Biography</label>
              <textarea id="team-edit-profile.bio" name="profile.bio" value={form.profile.bio || ''} onChange={update} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, color: '#334155', fontSize: 13 }}>
              <input type="checkbox" name="profile.is_verified" checked={form.profile.is_verified} onChange={update} />
              Verified advocate
            </label>
          </>
        )}

        {isJudge && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 13, marginBottom: 14 }}>
              {profileField('Initials', 'initials', { required: true, maxLength: 4 })}
              <div>
                <label htmlFor="team-edit-profile.tier" style={labelStyle}>Judicial tier *</label>
                <select id="team-edit-profile.tier" name="profile.tier" value={form.profile.tier} onChange={update} required style={inputStyle}>
                  {TIERS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              {profileField('Year retired', 'retired_year', { required: true, type: 'number', min: 1900, max: currentYear })}
              {profileField('Years on bench', 'years_on_bench', { required: true, type: 'number', min: 0, max: 80 })}
              {profileField('City', 'city', { required: true })}
              {profileField('State', 'state', { required: true })}
              {profileField('Areas (comma-separated)', 'areas', { required: true })}
              {profileField('Languages (comma-separated)', 'languages', { required: true })}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 13, marginBottom: 14 }}>
              {['bio', 'education', 'notable_areas'].map((name, index) => (
                <div key={name}>
                  <label htmlFor={`team-edit-profile.${name}`} style={labelStyle}>{['Biography', 'Education', 'Notable areas'][index]}{name === 'bio' ? ' *' : ''}</label>
                  <textarea id={`team-edit-profile.${name}`} name={`profile.${name}`} value={form.profile[name] || ''} onChange={update} required={name === 'bio'} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
                </div>
              ))}
            </div>
          </>
        )}

        {(isAdvocate || isJudge) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
            <div>
              <label htmlFor="team-edit-photo" style={labelStyle}>Profile photo <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional · JPG/PNG/WebP · max 500 KB)</span></label>
              <input id="team-edit-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhoto} style={{ maxWidth: '100%', fontSize: 12 }} />
            </div>
            {preview && <img src={preview} alt="Profile preview" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid #CBD5E1' }} />}
          </div>
        )}

        <div style={{ display: 'flex', gap: 9 }}>
          <button type="submit" disabled={saving} style={{ background: '#1C2A40', color: '#fff', border: 'none', borderRadius: 5, padding: '9px 16px', fontWeight: 700, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : 'Save changes'}
          </button>
          <button type="button" onClick={onCancel} style={{ background: '#fff', border: '1px solid #CBD5E1', borderRadius: 5, padding: '9px 14px', color: '#475569', cursor: 'pointer' }}>Cancel</button>
        </div>
      </form>
    </section>
  );
}
