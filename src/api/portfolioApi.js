import api from './apiClient';

export const portfolioApi = {
  getPortfolio: () => api.get('/portfolio').then((res) => res.data),
};
