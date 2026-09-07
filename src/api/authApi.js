import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export const authApi = axios.create({ baseURL: `${API_BASE}/auth` });

export const register = async (data) => {
  const response = await authApi.post('/register', data);
  return response.data;
};

export const login = async (data) => {
  const response = await authApi.post('/login', data);
  return response.data;
};
