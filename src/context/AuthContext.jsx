import { createContext, useContext, useState, useEffect } from 'react';
import { register as apiRegister, login as apiLogin, loginWithOtp as apiLoginWithOtp, verifyOtp as apiVerifyOtp, resendOtp as apiResendOtp } from '../api/authApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('fxwallet_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      localStorage.setItem('fxwallet_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('fxwallet_user');
    }
  }, [user]);

  const login = async (email, password) => {
    setLoading(true);
    setError('');
    try {
      const data = await apiLogin({ email, password });
      if (data.mfaRequired) {
        return data;
      }
      localStorage.setItem('fxwallet_token', data.token);
      setUser({ name: data.name, email: data.email, role: data.role });
      return data;
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginWithOtp = async (email) => {
    setLoading(true);
    setError('');
    try {
      return await apiLoginWithOtp(email);
    } catch (err) {
      const message = err.response?.data?.message || 'Unable to send login OTP';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (email, otp) => {
    setLoading(true);
    setError('');
    try {
      const data = await apiVerifyOtp(email, otp);
      localStorage.setItem('fxwallet_token', data.token);
      setUser({ name: data.name, email: data.email, role: data.role });
      return data;
    } catch (err) {
      const message = err.response?.data?.message || 'Invalid OTP';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async (email) => {
    setLoading(true);
    setError('');
    try {
      return await apiResendOtp(email);
    } catch (err) {
      const message = err.response?.data?.message || 'Unable to resend OTP';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password) => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRegister({ name, email, password });
      localStorage.setItem('fxwallet_token', data.token);
      setUser({ name: data.name, email: data.email, role: data.role });
      return data;
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('fxwallet_token');
    localStorage.removeItem('fxwallet_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, loginWithOtp, verifyOtp, resendOtp, register, logout, loading, error, setError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
