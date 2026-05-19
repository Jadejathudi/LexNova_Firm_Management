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

  // Matters
  getMatters: () => apiFetch('/matters'),
  getMatter: (id) => apiFetch(`/matters/${id}`),
  createMatter: (data) => apiFetch('/matters', { method: 'POST', body: JSON.stringify(data) }),
  updateMatterStatus: (id, status) => apiFetch(`/matters/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  updateMatter: (id, data) => apiFetch(`/matters/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getMatterTimeline: (id) => apiFetch(`/matters/${id}/timeline`),
  assignAdvocate: (id, data) => apiFetch(`/matters/${id}/assign`, { method: 'POST', body: JSON.stringify(data) }),

  // Documents
  getMyDocuments: () => apiFetch('/documents/my'),
  getMatterDocuments: (matterId) => apiFetch(`/documents/matter/${matterId}`),
  uploadDocument: async (matterId, file) => {
    const token = localStorage.getItem('clearcase_token');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('matter_id', matterId);
    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data;
  },

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

  // Google Calendar admin
  getCalendarStatus: () => apiFetch('/admin/google-status'),
  getGoogleAuthUrl: () => apiFetch('/admin/google-auth'),
};
