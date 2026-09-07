import api from './apiClient';

export const alertsApi = {
  getAlerts: () => api.get('/alerts').then((res) => res.data),
  createAlert: (data) => api.post('/alerts', data).then((res) => res.data),
  deleteAlert: (id) => api.delete(`/alerts/${id}`).then((res) => res.data),
};
