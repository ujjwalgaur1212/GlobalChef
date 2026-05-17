import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User
} from "firebase/auth";

import { auth } from "@/firebase/config";
import { toSafeString } from "@/services/firestoreConverters";
import { upsertUserProfile } from "@/services/userService";
import type { AuthUser, ForgotPasswordFormValues, LoginFormValues, SignupFormValues } from "@/types/auth";

type CodedError = Error & { code?: string };

function mapFirebaseUser(user: User): AuthUser {
  return {
    id: toSafeString(user.uid),
    email: toSafeString(user.email),
    displayName: toSafeString(user.displayName, "GlobalChef cook"),
    photoURL: typeof user.photoURL === "string" ? user.photoURL : null
  };
}

function requireAuth() {
  if (!auth) {
    const error = new Error("Firebase is not configured. Add your Expo public Firebase values to .env.") as CodedError;
    error.code = "globalchef/firebase-not-configured";
    throw error;
  }

  return auth;
}

export function subscribeToAuthState(callback: (user: AuthUser | null) => void) {
  if (!auth) {
    callback(null);
    return () => undefined;
  }

  return onAuthStateChanged(auth, (user) => {
    callback(user ? mapFirebaseUser(user) : null);
  });
}

export async function signInWithEmail(values: LoginFormValues) {
  const credential = await signInWithEmailAndPassword(requireAuth(), values.email.trim(), values.password);
  const user = mapFirebaseUser(credential.user);

  await upsertUserProfile(user).catch(() => undefined);

  return user;
}

export async function createAccount(values: SignupFormValues) {
  const credential = await createUserWithEmailAndPassword(requireAuth(), values.email.trim(), values.password);
  const displayName = values.displayName.trim();

  await updateProfile(credential.user, { displayName });

  const user = {
    ...mapFirebaseUser(credential.user),
    displayName
  };

  await upsertUserProfile(user).catch(() => undefined);

  return user;
}

export async function sendResetEmail(values: ForgotPasswordFormValues) {
  await sendPasswordResetEmail(requireAuth(), values.email.trim());
}

export async function signOutOfAccount() {
  await signOut(requireAuth());
}

export function getAuthErrorMessage(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String((error as CodedError).code) : "";

  switch (code) {
    case "auth/email-already-in-use":
      return "That email is already connected to an account. Try logging in instead.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "The email or password is incorrect.";
    case "auth/network-request-failed":
      return "Network request failed. Check your connection and try again.";
    case "auth/too-many-requests":
      return "Too many attempts. Give it a moment, then try again.";
    case "auth/weak-password":
      return "Use a stronger password with at least 8 characters.";
    case "globalchef/firebase-not-configured":
      return "Firebase is not configured yet. Add your values to .env from .env.example.";
    default:
      return "Something went wrong. Please try again.";
  }
}
