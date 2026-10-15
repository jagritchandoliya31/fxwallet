import axios from 'axios';

const configuredApiUrl =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:8080';

const API_BASE = configuredApiUrl.replace(/\\/$/, '').endsWith('/api')
  ? configuredApiUrl.replace(/\\/$/, '')
  : `${configuredApiUrl.replace(/\\/$/, '')}/api`;

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fxwallet_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('fxwallet_token');
      localStorage.removeItem('fxwallet_user');
      window.location.replace('/');
    }
    return Promise.reject(error);
  }
);

export const walletApi = {
  getWallet: () => api.get('/wallet').then((res) => res.data),
};

export default api;
