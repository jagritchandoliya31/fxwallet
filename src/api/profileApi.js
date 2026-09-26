import api from './apiClient';

export const profileApi = {
  getProfile: () =>
    api.get('/profile').then((res) => res.data),

  updateProfile: (name, username, phoneNo) =>
    api.put('/profile', null, {
      params: {
        name,
        username,
        phoneNo,
      },
    }).then((res) => res.data),

  uploadProfileImage: (file) => {
    const formData = new FormData();
    formData.append('file', file);

    return api.post('/profile/image', formData)
      .then((res) => res.data);
  },

  getProfileImage: () =>
    api.get('/profile/image', {
      responseType: 'blob',
    }).then((res) => res.data),
};