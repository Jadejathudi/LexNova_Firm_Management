const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('clearcase_token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  if (res.status === 401) {
    localStorage.removeItem('clearcase_token');
    localStorage.removeItem('clearcase_user');
    window.location.href = '/login';
    throw new Error('Session expired');
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  // Auth
  guestBook: (data) => apiFetch('/auth/guest-book', { method: 'POST', body: JSON.stringify(data) }),
  createConsultationRequest: (data) => apiFetch('/consultations/requests', { method: 'POST', body: JSON.stringify(data) }),
  register: (data) => apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => apiFetch('/auth/logout', { method: 'POST' }),
  getMe: () => apiFetch('/auth/me'),

  // Dashboard
  getDashboard: () => apiFetch('/dashboard'),
  getClientDashboard: () => apiFetch('/dashboard/client'),
  getAdvocateDashboard: () => apiFetch('/dashboard/advocate'),
  getConsultations: () => apiFetch('/dashboard/consultations'),

  // Cases (court-filed, formerly "Matters" in CRM)
  getCases: () => apiFetch('/cases'),
  getCase: (id) => apiFetch(`/cases/${id}`),
  createCase: (data) => apiFetch('/cases', { method: 'POST', body: JSON.stringify(data) }),
  updateCaseStatus: (id, status) => apiFetch(`/cases/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  updateCase: (id, data) => apiFetch(`/cases/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getCaseTimeline: (id) => apiFetch(`/cases/${id}/timeline`),
  assignAdvocate: (id, data) => apiFetch(`/cases/${id}/assign`, { method: 'POST', body: JSON.stringify(data) }),

  // Lightweight Matters (consultation records, bench sessions, verticals)
  getMatters: () => apiFetch('/matters'),
  getMatter: (id) => apiFetch(`/matters/${id}`),
  createMatter: (data) => apiFetch('/matters', { method: 'POST', body: JSON.stringify(data) }),
  updateMatter: (id, data) => apiFetch(`/matters/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  convertMatterToCase: (id, data) => apiFetch(`/matters/${id}/convert-to-case`, { method: 'POST', body: JSON.stringify(data) }),
  getMatterNotes: (id) => apiFetch(`/matters/${id}/notes`),
  addMatterNote: (id, data) => apiFetch(`/matters/${id}/notes`, { method: 'POST', body: JSON.stringify(data) }),
  updateMatterNote: (id, noteId, data) => apiFetch(`/matters/${id}/notes/${noteId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteMatterNote: (id, noteId) => apiFetch(`/matters/${id}/notes/${noteId}`, { method: 'DELETE' }),
  getMatterDocumentsList: (id) => apiFetch(`/matters/${id}/documents`),
  uploadMatterDocument: async (matterId, file) => {
    const token = localStorage.getItem('clearcase_token');
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/matters/${matterId}/documents`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data;
  },
  deleteMatterDocument: (id, docId) => apiFetch(`/matters/${id}/documents/${docId}`, { method: 'DELETE' }),
  addMatterAdvocate: (id, advocate_id) => apiFetch(`/matters/${id}/advocates`, { method: 'POST', body: JSON.stringify({ advocate_id }) }),
  removeMatterAdvocate: (id, advocateId) => apiFetch(`/matters/${id}/advocates/${advocateId}`, { method: 'DELETE' }),
  getInternalAdvocates: () => apiFetch('/users/advocates'),
  getMatterChat: (id) => apiFetch(`/matters/${id}/messages`),
  sendMatterMessage: (id, data) => apiFetch(`/matters/${id}/messages`, { method: 'POST', body: JSON.stringify(data) }),

  // Documents
  getMyDocuments: () => apiFetch('/documents/my'),
  getMatterDocuments: (matterId) => apiFetch(`/documents/matter/${matterId}`),
  uploadDocument: async (matterId, file, onProgress, isClientVisible = true) => {
    const token = localStorage.getItem('clearcase_token');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('matter_id', matterId);
    formData.append('is_client_visible', isClientVisible ? '1' : '0');
    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data;
  },
  deleteDocument: (id) => apiFetch(`/documents/${id}`, { method: 'DELETE' }),

  // Messages
  getMatterMessages: (matterId) => apiFetch(`/messages/matter/${matterId}`),
  sendMessage: (data) => apiFetch('/messages', { method: 'POST', body: JSON.stringify(data) }),
  getUnreadCount: () => apiFetch('/messages/unread-count'),

  // Hearings
  getMatterHearings: (matterId) => apiFetch(`/hearings/matter/${matterId}`),
  getUpcomingHearings: () => apiFetch('/hearings/upcoming'),
  createHearing: (data) => apiFetch('/hearings', { method: 'POST', body: JSON.stringify(data) }),
  updateHearing: (id, data) => apiFetch(`/hearings/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Invoices
  getInvoices: () => apiFetch('/invoices'),
  createInvoice: (data) => apiFetch('/invoices', { method: 'POST', body: JSON.stringify(data) }),
  updateInvoiceStatus: (id, status) => apiFetch(`/invoices/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Clients
  getClients: () => apiFetch('/clients'),
  getClient: (id) => apiFetch(`/clients/${id}`),

  // Advocates
  getAdvocates: ({ state, spec, available } = {}) => {
    const params = new URLSearchParams();
    if (state) params.append('state', state);
    if (spec) params.append('spec', spec);
    if (available) params.append('available', 'true');
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiFetch(`/advocates${query}`);
  },
  getAdvocate: (id) => apiFetch(`/advocates/${id}`),
  getAdvocateAvailability: (id) => apiFetch(`/advocates/${id}/availability`),
  getAdvocateAvailableSlots: (id, date) => apiFetch(`/advocates/${id}/available-slots?date=${date}`),
  updateAdvocateAvailability: (id, availability) => apiFetch(`/advocates/${id}/availability`, { method: 'PUT', body: JSON.stringify({ availability }) }),
  getAdvocateEarnings: (id, period) => apiFetch(`/advocates/${id}/earnings?period=${period}`),
  getOnCallAdvocate: () => apiFetch('/advocates/on-call'),

  // Users
  getTeam: () => apiFetch('/users'),
  getNotifications: () => apiFetch('/users/notifications'),
  getUnreadNotifCount: () => apiFetch('/users/notifications/unread-count'),
  markNotifRead: (id) => apiFetch(`/users/notifications/${id}/read`, { method: 'PATCH' }),

  // Consultation Requests & Sessions
  getConsultationRequests: () => apiFetch('/consultations/requests'),
  getMyConsultationRequests: () => apiFetch('/consultations/my-requests'),
  getAdvocateConsultationRequests: (advocateId) => apiFetch(`/consultations/requests/${advocateId}`),
  updateConsultationRequestStatus: (requestId, status) => apiFetch(`/consultations/requests/${requestId}`, { method: 'PUT', body: JSON.stringify({ status }) }),
  scheduleConsultationRequest: (requestId, data) => apiFetch(`/consultations/requests/${requestId}/schedule`, { method: 'POST', body: JSON.stringify(data) }),
  getConsultationSessions: (advocateId) => apiFetch(`/consultations/sessions/${advocateId}`),
  getConsultationSession: (sessionId) => apiFetch(`/consultations/sessions/${sessionId}/details`),
  getAllConsultationSessions: () => apiFetch('/consultations/sessions'),
  createConsultationSession: (data) => apiFetch('/consultations/sessions', { method: 'POST', body: JSON.stringify(data) }),

  // AI Guide
  askAI: (question) => apiFetch('/ai-guide/ask', { method: 'POST', body: JSON.stringify({ question }) }),
  getAIQuestions: () => apiFetch('/ai-guide/questions'),

  // The Bench
  getBenchJudges: ({ tier, area } = {}) => {
    const p = new URLSearchParams();
    if (tier && tier !== 'all') p.append('tier', tier);
    if (area && area !== 'all') p.append('area', area);
    const q = p.toString() ? `?${p.toString()}` : '';
    return apiFetch(`/bench/judges${q}`);
  },
  getBenchJudge: (id) => apiFetch(`/bench/judges/${id}`),
  getBenchJudgeSlots: (id, date) => apiFetch(`/bench/judges/${id}/slots${date ? `?date=${date}` : ''}`),
  getBenchServices: () => apiFetch('/bench/services'),
  createBenchBooking: (data) => apiFetch('/bench/bookings', { method: 'POST', body: JSON.stringify(data) }),
  getBenchBookingByRef: (ref) => apiFetch(`/bench/bookings/ref/${ref}`),
  getMyBenchSessions: () => apiFetch('/bench/my-sessions'),
  getBenchAdminBookings: (status) => apiFetch(`/bench/admin/bookings${status && status !== 'all' ? `?status=${status}` : ''}`),
  updateBenchBooking: (id, data) => apiFetch(`/bench/admin/bookings/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getBenchAdminStats: () => apiFetch('/bench/admin/stats'),
  getBenchAdminJudges: () => apiFetch('/bench/admin/judges'),

  // Google Calendar admin
  getCalendarStatus: () => apiFetch('/admin/google-status'),
  getGoogleAuthUrl: () => apiFetch('/admin/google-auth'),
};
