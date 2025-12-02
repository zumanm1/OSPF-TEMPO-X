import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
  createdAt?: string;
  lastLogin?: string;
}

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (username: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const result = await api.login(username, password);
          
          if (result.error) {
            set({ isLoading: false, error: result.error });
            return false;
          }

          if (result.data) {
            set({
              currentUser: {
                id: result.data.user.id,
                username: result.data.user.username,
                role: result.data.user.role,
              },
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
            return true;
          }

          set({ isLoading: false, error: 'Login failed' });
          return false;
        } catch (error) {
          set({ isLoading: false, error: 'Login failed. Please try again.' });
          return false;
        }
      },

      logout: async () => {
        try {
          await api.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          set({ currentUser: null, isAuthenticated: false, error: null });
        }
      },

      checkAuth: async () => {
        const token = api.getToken();
        if (!token) {
          set({ currentUser: null, isAuthenticated: false });
          return false;
        }

        set({ isLoading: true });
        
        try {
          const result = await api.getMe();
          
          if (result.error) {
            api.setToken(null);
            set({ currentUser: null, isAuthenticated: false, isLoading: false });
            return false;
          }

          if (result.data) {
            set({
              currentUser: {
                id: result.data.user.id,
                username: result.data.user.username,
                role: result.data.user.role as 'admin' | 'user',
                createdAt: result.data.user.created_at,
                lastLogin: result.data.user.last_login,
              },
              isAuthenticated: true,
              isLoading: false,
            });
            return true;
          }

          set({ isLoading: false });
          return false;
        } catch (error) {
          api.setToken(null);
          set({ currentUser: null, isAuthenticated: false, isLoading: false });
          return false;
        }
      },

      changePassword: async (currentPassword: string, newPassword: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const result = await api.changePassword(currentPassword, newPassword);
          
          if (result.error) {
            set({ isLoading: false, error: result.error });
            return false;
          }

          set({ isLoading: false });
          return true;
        } catch (error) {
          set({ isLoading: false, error: 'Failed to change password' });
          return false;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'netviz-auth',
      version: 3,
      partialize: (state) => ({
        // Only persist minimal auth state - token is stored separately by api client
        isAuthenticated: state.isAuthenticated,
        currentUser: state.currentUser,
      }),
    }
  )
);
