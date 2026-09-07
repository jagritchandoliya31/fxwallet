import api from './apiClient';

export const ratesApi = {
  getAllRates: () => api.get('/rates').then((res) => res.data),
};
