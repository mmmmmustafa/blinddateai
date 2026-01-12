import { create } from 'zustand';
import { Platform } from 'react-native';

export type UserStatus = 'onboarding' | 'active' | 'paused' | 'in_chat';

// Web-compatible storage (SecureStore doesn't work on web)
const storage = {
  async setItem(key: string, value: string) {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      const SecureStore = require('expo-secure-store');
      await SecureStore.setItemAsync(key, value);
    }
  },
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    } else {
      const SecureStore = require('expo-secure-store');
      return await SecureStore.getItemAsync(key);
    }
  },
  async deleteItem(key: string) {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      const SecureStore = require('expo-secure-store');
      await SecureStore.deleteItemAsync(key);
    }
  },
};

interface UserState {
  token: string | null;
  userId: string | null;
  status: UserStatus | null;
  currentMatchId: string | null;
  
  // Actions
  setAuth: (token: string, userId: string, status: UserStatus) => Promise<void>;
  setStatus: (status: UserStatus) => void;
  setCurrentMatch: (matchId: string | null) => void;
  logout: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

export const useUserStore = create<UserState>((set) => ({
  token: null,
  userId: null,
  status: null,
  currentMatchId: null,

  setAuth: async (token, userId, status) => {
    await storage.setItem('token', token);
    await storage.setItem('userId', userId);
    await storage.setItem('status', status);
    set({ token, userId, status });
  },

  setStatus: (status) => {
    storage.setItem('status', status);
    set({ status });
  },

  setCurrentMatch: (matchId) => {
    if (matchId) {
      storage.setItem('currentMatchId', matchId);
    } else {
      storage.deleteItem('currentMatchId');
    }
    set({ currentMatchId: matchId });
  },

  logout: async () => {
    await storage.deleteItem('token');
    await storage.deleteItem('userId');
    await storage.deleteItem('status');
    await storage.deleteItem('currentMatchId');
    set({ token: null, userId: null, status: null, currentMatchId: null });
  },

  loadFromStorage: async () => {
    try {
      const token = await storage.getItem('token');
      const userId = await storage.getItem('userId');
      const status = await storage.getItem('status') as UserStatus | null;
      const currentMatchId = await storage.getItem('currentMatchId');
      set({ token, userId, status, currentMatchId });
    } catch (error) {
      console.error('Failed to load from storage:', error);
    }
  },
}));
