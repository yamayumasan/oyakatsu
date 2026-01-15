import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/auth';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/v1';

// Axiosインスタンスを作成
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// リクエストインターセプター: 認証トークンを付与
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// レスポンスインターセプター: エラーハンドリング & トークンリフレッシュ
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;

    // 401エラーの場合、トークンリフレッシュを試みる
    if (error.response?.status === 401 && originalRequest) {
      const { refreshToken, logout } = useAuthStore.getState();

      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken: newAccessToken, refreshToken: newRefreshToken, user } = response.data;
          useAuthStore.getState().setAuth(user, newAccessToken, newRefreshToken);

          // リトライ
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          // リフレッシュ失敗時はログアウト
          logout();
        }
      } else {
        logout();
      }
    }

    return Promise.reject(error);
  }
);

// APIエラーの型定義
export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

// エラーメッセージを取得するユーティリティ
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiError | undefined;
    if (apiError?.error?.message) {
      return apiError.error.message;
    }
    if (error.message) {
      return error.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return '予期しないエラーが発生しました';
}
