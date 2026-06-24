import React, { useEffect, useState } from 'react';
import { API_BASE } from '../bench/benchConstants';

const TIERS = {
  hc:       { badge: 'High Court',    color: '#C4982A' },
  district: { badge: 'District Court', color: '#8B9CB5' },
  senior:   { badge: 'Senior Civil',  color: '#A0A8C0' },
  junior:   { badge: 'Junior Civil',  color: '#7A8499' },
};

const STATUS_OPTS = ['all', 'pending', 'intake_scheduled', 'intake_done', 'session_scheduled', 'completed', 'cancelled'];
const STATUS_LABELS = {
  pending:           'Pending',
  intake_scheduled:  'Intake Scheduled',
  intake_done:       'Brief Ready',
  session_scheduled: 'Session Confirmed',
  completed:         'Completed',
  cancelled:         'Cancelled',
};
const STATUS_COLORS = {
  pending:           { bg: 'rgba(196,152,42,.1)',  color: '#C4982A' },
  intake_scheduled:  { bg: 'rgba(96,165,250,.1)',  color: '#60A5FA' },
  intake_done:       { bg: 'rgba(167,139,250,.1)', color: '#A78BFA' },
  session_scheduled: { bg: 'rgba(52,211,153,.1)',  color: '#34D399' },
  completed:         { bg: 'rgba(21,128,61,.1)',   color: '#15803D' },
  cancelled:         { bg: 'rgba(255,255,255,.04)',color: '#6E7288' },
};

