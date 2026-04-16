/**
 * Authentication utilities for token management and API calls
 */

import axios from "axios";

const backendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

// Token storage helpers (only token, no user data)
export const setToken = (token: string) => {
  localStorage.setItem("token", token);
};

export const getToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
};

export const removeToken = () => {
  localStorage.removeItem("token");
};

// API call to fetch current user with active ride info
export const fetchCurrentUser = async (token: string) => {
  const response = await axios.get(`${backendUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// Token refresh
export const refreshToken = async (token: string) => {
  const response = await axios.post(`${backendUrl}/api/auth/refresh`, {
    token,
  });
  return response.data.token;
};

// Setup axios interceptor for automatic token refresh
export const setupAxiosInterceptor = () => {
  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        const token = getToken();

        if (token) {
          try {
            const newToken = await refreshToken(token);
            setToken(newToken);
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return axios.request(originalRequest);
          } catch (refreshError) {
            removeToken();
            if (typeof window !== "undefined") {
              window.location.href = "/login";
            }
            return Promise.reject(refreshError);
          }
        } else {
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
        }
      }

      return Promise.reject(error);
    },
  );
};
