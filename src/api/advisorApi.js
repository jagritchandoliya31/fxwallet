import api from './apiClient';

export const advisorApi = {
  getAdvisor: (code) => api.get(`/advisor/${code}`).then((res) => res.data),
};
