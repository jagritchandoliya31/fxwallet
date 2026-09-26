import api from './apiClient';

export const premiumAdvisorApi = {
  analyze: (investmentAmount, riskLevel = 'MEDIUM', analysisPeriodDays = 30) =>
    api.get('/premium-advisor/analyze', {
      params: {
        investmentAmount,
        riskLevel,
        analysisPeriodDays,
      },
    }).then((res) => res.data),
};