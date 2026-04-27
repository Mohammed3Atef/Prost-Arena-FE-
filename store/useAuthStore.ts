/**
 * Auth Store (Zustand)
 * Persists accessToken in localStorage (`pa-auth`).
 * Stores refreshToken separately in `pa-refresh-token` for the axios refresh
 * interceptor to read.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api from '../services/api/client';

const REFRESH_TOKEN_KEY = 'pa-refresh-token';

function setRefreshToken(token: string | null | undefined) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

function clearRefreshToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

interface User {
  _id:            string;
  name:           string;
  email:          string;
  avatar:         string | null;
  role:           'user' | 'admin' | 'superadmin';
  xp:             number;
  level:          number;
  points:         number;
  referralCode:   string;
  isGuest:        boolean;
  challengeWins:  number;
  totalOrders:    number;
}

interface AuthState {
  user:         User | null;
  accessToken:  string | null;
  isLoading:    boolean;
  isHydrated:   boolean;

  login:         (email: string, password: string) => Promise<void>;
  register:      (data: RegisterPayload) => Promise<void>;
  guestCheckout: (data: GuestPayload) => Promise<void>;
  logout:        () => void;
  setUser:       (user: User) => void;
  refreshUser:   () => Promise<void>;
}

interface RegisterPayload {
  name: string; email: string; password: string; referralCode?: string;
}

interface GuestPayload {
  name: string; phone: string; email?: string;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user:        null,
      accessToken: null,
      isLoading:   false,
      isHydrated:  false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/login', { email, password });
          api.defaults.headers.common['Authorization'] = `Bearer ${data.data.accessToken}`;
          setRefreshToken(data.data.refreshToken);
          set({ user: data.data.user, accessToken: data.data.accessToken, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      register: async (payload) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/register', payload);
          api.defaults.headers.common['Authorization'] = `Bearer ${data.data.accessToken}`;
          setRefreshToken(data.data.refreshToken);
          set({ user: data.data.user, accessToken: data.data.accessToken, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      guestCheckout: async (payload) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/guest', payload);
          api.defaults.headers.common['Authorization'] = `Bearer ${data.data.accessToken}`;
          setRefreshToken(data.data.refreshToken);
          set({ user: data.data.user, accessToken: data.data.accessToken, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: () => {
        delete api.defaults.headers.common['Authorization'];
        clearRefreshToken();
        set({ user: null, accessToken: null });
      },

      setUser: (user) => set({ user }),

      refreshUser: async () => {
        try {
          const { data } = await api.get('/auth/me');
          set({ user: data.data });
        } catch {
          get().logout();
        }
      },
    }),
    {
      name:    'pa-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isHydrated = true;
          if (state.accessToken) {
            api.defaults.headers.common['Authorization'] = `Bearer ${state.accessToken}`;
          }
        }
      },
    },
  ),
);
