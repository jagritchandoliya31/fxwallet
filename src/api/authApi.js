import axios from 'axios';

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api`;
export const authApi = axios.create({ baseURL: `${API_BASE}/auth` });

export const register = async (data) => {
  const response = await authApi.post('/register', data);
  return response.data;
};

export const login = async (data) => {
  const response = await authApi.post('/login', data);
  return response.data;
};


export const verifyOtp = async (email, otp) => {
  const response = await authApi.post('/verify-otp', null, { params: { email, otp } });
  return response.data;
};

export const resendOtp = async (email) => {
  const response = await authApi.post('/resend-otp', null, { params: { email } });
  return response.data;
};