async function adminFetch(endpoint, options = {}) {
  const token = localStorage.getItem('clearcase_token');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers };
  const res = await fetch(`${API_BASE}/bench${endpoint}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StatCard({ label, value, sub }) {
  return (
    <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 8, padding: '18px 22px' }}>
      <div style={{ fontSize: 13, color: '#64748B', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#1C2A40' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function CRMBench() {
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState(null);
  const [judges, setJudges] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('bookings');

  const loadBookings = (status = statusFilter) => {
    const q = status !== 'all' ? `?status=${status}` : '';
    adminFetch(`/admin/bookings${q}`).then(setBookings).catch(err => setError(err.message));
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      adminFetch('/admin/bookings'),
      adminFetch('/admin/stats'),
      adminFetch('/admin/judges'),
    ])
      .then(([b, s, j]) => { setBookings(b); setStats(s); setJudges(j); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function openEdit(booking) {
    setEditingId(booking.booking_id);
    setEditForm({
      status: booking.status,
      intake_notes: booking.intake_notes || '',
      session_notes: booking.session_notes || '',
      confirmed_date: booking.confirmed_date || '',
      confirmed_slot: booking.confirmed_slot || '',
    });
  }

  async function saveEdit() {
    setSaving(true);
    try {
      await adminFetch(`/admin/bookings/${editingId}`, { method: 'PATCH', body: JSON.stringify(editForm) });
      setEditingId(null);
      loadBookings();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleFilterChange(s) {
    setStatusFilter(s);
    const q = s !== 'all' ? `?status=${s}` : '';
    adminFetch(`/admin/bookings${q}`).then(setBookings).catch(err => setError(err.message));
  }

  const inputSt = {
    width: '100%', padding: '8px 10px', border: '1px solid #CBD5E1', borderRadius: 6,
    fontSize: 13, background: 'white', color: '#334155', fontFamily: 'inherit',
  };
  const labelSt = { fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 5 };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1C2A40', marginBottom: 4 }}>The Bench — Admin</h2>
        <p style={{ fontSize: 14, color: '#64748B' }}>Manage judicial consultation bookings and judge availability.</p>
      </div>

      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#DC2626', fontSize: 13 }}>{error}</div>
      )}

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14, marginBottom: 28 }}>
          <StatCard label="Total Bookings" value={stats.total_bookings} />
          <StatCard label="Pending" value={stats.pending_bookings} sub="awaiting intake" />
          <StatCard label="Completed" value={stats.completed_bookings} />
          <StatCard label="This Month" value={stats.bookings_this_month} />
          <StatCard label="Active Judges" value={stats.active_judges} sub="on The Bench" />
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #E2E8F0' }}>
        {[['bookings', '📅 Bookings'], ['judges', '⚖ Judges']].map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)} style={{
            padding: '10px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer', border: 'none',
            background: 'transparent', borderBottom: `2px solid ${activeTab === key ? '#3D6FB0' : 'transparent'}`,
            color: activeTab === key ? '#3D6FB0' : '#64748B', marginBottom: -2, fontFamily: 'inherit',
          }}>{label}</button>
        ))}
      </div>

      {/* Bookings Tab */}
      {activeTab === 'bookings' && (
        <div>
          {/* Status filter */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            {STATUS_OPTS.map(s => (
              <button key={s} onClick={() => handleFilterChange(s)} style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: `1.5px solid ${statusFilter === s ? '#3D6FB0' : '#E2E8F0'}`,
                background: statusFilter === s ? 'rgba(201,168,76,.1)' : 'white',
                color: statusFilter === s ? '#3D6FB0' : '#64748B', fontFamily: 'inherit',
              }}>
                {s === 'all' ? 'All' : STATUS_LABELS[s]}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8' }}>Loading bookings…</div>
          ) : bookings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8' }}>No bookings found.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {bookings.map(b => {
                const isEditing = editingId === b.booking_id;
                const sm = STATUS_COLORS[b.status] || STATUS_COLORS.pending;
                return (
                  <div key={b.booking_id} style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
                    {/* Header row */}
                    <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14, borderBottom: '1px solid #F1F5F9' }}>
                      <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#3D6FB0', background: 'rgba(201,168,76,.08)', padding: '3px 8px', borderRadius: 4 }}>{b.booking_ref}</div>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 3, background: sm.bg, color: sm.color }}>{STATUS_LABELS[b.status] || b.status}</span>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#1C2A40' }}>{b.guest_name || 'Registered User'}</span>
                        {b.guest_phone && <span style={{ fontSize: 12, color: '#64748B', marginLeft: 10 }}>📞 {b.guest_phone}</span>}
                      </div>
                      <button onClick={() => isEditing ? setEditingId(null) : openEdit(b)} style={{
                        background: isEditing ? '#F1F5F9' : '#1C2A40', color: isEditing ? '#64748B' : 'white',
                        border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                      }}>{isEditing ? 'Cancel' : 'Update'}</button>
                    </div>

                    {/* Details row */}
                    <div style={{ padding: '12px 20px', display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
                      {[
                        ['Judge', `${b.judge_name} (${TIERS[b.tier]?.badge || b.tier})`],
                        ['Service', b.service_type],
                        ['Preferred', `${fmt(b.preferred_date)} · ${b.preferred_slot}`],
                        ['Format', b.session_format],
                        ['Booked', new Date(b.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 2 }}>{label}</div>
                          <div style={{ fontSize: 12, color: '#334155' }}>{value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Edit form */}
                    {isEditing && (
                      <div style={{ padding: '16px 20px', background: '#F8FAFC', borderTop: '1px solid #E2E8F0' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 14 }}>
                          <div>
                            <label style={labelSt}>Status</label>
                            <select value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))} style={inputSt}>
                              {['pending','intake_scheduled','intake_done','session_scheduled','completed','cancelled'].map(s => (
                                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label style={labelSt}>Confirmed Date</label>
                            <input type="date" value={editForm.confirmed_date} onChange={e => setEditForm(p => ({ ...p, confirmed_date: e.target.value }))} style={inputSt} />
                          </div>
                          <div>
                            <label style={labelSt}>Confirmed Time Slot</label>
                            <input value={editForm.confirmed_slot} onChange={e => setEditForm(p => ({ ...p, confirmed_slot: e.target.value }))} placeholder="e.g. 11:00 AM" style={inputSt} />
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                          <div>
                            <label style={labelSt}>Intake Notes (visible to client)</label>
                            <textarea value={editForm.intake_notes} onChange={e => setEditForm(p => ({ ...p, intake_notes: e.target.value }))} rows={3} placeholder="Summary from the intake call…" style={{ ...inputSt, resize: 'vertical' }} />
                          </div>
                          <div>
                            <label style={labelSt}>Session Notes (visible to client)</label>
                            <textarea value={editForm.session_notes} onChange={e => setEditForm(p => ({ ...p, session_notes: e.target.value }))} rows={3} placeholder="Key points from the judge's session…" style={{ ...inputSt, resize: 'vertical' }} />
                          </div>
                        </div>
                        <button onClick={saveEdit} disabled={saving} style={{
                          background: saving ? '#CBD5E1' : '#3D6FB0', color: '#1C2A40', border: 'none', borderRadius: 6,
                          padding: '9px 22px', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                        }}>{saving ? 'Saving…' : 'Save Changes'}</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Judges Tab */}
      {activeTab === 'judges' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 16 }}>
          {judges.map(j => {
            const t = TIERS[j.tier] || TIERS.junior;
            const pct = j.total_slots > 0 ? Math.round((j.slots_left / j.total_slots) * 100) : 0;
            return (
              <div key={j.judge_id} style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 10, padding: 20 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: `${t.color}22`, border: `2px solid ${t.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: t.color, flexShrink: 0 }}>
                    {j.initials}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1C2A40', lineHeight: 1.3, marginBottom: 3 }}>{j.name}</div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 3, background: `${t.color}18`, color: t.color }}>{t.badge}</span>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                  {[
                    ['City', j.city], ['State', j.state],
                    ['Yrs on Bench', j.years_on_bench], ['Retired', j.retired_year],
                  ].map(([l, v]) => (
                    <div key={l}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 1 }}>{l}</div>
                      <div style={{ fontSize: 12, color: '#334155' }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: j.slots_left === 0 ? '#94A3B8' : j.slots_left <= 2 ? '#EF4444' : '#3D6FB0' }}>
                      {j.slots_left === 0 ? 'Fully Booked' : `${j.slots_left} / ${j.total_slots} slots available`}
                    </span>
                    <span style={{ fontSize: 11, color: '#94A3B8' }}>{j.slots_booked} booked</span>
                  </div>
                  <div style={{ height: 4, background: '#F1F5F9', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: j.slots_left === 0 ? '#F1F5F9' : j.slots_left <= 2 ? '#EF4444' : '#3D6FB0', borderRadius: 2 }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
