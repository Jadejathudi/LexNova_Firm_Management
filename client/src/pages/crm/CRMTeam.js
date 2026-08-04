import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const NAVY = '#1C2A40', BLUE = '#3D6FB0', GRAD = 'linear-gradient(135deg, #3D6FB0, #2E8E86)';
const STATES = ['Andhra Pradesh','Delhi','Karnataka','Maharashtra','Telangana','Tamil Nadu','Gujarat','Rajasthan','West Bengal','Kerala'];
const SPECS = ['Criminal','Family','Civil','Corporate','Cyber','Banking','Real Estate','Constitutional','Labour','Tax'];
const BLANK = {
  full_name: '', email: '', phone: '', password: '',
  role: 'senior_advocate', bar_number: '', experience_years: '',
  specializations: [], state: '', city: '', bio: '',
  languages: '', is_verified: true, profile_photo: '',
};

export default function CRMTeam() {
  const { user } = useAuth();
  const [team, setTeam] = useState([]);
  const [advocates, setAdvocates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingAdvocateId, setEditingAdvocateId] = useState(null);

  const load = () =>
    Promise.all([api.getTeam(), api.getAdvocates()])
      .then(([t, a]) => { setTeam(t); setAdvocates(a); })
      .catch(console.error)
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setShowForm(false);
    setForm(BLANK);
    setPhotoPreview(null);
    setError('');
    setSuccess('');
    setIsEditing(false);
    setEditingAdvocateId(null);
  };

  const startEdit = (advocate) => {
    const member = team.find(t => t.user_id === advocate.user_id) || {};
    setForm({
      full_name: advocate.full_name || '',
      email: advocate.email || member.email || '',
      phone: member.phone || advocate.phone || '',
      password: '',
      role: advocate.role || member.role || 'senior_advocate',
      bar_number: advocate.bar_number || '',
      experience_years: advocate.experience_years || '',
      specializations: Array.isArray(advocate.specializations) ? advocate.specializations : [],
      state: advocate.state || '',
      city: advocate.city || '',
      bio: advocate.bio || '',
      languages: Array.isArray(advocate.languages) ? advocate.languages.join(', ') : (advocate.languages || ''),
      is_verified: Boolean(advocate.is_verified),
      profile_photo: advocate.profile_photo || '',
    });
    setPhotoPreview(advocate.profile_photo || null);
    setEditingAdvocateId(advocate.advocate_id);
    setIsEditing(true);
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleDelete = async (advocate) => {
    if (!window.confirm(`Delete ${advocate.full_name} from the advocate roster?`)) return;
    try {
      await api.deleteAdvocate(advocate.advocate_id);
      setSuccess(`${advocate.full_name} has been removed successfully.`);
      setLoading(true);
      load();
    } catch (err) {
      setError(err.message || 'Failed to delete advocate.');
    }
  };

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500 * 1024) { setError('Photo must be under 500 KB'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      setForm(p => ({ ...p, profile_photo: reader.result }));
      setPhotoPreview(reader.result);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const toggleSpec = (spec) => {
    setForm(p => ({
      ...p,
      specializations: p.specializations.includes(spec)
        ? p.specializations.filter(s => s !== spec)
        : [...p.specializations, spec],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        experience_years: parseInt(form.experience_years, 10),
        languages: form.languages.split(',').map(s => s.trim()).filter(Boolean),
        specializations: form.specializations,
      };

      if (isEditing) {
        await api.updateAdvocate(editingAdvocateId, payload);
        setSuccess(`${form.full_name} has been updated successfully.`);
      } else {
        await api.createAdvocate(payload);
        setSuccess(`${form.full_name} has been added successfully.`);
      }

      resetForm();
      setLoading(true);
      load();
    } catch (err) {
      setError(err.message || (isEditing ? 'Failed to update advocate.' : 'Failed to create advocate.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading">Loading team...</div>;

  const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' };
  const labelStyle = { display: 'block', fontSize: 13, color: '#64748B', fontWeight: 600, marginBottom: 5 };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ color: NAVY }}>Team Members ({team.length})</h2>
        {user?.role === 'managing_partner' && (
          <button onClick={() => {
            if (showForm) {
              resetForm();
              return;
            }
            setShowForm(true);
            setIsEditing(false);
            setEditingAdvocateId(null);
            setError('');
            setSuccess('');
            setForm(BLANK);
            setPhotoPreview(null);
          }}
            style={{ background: GRAD, color: '#fff', border: 'none', borderRadius: 9, padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
            {showForm ? '✕ Cancel' : '+ Add Advocate'}
          </button>
        )}
      </div>

      {success && (
        <div style={{ background: '#E7F3EC', border: '1px solid #2F8F5B', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#1A6640', fontSize: 14, fontWeight: 600 }}>
          ✓ {success}
        </div>
      )}

      {/* Add / Edit Advocate Form */}
      {showForm && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: 28, marginBottom: 24, boxShadow: '0 4px 20px rgba(0,0,0,.06)' }}>
          <h3 style={{ color: NAVY, fontSize: 18, fontWeight: 700, marginBottom: 20, fontFamily: "'Space Grotesk', sans-serif" }}>
            {isEditing ? 'Update Advocate Profile' : 'New Advocate Profile'}
          </h3>

          {error && (
            <div style={{ background: '#FAEAE8', border: '1px solid #C2453D', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#C2453D', fontSize: 13 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Row 1: Name + Email */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Full Name *</label>
                <input style={inputStyle} type="text" required value={form.full_name}
                  onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} placeholder="Adv. Full Name" />
              </div>
              <div>
                <label style={labelStyle}>Email *</label>
                <input style={inputStyle} type="email" required value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="advocate@clearcase.in" />
              </div>
            </div>

            {/* Row 2: Phone + Password (create only) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Phone *</label>
                <input style={inputStyle} type="text" required value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="10-digit mobile" />
              </div>
              {!isEditing && (
                <div>
                  <label style={labelStyle}>Login Password *</label>
                  <input style={inputStyle} type="password" required value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Min 8 characters" />
                </div>
              )}
            </div>

            {/* Row 3: Role + Bar Number */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Role *</label>
                <select style={inputStyle} value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                  <option value="senior_advocate">Senior Advocate</option>
                  <option value="junior_advocate">Junior Advocate</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Bar Council Number *</label>
                <input style={inputStyle} type="text" required value={form.bar_number}
                  onChange={e => setForm(p => ({ ...p, bar_number: e.target.value }))} placeholder="e.g. TS/HC/2015/1234" />
              </div>
            </div>

            {/* Row 4: Experience + State + City */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Experience (years) *</label>
                <input style={inputStyle} type="number" required min="0" max="60" value={form.experience_years}
                  onChange={e => setForm(p => ({ ...p, experience_years: e.target.value }))} placeholder="e.g. 8" />
              </div>
              <div>
                <label style={labelStyle}>State *</label>
                <select style={inputStyle} value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))}>
                  <option value="">Select state</option>
                  {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>City *</label>
                <input style={inputStyle} type="text" required value={form.city}
                  onChange={e => setForm(p => ({ ...p, city: e.target.value }))} placeholder="e.g. Hyderabad" />
              </div>
            </div>

            {/* Specializations */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Specializations</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {SPECS.map(s => (
                  <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                    background: form.specializations.includes(s) ? BLUE + '18' : '#F8FAFC',
                    border: `1px solid ${form.specializations.includes(s) ? BLUE : '#E2E8F0'}`,
                    borderRadius: 7, padding: '5px 12px', fontSize: 13, fontWeight: 500, color: form.specializations.includes(s) ? BLUE : '#64748B',
                    transition: 'all .15s' }}>
                    <input type="checkbox" checked={form.specializations.includes(s)} onChange={() => toggleSpec(s)} style={{ display: 'none' }} />
                    {s}
                  </label>
                ))}
              </div>
            </div>

            {/* Languages + Bio */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Languages <span style={{ fontWeight: 400, color: '#94A3B8' }}>(comma-separated)</span></label>
                <input style={inputStyle} type="text" value={form.languages}
                  onChange={e => setForm(p => ({ ...p, languages: e.target.value }))} placeholder="English, Telugu, Hindi" />
              </div>
              <div>
                <label style={labelStyle}>Bio</label>
                <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3} value={form.bio}
                  onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                  placeholder="Brief professional biography..." />
              </div>
            </div>

            {/* Photo + Verified */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 22 }}>
              <div>
                <label style={labelStyle}>Profile Photo <span style={{ fontWeight: 400, color: '#94A3B8' }}>(max 500 KB · JPG/PNG)</span></label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {photoPreview && (
                    <img src={photoPreview} alt="preview"
                      style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid #E2E8F0', flexShrink: 0 }} />
                  )}
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhoto}
                    style={{ fontSize: 13, color: '#64748B' }} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 22 }}>
                <input type="checkbox" id="verified" checked={form.is_verified}
                  onChange={e => setForm(p => ({ ...p, is_verified: e.target.checked }))}
                  style={{ width: 16, height: 16, cursor: 'pointer' }} />
                <label htmlFor="verified" style={{ fontSize: 14, color: NAVY, fontWeight: 600, cursor: 'pointer' }}>
                  Mark as Verified Advocate
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button type="submit" disabled={submitting}
                style={{ background: GRAD, color: '#fff', border: 'none', borderRadius: 9, padding: '12px 28px', fontWeight: 700, fontSize: 15, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: submitting ? 0.7 : 1 }}>
                {submitting ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Advocate →' : 'Create Advocate →')}
              </button>
              <button type="button" onClick={resetForm}
                style={{ background: 'transparent', color: '#64748B', border: '1px solid #E2E8F0', borderRadius: 9, padding: '12px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Workload */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">Advocate Workloads</div>
        {advocates.map(a => {
          const pct = (a.active_cases / 20) * 100;
          const level = a.active_cases > 14 ? 'danger' : a.active_cases > 10 ? 'warning' : 'normal';
          return (
            <div key={a.user_id} className="workload-bar">
              <div className="name">
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {a.profile_photo && (
                    <img src={a.profile_photo} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                  )}
                  {a.full_name} <span className="badge badge-active" style={{ marginLeft: 4 }}>{a.role?.replace('_', ' ')}</span>
                </span>
                <span>{a.active_cases} active cases</span>
              </div>
              <div className="bar">
                <div className={`fill ${level}`} style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Team table */}
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Status</th>
            <th>Last Login</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {team.map(t => {
            const advocateRef = advocates.find(a => a.user_id === t.user_id);
            return (
              <tr key={t.user_id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {t.profile_photo
                      ? <img src={t.profile_photo} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                      : <div style={{ width: 28, height: 28, borderRadius: '50%', background: BLUE + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: BLUE }}>{t.full_name?.[0]}</div>
                    }
                    <strong>{t.full_name}</strong>
                  </div>
                </td>
                <td><span className="badge badge-active">{t.role?.replace('_', ' ')}</span></td>
                <td>{t.email}</td>
                <td>{t.phone}</td>
                <td>{t.is_active ? '🟢 Active' : '🔴 Inactive'}</td>
                <td>{t.last_login ? new Date(t.last_login).toLocaleString('en-IN') : 'Never'}</td>
                <td>
                  {user?.role === 'managing_partner' && advocateRef && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" onClick={() => startEdit(advocateRef)} style={{ background: '#E0F2FE', color: '#075985', border: 'none', borderRadius: 7, padding: '6px 10px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Edit</button>
                      <button type="button" onClick={() => handleDelete(advocateRef)} style={{ background: '#FEE2E2', color: '#B91C1C', border: 'none', borderRadius: 7, padding: '6px 10px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
