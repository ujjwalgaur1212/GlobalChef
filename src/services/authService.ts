import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User
} from "firebase/auth";

import { auth } from "../config/firebase";
import type { UserProfile } from "../types/medication";

function toProfile(user: User, fallbackName?: string): UserProfile {
  return {
    id: user.uid,
    displayName: user.displayName || fallbackName || "CareDose User",
    email: user.email || "",
    role: "patient",
    locale: "en-US",
    caregiverIds: []
  };
}

export async function loginWithEmail(email: string, password: string) {
  if (!auth) {
    return {
      id: "demo-patient",
      displayName: "Maya Sharma",
      email,
      role: "patient",
      locale: "en-US",
      caregiverIds: ["demo-caregiver"]
    } satisfies UserProfile;
  }

  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return toProfile(credential.user);
}

export async function signUpWithEmail(displayName: string, email: string, password: string) {
  if (!auth) {
    return {
      id: "demo-patient",
      displayName,
      email,
      role: "patient",
      locale: "en-US",
      caregiverIds: []
    } satisfies UserProfile;
  }

  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(credential.user, { displayName });
  return toProfile(credential.user, displayName);
}

export function subscribeToAuthState(callback: (profile: UserProfile | null) => void) {
  if (!auth) {
    callback(null);
    return () => undefined;
  }

  return onAuthStateChanged(auth, (user) => {
    callback(user ? toProfile(user) : null);
  });
}

export async function logout() {
  if (auth) {
    await signOut(auth);
  }
}
