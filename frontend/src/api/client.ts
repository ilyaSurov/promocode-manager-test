import axios from 'axios';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from '../auth/token-storage';

const baseURL = import.meta.env.VITE_API_URL ?? '';

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const t = getAccessToken();
  if (t) {
    config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    const rt = getRefreshToken();
    if (!rt) {
      return Promise.resolve(null);
    }
    const refreshUrl = baseURL
      ? `${baseURL.replace(/\/$/, '')}/api/auth/refresh`
      : `${window.location.origin}/api/auth/refresh`;
    refreshPromise = axios
      .post<{ accessToken: string; refreshToken: string }>(
        refreshUrl,
        { refreshToken: rt },
        { headers: { 'Content-Type': 'application/json' } },
      )
      .then(({ data }) => {
        setTokens(data.accessToken, data.refreshToken);
        refreshPromise = null;
        return data.accessToken;
      })
      .catch(() => {
        refreshPromise = null;
        clearTokens();
        return null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (r) => r,
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || !error.config) {
      return Promise.reject(error);
    }
    const original = error.config as typeof error.config & { _retry?: boolean };
    const url = String(original.url ?? '');
    if (
      error.response?.status === 401 &&
      !original._retry &&
      !url.includes('/auth/refresh') &&
      !url.includes('/auth/login') &&
      !url.includes('/auth/register')
    ) {
      original._retry = true;
      const access = await refreshAccessToken();
      if (!access) {
        window.location.assign('/login');
        return Promise.reject(error);
      }
      original.headers.Authorization = `Bearer ${access}`;
      return api(original);
    }
    return Promise.reject(error);
  },
);
