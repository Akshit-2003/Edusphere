import axios from 'axios';

const BASE_URL =
  import.meta.env.VITE_API_URL || 'https://edusphere-backend-9it7.onrender.com';

const API = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const forgotPassword = async (email) => {
  const response = await API.post('/auth/forgot-password', { email });
  return response.data;
};

export const resetPassword = async (token, newPassword) => {
  const response = await API.post('/auth/reset-password', {
    token,
    new_password: newPassword,
  });
  return response.data;
};