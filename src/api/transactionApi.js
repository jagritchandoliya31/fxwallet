import api from './apiClient';

export const transactionApi = {
  buy: (data) => api.post('/transactions/buy', data).then((res) => res.data),
  sell: (data) => api.post('/transactions/sell', data).then((res) => res.data),
  getTransactions: (params) => api.get('/transactions', { params }).then((res) => res.data),
};
