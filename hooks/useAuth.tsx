import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

import {
  createAccount,
  sendResetEmail,
  signInWithEmail,
  signOutOfAccount,
  subscribeToAuthState
} from "@/services/authService";
import { upsertUserProfile } from "@/services/userService";
import type { AuthUser, ForgotPasswordFormValues, LoginFormValues, SignupFormValues } from "@/types/auth";

type AuthContextValue = {
  user: AuthUser | null;
  initializing: boolean;
  signIn: (values: LoginFormValues) => Promise<AuthUser>;
  signUp: (values: SignupFormValues) => Promise<AuthUser>;
  sendPasswordReset: (values: ForgotPasswordFormValues) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuthState((nextUser) => {
      setUser(nextUser);
      setInitializing(false);

      if (nextUser) {
        upsertUserProfile(nextUser).catch(() => undefined);
      }
    });

    return unsubscribe;
  }, []);

  const signIn = useCallback((values: LoginFormValues) => signInWithEmail(values), []);
  const signUp = useCallback((values: SignupFormValues) => createAccount(values), []);
  const sendPasswordReset = useCallback((values: ForgotPasswordFormValues) => sendResetEmail(values), []);
  const signOut = useCallback(() => signOutOfAccount(), []);

  const value = useMemo(
    () => ({
      user,
      initializing,
      signIn,
      signUp,
      sendPasswordReset,
      signOut
    }),
    [initializing, sendPasswordReset, signIn, signOut, signUp, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
