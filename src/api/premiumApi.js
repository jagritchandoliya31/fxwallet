import api from './apiClient';

export const premiumApi = {
  purchasePremium: () =>
    api.post('/premium/purchase').then((res) => res.data),
};