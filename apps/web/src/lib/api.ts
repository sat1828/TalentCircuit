import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE = '/api';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Request interceptor: attach access token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle token refresh
let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = response.data;

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        // Process pending queue
        pendingQueue.forEach((p) => p.resolve(accessToken));
        pendingQueue = [];

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (email: string, password: string, fullName: string, companyDomain: string) =>
    api.post('/auth/register', { email, password, fullName, companyDomain }),
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
};

// Profile API
export const profileApi = {
  get: () => api.get('/me/profile'),
  update: (data: Record<string, unknown>) => api.put('/me/profile', data),
  getSkills: () => api.get('/me/profile/skills'),
  addSkill: (skillName: string, proficiencyLevel: number) =>
    api.post('/me/profile/skills', { skillName, proficiencyLevel }),
  updateSkill: (skillId: string, proficiencyLevel: number) =>
    api.put(`/me/profile/skills/${skillId}`, { proficiencyLevel }),
  removeSkill: (skillId: string) =>
    api.delete(`/me/profile/skills/${skillId}`),
  validateSkill: (data: { employeeSkillId: string; proficiencyLevel: number }) =>
    api.post('/me/profile/validate-skill', data),
};

// Jobs API
export const jobsApi = {
  list: (params?: Record<string, string | number>) =>
    api.get('/jobs', { params }),
  get: (id: string) => api.get(`/jobs/${id}`),
  create: (data: Record<string, unknown>) => api.post('/jobs', data),
  expressInterest: (id: string) => api.post(`/jobs/${id}/interest`),
  apply: (id: string) => api.post(`/jobs/${id}/apply`),
  getInterestCount: (id: string) => api.get(`/jobs/${id}/interest-count`),
  getHiddenTalent: (id: string) => api.get(`/jobs/${id}/hidden-talent`),
  getApplications: () => api.get('/jobs/applications/mine'),
  updateApplicationStatus: (postingId: string, applicantId: string, status: string) =>
    api.put(`/jobs/${postingId}/applications/${applicantId}/status`, { status }),
  sendNudge: (postingId: string, userId: string, message: string) =>
    api.post(`/jobs/${postingId}/nudge/${userId}`, { message }),
};

// AI API
export const aiApi = {
  getGapAnalysis: (postingId: string) => api.get(`/ai/gap-analysis/${postingId}`),
  getCareerPath: () => api.get('/ai/career-path'),
};

// Notifications API
export const notificationsApi = {
  list: () => api.get('/notifications'),
  markRead: (ids?: string[]) => api.put('/notifications/read', { ids }),
};

// Admin API
export const adminApi = {
  getMetrics: () => api.get('/admin/metrics'),
  getDepartmentMetrics: (department: string) =>
    api.get(`/admin/metrics/department/${department}`),
  getSkillDistribution: () => api.get('/admin/metrics/skills'),
  triggerDigest: () => api.post('/admin/digest/trigger'),
  seedEmbeddings: () => api.post('/admin/embeddings/seed'),
  recomputeEmbeddings: () => api.post('/admin/embeddings/recompute'),
};
