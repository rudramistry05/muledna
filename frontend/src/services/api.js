import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const BASE_URL = `${API_URL}/api/v1`;

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const formatErrorMessage = (err, fallbackMsg = 'Operation failed. Please review your input.') => {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') {
    return detail;
  }
  if (Array.isArray(detail)) {
    return detail.map(item => item.msg || JSON.stringify(item)).join('. ');
  }
  if (detail && typeof detail === 'object') {
    return detail.msg || JSON.stringify(detail);
  }
  return err?.message || fallbackMsg;
};

// Add Token Interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor for Token Refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          throw new Error("No refresh token available");
        }
        
        // Refresh request
        const res = await axios.post(`${BASE_URL}/auth/refresh?refresh_token=${refreshToken}`);
        const { access_token } = res.data;
        
        localStorage.setItem('access_token', access_token);
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        
        return api(originalRequest);
      } catch (refreshError) {
        // Logout user on fail
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_profile');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.access_token) {
      localStorage.setItem('access_token', res.data.access_token);
      localStorage.setItem('refresh_token', res.data.refresh_token);
      localStorage.setItem('user_profile', JSON.stringify(res.data.user));
    }
    return res.data;
  },
  register: async (email, password, fullName, role) => {
    const res = await api.post('/auth/register', { email, password, full_name: fullName, role });
    return res.data;
  },
  verifyOtp: async (email, otpCode) => {
    const res = await api.post('/auth/verify-otp', { email, otp_code: otpCode });
    return res.data;
  },
  forgotPassword: async (email) => {
    const res = await api.post('/auth/forgot-password', { email });
    return res.data;
  },
  resetPassword: async (email, otpCode, newPassword) => {
    const res = await api.post('/auth/reset-password', { email, otp_code: otpCode, new_password: newPassword });
    return res.data;
  },
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_profile');
  }
};

export const accountsAPI = {
  list: async (filters = {}) => {
    const res = await api.get('/accounts/', { params: filters });
    return res.data;
  },
  get: async (id) => {
    const res = await api.get(`/accounts/${id}`);
    return res.data;
  },
  create: async (data) => {
    const res = await api.post('/accounts/', data);
    return res.data;
  },
  freeze: async (id) => {
    const res = await api.post(`/accounts/${id}/freeze`);
    return res.data;
  },
  getFeatures: async (id, amount = 1000.0) => {
    const res = await api.get(`/accounts/${id}/features`, { params: { current_txn_amount: amount } });
    return res.data;
  }
};

export const transactionsAPI = {
  list: async (params = {}) => {
    const res = await api.get('/transactions/', { params });
    return res.data;
  },
  get: async (id) => {
    const res = await api.get(`/transactions/${id}`);
    return res.data;
  },
  submit: async (data) => {
    const res = await api.post('/transactions/', data);
    return res.data;
  },
  approve: async (id) => {
    const res = await api.post(`/transactions/${id}/approve`);
    return res.data;
  },
  block: async (id) => {
    const res = await api.post(`/transactions/${id}/block`);
    return res.data;
  }
};

export const fraudRingsAPI = {
  get: async () => {
    const res = await api.get('/fraud-rings/');
    return res.data;
  },
  freezeRing: async (accountIds) => {
    const res = await api.post('/fraud-rings/freeze-ring', accountIds);
    return res.data;
  }
};

export const alertsAPI = {
  list: async () => {
    const res = await api.get('/alerts/');
    return res.data;
  },
  active: async () => {
    const res = await api.get('/alerts/active');
    return res.data;
  },
  update: async (id, data) => {
    const res = await api.put(`/alerts/${id}`, data);
    return res.data;
  },
  triggerVoice: async (id) => {
    const res = await api.post(`/alerts/${id}/voice`);
    return res.data;
  },
  sendDirectSms: async (phoneNumber, message = null, alertType = 'SMS') => {
    const res = await api.post('/alerts/send-direct-sms', {
      phone_number: phoneNumber,
      message: message,
      alert_type: alertType
    });
    return res.data;
  }
};

export const reportsAPI = {
  cases: async () => {
    const res = await api.get('/reports');
    return res.data;
  },
  getCase: async (id) => {
    const res = await api.get('/reports');
    return res.data.find(c => c.id === id);
  },
  createCase: async (data) => {
    const res = await api.post('/reports/cases', data);
    return res.data;
  },
  updateCase: async (id, data) => {
    const res = await api.put(`/reports/cases/${id}`, data);
    return res.data;
  },
  generateSar: async (caseId) => {
    const res = await api.post(`/reports/cases/${caseId}/sar`);
    return res.data;
  },
  downloadSar: async (sarId) => {
    const res = await api.get(`/reports/sar/${sarId}/download`);
    return res.data;
  }
};

export const metricsAPI = {
  dashboard: async () => {
    const res = await api.get('/metrics/dashboard');
    return res.data;
  },
  ml: async () => {
    const res = await api.get('/metrics/ml');
    return res.data;
  },
  retrain: async () => {
    const res = await api.post('/admin/retrain');
    return res.data;
  },
  health: async () => {
    const res = await api.get('/admin/health');
    return res.data;
  },
  logs: async () => {
    const res = await api.get('/admin/logs');
    return res.data;
  }
};

export default api;
