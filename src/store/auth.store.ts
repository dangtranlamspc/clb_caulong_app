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
  // access_token: nếu không remember me, dùng session cookie (mất khi đóng browser)
  // nếu remember me, set theo đúng vòng đời backend (1 ngày, khớp JWT_EXPIRES_IN)
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


// export const useAuthStore = create<AuthState>()(
//   persist(
//     (set) => ({
//       user: null,
//       isAuthenticated: typeof window !== 'undefined' ? !!Cookies.get('access_token') : false,

//       setAuth: (user, accessToken, refreshToken, rememberMe = false) => {
//         const opts = rememberMe
//           ? { expires: 7, sameSite: 'lax' as const }
//           : { sameSite: 'lax' as const };

//         Cookies.set('access_token', accessToken, opts);

//         if (refreshToken) {
//           Cookies.set('refresh_token', refreshToken, opts);
//         }

//         set({
//           user,
//           isAuthenticated: true
//         });
//       },
//       setUser: (user) => set({ user }),
//       logout: () => {
//         Cookies.remove('access_token');
//         Cookies.remove('refresh_token');
//         set({ user: null, isAuthenticated: false });
//       },
//     }),
//     {
//       name: 'member-auth',
//       partialize: (s) => ({ user: s.user }),
//       onRehydrateStorage: () => (state) => {
//         if (state) {
//           const hasToken = !!Cookies.get('access_token');

//           if (!hasToken) {
//             state.user = null;
//             state.isAuthenticated = false;
//           } else {
//             state.isAuthenticated = true;
//           }
//         }
//       },
//     }
//   )
// );




// setAuth: (user, accessToken, refreshToken, rememberMe = true) => {
//   Cookies.set('access_token', accessToken, COOKIE_OPTS);
//   if (refreshToken) Cookies.set('refresh_token', refreshToken, COOKIE_OPTS);
//   set({ user, isAuthenticated: true });
// },