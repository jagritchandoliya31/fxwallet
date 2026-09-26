import api from './apiClient';

export const ratesApi = {
  getAllRates: () => api.get('/rates').then((res) => res.data),
  getHistory: (currencyCode) => api.get(`/rates/${currencyCode}/history`).then((res) => res.data),
};
