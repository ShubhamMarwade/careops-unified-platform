import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('careops_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('careops_token');
      localStorage.removeItem('careops_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  register: (data: { email: string; password: string; full_name: string }) =>
    api.post('/api/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/api/auth/login', data),
  me: () => api.get('/api/auth/me'),
};

// Workspace
export const workspaceAPI = {
  create: (data: any) => api.post('/api/workspace/', data),
  get: () => api.get('/api/workspace/'),
  update: (data: any) => api.put('/api/workspace/', data),
  setupComms: (data: any) => api.post('/api/workspace/setup-communications', data),
  updateStep: (step: string) => api.post('/api/workspace/update-onboarding-step', { step }),
  activate: () => api.post('/api/workspace/activate'),
};

// Contacts
export const contactsAPI = {
  list: (params?: any) => api.get('/api/contacts/', { params }),
  get: (id: string) => api.get(`/api/contacts/${id}`),
  create: (data: any) => api.post('/api/contacts/', data),
  update: (id: string, data: any) => api.put(`/api/contacts/${id}`, data),
};

// Conversations
export const conversationsAPI = {
  list: (params?: any) => api.get('/api/conversations/', { params }),
  get: (id: string) => api.get(`/api/conversations/${id}`),
  reply: (id: string, data: any) => api.post(`/api/conversations/${id}/reply`, data),
  updateStatus: (id: string, status: string) =>
    api.put(`/api/conversations/${id}/status`, { status }),
};

// Services
export const servicesAPI = {
  list: () => api.get('/api/services/'),
  create: (data: any) => api.post('/api/services/', data),
  update: (id: string, data: any) => api.put(`/api/services/${id}`, data),
  delete: (id: string) => api.delete(`/api/services/${id}`),
  setAvailability: (id: string, data: any) =>
    api.post(`/api/services/${id}/availability`, data),
};

// Bookings
export const bookingsAPI = {
  list: (params?: any) => api.get('/api/bookings/', { params }),
  today: () => api.get('/api/bookings/today'),
  create: (data: any) => api.post('/api/bookings/', data),
  updateStatus: (id: string, status: string) =>
    api.put(`/api/bookings/${id}/status`, { status }),
  getSlots: (serviceId: string, date: string) =>
    api.get(`/api/bookings/slots/${serviceId}`, { params: { date } }),
};

// Forms
export const formsAPI = {
  listTemplates: () => api.get('/api/forms/templates'),
  createTemplate: (data: any) => api.post('/api/forms/templates', data),
  updateTemplate: (id: string, data: any) => api.put(`/api/forms/templates/${id}`, data),
  deleteTemplate: (id: string) => api.delete(`/api/forms/templates/${id}`),
  listSubmissions: (params?: any) => api.get('/api/forms/submissions', { params }),
  submissionStats: () => api.get('/api/forms/submissions/stats'),
};

// Inventory
export const inventoryAPI = {
  list: () => api.get('/api/inventory/'),
  create: (data: any) => api.post('/api/inventory/', data),
  update: (id: string, data: any) => api.put(`/api/inventory/${id}`, data),
  adjust: (id: string, data: any) => api.post(`/api/inventory/${id}/adjust`, data),
  delete: (id: string) => api.delete(`/api/inventory/${id}`),
};

// Staff
export const staffAPI = {
  list: () => api.get('/api/staff/'),
  invite: (data: any) => api.post('/api/staff/invite', data),
  update: (id: string, data: any) => api.put(`/api/staff/${id}`, data),
  remove: (id: string) => api.delete(`/api/staff/${id}`),
};

// Dashboard
export const dashboardAPI = {
  get: () => api.get('/api/dashboard/'),
  markAlertRead: (id: string) => api.post(`/api/dashboard/alerts/${id}/read`),
  markAllRead: () => api.post('/api/dashboard/alerts/read-all'),
};

// Public
export const publicAPI = {
  getWorkspace: (slug: string) => api.get(`/api/public/workspace/${slug}`),
  submitContact: (slug: string, data: any) => api.post(`/api/public/contact/${slug}`, data),
  getBookingPage: (slug: string) => api.get(`/api/public/booking/${slug}`),
  createBooking: (slug: string, data: any) => api.post(`/api/public/booking/${slug}`, data),
  getForm: (id: string) => api.get(`/api/public/form/${id}`),
  submitForm: (id: string, data: any) => api.post(`/api/public/form/${id}`, data),
};

// Integrations
export const integrationsAPI = {
  list: () => api.get('/api/integrations/'),
  testEmail: (data: any) => api.post('/api/integrations/email/test', data),
  testSMS: (data: any) => api.post('/api/integrations/sms/test', data),
  addWebhook: (data: any) => api.post('/api/integrations/webhooks', data),
  removeWebhook: (id: string) => api.delete(`/api/integrations/webhooks/${id}`),
};

export default api;
