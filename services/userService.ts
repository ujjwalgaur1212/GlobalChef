import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, type DocumentData } from "firebase/firestore";

import { db } from "@/firebase/config";
import { toSafeDate, toSafeNumber, toSafeString } from "@/services/firestoreConverters";
import type { AuthUser } from "@/types/auth";
import type { UserProfile } from "@/types/user";

type Unsubscribe = () => void;

function requireDb() {
  if (!db) {
    throw new Error("Firebase Firestore is not configured. Add Firebase values to .env.");
  }

  return db;
}

export async function upsertUserProfile(user: AuthUser) {
  const userRef = doc(requireDb(), "users", user.id);
  const existingUser = await getDoc(userRef);

  await setDoc(
    userRef,
    {
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL ?? null,
      updatedAt: serverTimestamp(),
      ...(existingUser.exists()
        ? {}
        : {
            createdAt: serverTimestamp(),
            followersCount: 0,
            followingCount: 0
          })
    },
    { merge: true }
  );
}

function mapUserProfile(userId: string, data: DocumentData): UserProfile {
  return {
    id: userId,
    displayName: toSafeString(data.displayName, "GlobalChef cook"),
    email: toSafeString(data.email),
    photoURL: typeof data.photoURL === "string" ? data.photoURL : null,
    followersCount: toSafeNumber(data.followersCount),
    followingCount: toSafeNumber(data.followingCount),
    createdAt: toSafeDate(data.createdAt),
    updatedAt: toSafeDate(data.updatedAt)
  };
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(doc(requireDb(), "users", userId));

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();

  return mapUserProfile(snapshot.id, data);
}

export function subscribeToUserProfile(userId: string, onProfile: (profile: UserProfile | null) => void, onError: (error: Error) => void): Unsubscribe {
  return onSnapshot(
    doc(requireDb(), "users", userId),
    (snapshot) => {
      onProfile(snapshot.exists() ? mapUserProfile(snapshot.id, snapshot.data()) : null);
    },
    onError
  );
}
