import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  username: string;
  password: string;
  role: 'admin' | 'user';
  createdAt: string;
  createdBy?: string;
}

interface AuthState {
  users: User[];
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  changePassword: (userId: string, newPassword: string) => boolean;
  createUser: (username: string, password: string, role: 'admin' | 'user') => boolean;
  deleteUser: (userId: string) => boolean;
  getUsers: () => User[];
}

// Default admin user
const defaultAdmin: User = {
  id: 'admin-001',
  username: 'netviz_admin',
  password: 'V3ry$trongAdm1n!2025',
  role: 'admin',
  createdAt: new Date().toISOString(),
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      users: [defaultAdmin],
      currentUser: null,
      isAuthenticated: false,

      login: (username: string, password: string) => {
        const { users } = get();
        const user = users.find(
          (u) => u.username === username && u.password === password
        );
        if (user) {
          set({ currentUser: user, isAuthenticated: true });
          return true;
        }
        return false;
      },

      logout: () => {
        set({ currentUser: null, isAuthenticated: false });
      },

      changePassword: (userId: string, newPassword: string) => {
        const { users, currentUser } = get();
        const userIndex = users.findIndex((u) => u.id === userId);
        
        if (userIndex === -1) return false;
        
        // Only admin can change other users' passwords, or user can change their own
        if (currentUser?.role !== 'admin' && currentUser?.id !== userId) {
          return false;
        }

        const updatedUsers = [...users];
        updatedUsers[userIndex] = {
          ...updatedUsers[userIndex],
          password: newPassword,
        };

        set({ users: updatedUsers });
        
        // Update current user if they changed their own password
        if (currentUser?.id === userId) {
          set({ currentUser: updatedUsers[userIndex] });
        }
        
        return true;
      },

      createUser: (username: string, password: string, role: 'admin' | 'user') => {
        const { users, currentUser } = get();
        
        // Only admin can create users
        if (currentUser?.role !== 'admin') return false;
        
        // Check if username already exists
        if (users.some((u) => u.username === username)) return false;

        const newUser: User = {
          id: `user-${Date.now()}`,
          username,
          password,
          role,
          createdAt: new Date().toISOString(),
          createdBy: currentUser.username,
        };

        set({ users: [...users, newUser] });
        return true;
      },

      deleteUser: (userId: string) => {
        const { users, currentUser } = get();
        
        // Only admin can delete users
        if (currentUser?.role !== 'admin') return false;
        
        // Cannot delete yourself
        if (currentUser?.id === userId) return false;
        
        // Cannot delete the default admin
        if (userId === 'admin-001') return false;

        set({ users: users.filter((u) => u.id !== userId) });
        return true;
      },

      getUsers: () => {
        return get().users;
      },
    }),
    {
      name: 'netviz-auth-storage',
    }
  )
);
