import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getCurrentUser: () => api.get('/auth/me'),
  getAllUsers: () => api.get('/auth/users'),
  updateUser: (id, userData) => api.put(`/auth/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/auth/users/${id}`),
  resetPassword: (id) => api.post(`/auth/users/${id}/reset-password`),
  changePassword: (data) => api.post('/auth/change-password', data),
};

// Facilities API
export const facilitiesAPI = {
  getAll: () => api.get('/facilities'),
  getOne: (id) => api.get(`/facilities/${id}`),
  create: (data) => api.post('/facilities', data),
  update: (id, data) => api.put(`/facilities/${id}`, data),
  delete: (id) => api.delete(`/facilities/${id}`),
  getUsers: (id) => api.get(`/facilities/${id}/users`),
  assignUser: (id, userId) => api.post(`/facilities/${id}/assign-user`, { userId }),
};

// Cleaning API
export const cleaningAPI = {
  getByFacility: (facilityId) => api.get(`/cleaning/facility/${facilityId}`),
  getTodayByFacility: (facilityId) => api.get(`/cleaning/facility/${facilityId}/today`),
  create: (data) => api.post('/cleaning', data),
  complete: (id, photoFile) => {
    const formData = new FormData();
    formData.append('photo', photoFile);
    return api.post(`/cleaning/${id}/complete`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  delete: (id) => api.delete(`/cleaning/${id}`),
};

// Visits API
export const visitsAPI = {
  getByFacility: (facilityId) => api.get(`/visits/facility/${facilityId}`),
  create: (data) => api.post('/visits', data),
  update: (id, data) => api.put(`/visits/${id}`, data),
  updateStatus: (id, status) => api.put(`/visits/${id}/status`, { status }),
  delete: (id) => api.delete(`/visits/${id}`),
};

// Chat API
export const chatAPI = {
  getMessages: (facilityId, limit = 50) => api.get(`/chat/facility/${facilityId}`, { params: { limit } }),
  sendMessage: (facilityId, message) => api.post('/chat', { facilityId, message }),
  deleteMessage: (id) => api.delete(`/chat/${id}`),
};

// Dashboard API
export const dashboardAPI = {
  getKPIs: () => api.get('/dashboard/kpis'),
  getFacilityStats: (facilityId) => api.get(`/dashboard/facility/${facilityId}`),
};

// Grievances API
export const grievancesAPI = {
  getByFacility: (facilityId) => api.get(`/grievances/facility/${facilityId}`),
  create: (data, voiceBlob) => {
    const formData = new FormData();
    formData.append('facilityId', data.facilityId);
    formData.append('category', data.category);
    formData.append('remarks', data.remarks || '');
    if (voiceBlob) {
      formData.append('voice', voiceBlob, 'voice-recording.webm');
    }
    return api.post('/grievances', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  pick: (id) => api.post(`/grievances/${id}/pick`),
  updateStatus: (id, status) => api.patch(`/grievances/${id}/status`, { status }),
};

// Cleaning Assignments API
export const cleaningAssignmentsAPI = {
  getByFacility: (facilityId, startDate, endDate) =>
    api.get(`/cleaning-assignments/facility/${facilityId}`, { params: { startDate, endDate } }),
  getOne: (id) => api.get(`/cleaning-assignments/${id}`),
  create: (data) => api.post('/cleaning-assignments', data),
  autoAssign: (facilityId) => api.post(`/cleaning-assignments/auto-assign/${facilityId}`),
  updateStatus: (id, status) => api.patch(`/cleaning-assignments/${id}/status`, { status }),
  toggleChecklistItem: (itemId) => api.patch(`/cleaning-assignments/checklist/${itemId}/toggle`),
  uploadPhoto: (itemId, photoFile) => {
    const formData = new FormData();
    formData.append('photo', photoFile);
    return api.post(`/cleaning-assignments/checklist/${itemId}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default api;
