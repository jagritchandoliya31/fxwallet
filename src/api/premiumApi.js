import api from './apiClient';

export const premiumApi = {
  requestPurchaseVerification: () =>
    api.post('/premium/request-verification').then((res) => res.data),

  confirmPremiumPurchase: (otp) =>
    api.post('/premium/confirm-purchase', null, { params: { otp } }).then((res) => res.data),
};
