import axios from 'axios';

import { API_BASE_URL } from '@/constants/config';
import { useAuthStore } from '@/store';

/**
 * Shared Axios instance for JSON APIs. Uses {@link API_BASE_URL}.
 * Auth: Bearer token from Zustand when present.
 */
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
