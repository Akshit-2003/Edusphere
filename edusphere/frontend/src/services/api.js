import axios from 'axios';

const API = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/v1', // Aapka FastAPI base URL
  headers: {
    'Content-Type': 'application/json',
  },
});

export const forgotPassword = async (email) => {
  const response = await API.post('/auth/forgot-password', { email });
  return response.data;
};

export const resetPassword = async (token, newPassword) => {
  const response = await API.post('/auth/reset-password', { token, new_password: newPassword });
  return response.data;
};