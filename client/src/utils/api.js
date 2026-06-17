import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  timeout: 30000
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('awt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});