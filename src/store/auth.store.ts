'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Cookies from 'js-cookie';

interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  avatar_url: string;
  role: 'member' | 'admin';
  gender?: string;
  shirt_size?: string;
  date_of_birth?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken?: string | null, rememberMe?: boolean) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

const COOKIE_OPTS = { expires: 7, sameSite: 'lax' as const };

const setAuthCookies = (
  accessToken: string,
  refreshToken?: string | null,
  rememberMe: boolean = false
) => {
  Cookies.set('access_token', accessToken, rememberMe ? { expires: 1, sameSite: 'lax' } : { sameSite: 'lax' });

  if (refreshToken && rememberMe) {
    Cookies.set('refresh_token', refreshToken, { expires: 7, sameSite: 'lax' });
  }
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: typeof window !== 'undefined' ? !!Cookies.get('access_token') : false,
      setAuth: (user, accessToken, refreshToken, rememberMe = true) => {
        setAuthCookies(accessToken, refreshToken, rememberMe);
        set({ user, isAuthenticated: true });
      },
      setUser: (user) => set({ user }),
      logout: () => {
        Cookies.remove('access_token');
        Cookies.remove('refresh_token');
        set({ user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'member-auth',
      partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const hasToken = !!Cookies.get('access_token');
          if (!hasToken) {
            state.user = null;
            state.isAuthenticated = false;
          }
        }
      },
    }
  )
);