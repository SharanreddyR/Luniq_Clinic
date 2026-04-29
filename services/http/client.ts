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
  // Default `Content-Type: application/json` breaks multipart uploads — Laravel
  // then sees no `document` file and returns "must be a file" / mimes errors.
  if (config.data instanceof FormData) {
    const h = config.headers;
    if (h && typeof (h as { delete?: (k: string) => void }).delete === 'function') {
      (h as { delete: (k: string) => void }).delete('Content-Type');
    } else if (h && typeof h === 'object') {
      delete (h as Record<string, unknown>)['Content-Type'];
    }
  }
  return config;
});
