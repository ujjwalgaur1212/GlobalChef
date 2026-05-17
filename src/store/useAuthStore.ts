import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { loginWithEmail, logout, signUpWithEmail, subscribeToAuthState } from "../services/authService";
import type { UserProfile } from "../types/medication";

interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  hasCompletedOnboarding: boolean;
  setHasCompletedOnboarding: (value: boolean) => void;
  hydrateAuth: () => () => void;
  login: (email: string, password: string) => Promise<void>;
  signUp: (displayName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: true,
      hasCompletedOnboarding: false,
      setHasCompletedOnboarding: (value) => set({ hasCompletedOnboarding: value }),
      hydrateAuth: () => {
        set({ isLoading: true });
        return subscribeToAuthState((user) => set({ user, isLoading: false }));
      },
      login: async (email, password) => {
        set({ isLoading: true });
        const user = await loginWithEmail(email, password);
        set({ user, isLoading: false, hasCompletedOnboarding: true });
      },
      signUp: async (displayName, email, password) => {
        set({ isLoading: true });
        const user = await signUpWithEmail(displayName, email, password);
        set({ user, isLoading: false, hasCompletedOnboarding: true });
      },
      logout: async () => {
        await logout();
        set({ user: null, isLoading: false });
      }
    }),
    {
      name: "caredose-auth",
      partialize: (state) => ({ hasCompletedOnboarding: state.hasCompletedOnboarding }),
      storage: createJSONStorage(() => AsyncStorage)
    }
  )
);
