import axios from 'axios';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = Cookies.get('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const url: string = original?.url ?? '';
    const status: number = error.response?.status;

    const isAuthEndpoint = ['/auth/login', '/auth/register', '/auth/refresh'].some(
      (path) => url.includes(path)
    );

    if (status === 401 && !isAuthEndpoint && !original._retry) {
      original._retry = true;
      const refreshToken = Cookies.get('refresh_token');

      if (refreshToken) {
        try {
          const { data } = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, {
            refresh_token: refreshToken,
          });
          Cookies.set('access_token', data.access_token, { expires: 1, sameSite: 'lax' });
          if (data.refresh_token) {
            Cookies.set('refresh_token', data.refresh_token, { expires: 7, sameSite: 'lax' });
          }
          original.headers.Authorization = `Bearer ${data.access_token}`;
          return api(original);
        } catch {
          Cookies.remove('access_token');
          Cookies.remove('refresh_token');
          localStorage.removeItem('member-auth');
          if (typeof window !== 'undefined') window.location.href = '/auth/login';
        }
      } else {
        if (typeof window !== 'undefined') window.location.href = '/auth/login';
      }
    }

    if (!isAuthEndpoint && status !== 401) {
      const msg = error.response?.data?.message;
      const text = Array.isArray(msg) ? msg[0] : msg;
      if (text) toast.error(text);
    }

    return Promise.reject(error);
  }
);

export const authApi = {
  login: (data: any) => api.post('/auth/login', data),
  register: (data: any) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  profile: () => api.get('/auth/profile'),
  refresh: (token: string) => api.post('/auth/refresh', { refresh_token: token }),
};

export const profileApi = {
  getMe: () => api.get('/users/me/profile'),
  updateMe: (data: any) => api.put('/users/me/profile', data),
  updatePassword: (data: any) => api.patch('/users/me/password', data),
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.patch('/users/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const sessionsApi = {
  list: (params?: any) => api.get('/sessions', { params }),
  get: (id: string) => api.get(`/sessions/${id}`),
  getAllCosts: () => api.get('/sessions/costs/summary'),
};

export const registrationsApi = {
  register: (data: { session_id: string; notes?: string }) => api.post('/registrations', data),
  getMyRegistrations: (params?: any) => api.get('/registrations/my', { params }),
  listBySession: (sessionId: number, params?: any) => api.get(`/registrations/session/${sessionId}`, { params }),
  submitPayment: (id: string, data: { payment_reference: string; payment_proof_url?: string }) => api.patch(`/registrations/${id}/payment`, data),
  cancel: (id: string) => api.delete(`/registrations/${id}`),
  getQR: (id: string) => api.get(`/registrations/${id}/qr`),
};

export const rankingsApi = {
  leaderboard: () => api.get('/rankings/leaderboard'),
  myRank: () => api.get('/rankings/my-rank'),
  myStats: () => api.get('/rankings/my-stats'),
  winRate: () => api.get('/rankings/win-rate'),
  rankLeaderboard: () => api.get('/rankings/rank-leaderboard'),
};

export const matchesApi = {
  getOne: (id: string) => api.get(`/matches/${id}`),
  list: (params?: any) => api.get('/matches/my', { params }),
  get: (id: string) => api.get(`/matches/${id}`),
  create: (data: any) => api.post('/matches', data),
  accept: (id: string) => api.patch(`/matches/${id}/accept`),
  decline: (id: string, reason?: string) =>
    api.patch(`/matches/${id}/decline`, { reason }),
  submitResult: (id: string, data: { sets: any[]; played_at?: string; note?: string }) =>
    api.patch(`/matches/${id}/result`, data),
};

export const usersApi = {
  birthdaysThisMonth: () => api.get('/users/birthday/this-month'),
  searchMembers: (q: string) =>
    api.get('/users/search/members', { params: { q } }),
};



// if (refreshToken) {
//         try {
//           const { data } = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, {
//             refresh_token: refreshToken,
//           });
//           const opts = { expires: 7, sameSite: 'lax' as const };
//           Cookies.set('access_token', data.access_token, opts);
//           if (data.refresh_token) Cookies.set('refresh_token', data.refresh_token, opts);
//           original.headers.Authorization = `Bearer ${data.access_token}`;
//           return api(original);
//         } catch {
//           Cookies.remove('access_token');
//           Cookies.remove('refresh_token');
//           localStorage.removeItem('member-auth');
//           if (typeof window !== 'undefined') window.location.href = '/auth/login';
//         }
//       }


