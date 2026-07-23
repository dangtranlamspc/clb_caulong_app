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
  setAuth: (user: User) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: typeof window !== 'undefined' ? !!Cookies.get('logged_in') : false,
      setAuth: (user) => {
        set({ user, isAuthenticated: true });
      },
      setUser: (user) => set({ user }),
      logout: () => {
        Cookies.remove('logged_in');
        set({ user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'member-auth',
      partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const hasFlag = !!Cookies.get('logged_in');
          if (!hasFlag) {
            state.user = null;
            state.isAuthenticated = false;
          }
        }
      },
    }
  )
);