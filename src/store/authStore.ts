import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';
import { keycloak } from '@/lib/keycloak';

export type AuthMode = 'legacy' | 'keycloak';

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
  createdAt?: string;
  lastLogin?: string;
  authSource?: 'legacy' | 'keycloak';
}

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  authMode: AuthMode;

  // Actions
  login: (username: string, password: string) => Promise<boolean>;
  loginWithKeycloak: () => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  clearError: () => void;
  initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      authMode: 'legacy' as AuthMode,

      initAuth: async () => {
        set({ isLoading: true });
        try {
          const keycloakAvailable = await keycloak.init();

          if (keycloakAvailable && keycloak.isAuthenticated()) {
            const userInfo = keycloak.getUserInfo();
            if (userInfo) {
              set({
                currentUser: {
                  id: userInfo.id,
                  username: userInfo.username,
                  role: userInfo.roles[0] as 'admin' | 'user',
                  authSource: 'keycloak',
                },
                isAuthenticated: true,
                authMode: 'keycloak',
                isLoading: false,
              });
              return;
            }
          }

          if (keycloakAvailable) {
            set({ authMode: 'keycloak', isLoading: false });
            return;
          }

          // Fall back to legacy auth check
          set({ authMode: 'legacy', isLoading: false });
          await get().checkAuth();
        } catch (error) {
          console.error('[Auth] Init failed:', error);
          set({ authMode: 'legacy', isLoading: false });
        }
      },

      loginWithKeycloak: () => {
        if (keycloak.isAvailable()) {
          keycloak.login();
        } else {
          console.error('[Auth] Keycloak is not available');
        }
      },

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
        const { authMode, currentUser } = get();

        // Handle Keycloak logout
        if (authMode === 'keycloak' && currentUser?.authSource === 'keycloak') {
          keycloak.logout();
          return;
        }

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
