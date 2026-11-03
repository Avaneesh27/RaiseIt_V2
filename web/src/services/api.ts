import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('raiseit_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !window.location.pathname.includes('/login') && !window.location.pathname.includes('/signup')) {
      localStorage.removeItem('raiseit_token');
      localStorage.removeItem('raiseit_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  login: (credentials: { email: string; password: string }) =>
    api.post('/auth/login', credentials),
  register: (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    address?: string;
  }) => api.post('/auth/register', { ...data, role: 'CITIZEN' }),
  getMe: () => api.get('/auth/me')
};

export const citizenApi = {
  getDashboard: () => api.get('/reports/dashboard'),
  getMyReports: (status?: string) =>
    api.get('/reports/my', { params: status ? { status } : {} }),
  getNearbyReports: (longitude: number, latitude: number, radiusMeters: number = 2000) =>
    api.get('/reports/nearby', { params: { longitude, latitude, radiusMeters } }),
  getReportById: (reportId: string) => api.get(`/reports/${reportId}`),
  getReportTimeline: (reportId: string) => api.get(`/reports/${reportId}/timeline`),
  createReport: (formData: FormData) =>
    api.post('/reports', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  classifyImage: (formData: FormData) =>
    api.post('/ai/classify-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  analyzeReport: (data: { categoryName: string; latitude: number; longitude: number }) =>
    api.post('/ai/analyze-report', data)
};

export const authorityApi = {
  getDashboard: () => api.get('/authority/dashboard'),
  getIssues: (params?: any) => api.get('/authority/issues', { params }),
  getIssueById: (reportId: string) => api.get(`/authority/issues/${reportId}`),
  updateStatus: (reportId: string, data: { status: string; comment?: string }) =>
    api.patch(`/authority/issues/${reportId}/status`, data),
  addProgressUpdate: (reportId: string, formData: FormData) =>
    api.post(`/authority/issues/${reportId}/update`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  resolveIssue: (reportId: string, formData: FormData) =>
    api.post(`/authority/issues/${reportId}/resolve`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  getPriorityLocations: () => api.get('/authority/priority-locations'),
  getAnalytics: () => api.get('/authority/analytics'),
  validateReport: (reportId: string) => api.post(`/ai/validate-report/${reportId}`)
};

export const adminApi = {
  getDashboard: () => api.get('/admin/dashboard'),
  getAuthorities: () => api.get('/admin/authorities'),
  updateAuthority: (id: string, data: any) => api.patch(`/admin/authorities/${id}`, data),
  getDepartments: () => api.get('/admin/departments'),
  createDepartment: (data: any) => api.post('/admin/departments', data),
  updateDepartment: (id: string, data: any) => api.patch(`/admin/departments/${id}`, data),
  getCategories: () => api.get('/admin/categories'),
  createCategory: (data: any) => api.post('/admin/categories', data),
  updateCategory: (id: string, data: any) => api.patch(`/admin/categories/${id}`, data),
  getAllIssues: (params?: any) => api.get('/admin/issues', { params }),
  getDocuments: () => api.get('/admin/documents'),
  uploadDocument: (formData: FormData) =>
    api.post('/admin/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  triggerDocumentIndex: (id: string) => api.post(`/admin/documents/${id}/index`)
};

export const ragApi = {
  query: (question: string, reportId?: string, use_rag: boolean = true) =>
    api.post('/rag/query', { question, reportId, use_rag })
};

export default api;
