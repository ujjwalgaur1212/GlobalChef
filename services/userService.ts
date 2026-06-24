import { updateProfile } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  where,
  type DocumentData,
  type QueryDocumentSnapshot
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { auth, db, storage } from "@/firebase/config";
import { toSafeDate, toSafeNumber, toSafeString } from "@/services/firestoreConverters";
import type { AuthUser } from "@/types/auth";
import type { UpdateUserProfileInput, UserProfile } from "@/types/user";

type Unsubscribe = () => void;
export type UserProfilePageCursor = QueryDocumentSnapshot<DocumentData> | null;

function buildUsername(displayName: string, fallback: string) {
  const username = displayName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 28);

  return username || fallback.slice(0, 28) || "globalchef";
}

function requireDb() {
  if (!db) {
    throw new Error("Firebase Firestore is not configured. Add Firebase values to .env.");
  }

  return db;
}

function requireStorage() {
  if (!storage) {
    throw new Error("Firebase Storage is not configured. Add Firebase values to .env.");
  }

  return storage;
}

export async function upsertUserProfile(user: AuthUser) {
  const userRef = doc(requireDb(), "users", user.id);
  const existingUser = await getDoc(userRef);

  await setDoc(
    userRef,
    {
      displayName: user.displayName,
      username: buildUsername(user.displayName, user.id),
      email: user.email,
      photoURL: user.photoURL ?? null,
      updatedAt: serverTimestamp(),
      ...(existingUser.exists()
        ? {}
        : {
            createdAt: serverTimestamp(),
            followersCount: 0,
            followingCount: 0,
            recipeCount: 0,
            bio: "",
            country: ""
          })
    },
    { merge: true }
  );
}

function mapUserProfile(userId: string, data: DocumentData): UserProfile {
  return {
    id: userId,
    displayName: toSafeString(data.displayName, "HiChef cook"),
    username: toSafeString(data.username, buildUsername(toSafeString(data.displayName, "HiChef cook"), userId)),
    email: toSafeString(data.email),
    photoURL: typeof data.photoURL === "string" ? data.photoURL : null,
    bio: toSafeString(data.bio),
    country: toSafeString(data.country),
    followersCount: toSafeNumber(data.followersCount),
    followingCount: toSafeNumber(data.followingCount),
    recipeCount: toSafeNumber(data.recipeCount),
    createdAt: toSafeDate(data.createdAt),
    updatedAt: toSafeDate(data.updatedAt)
  };
}

function usersCollection() {
  return collection(requireDb(), "users");
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

export function subscribeToSuggestedChefs(onProfiles: (profiles: UserProfile[]) => void, onError: (error: Error) => void): Unsubscribe {
  return onSnapshot(
    query(usersCollection(), orderBy("createdAt", "desc"), limit(24)),
    (snapshot) => {
      onProfiles(snapshot.docs.map((document) => mapUserProfile(document.id, document.data())));
    },
    onError
  );
}

export function subscribeToTrendingChefs(onProfiles: (profiles: UserProfile[]) => void, onError: (error: Error) => void): Unsubscribe {
  return onSnapshot(
    query(usersCollection(), orderBy("followersCount", "desc"), limit(24)),
    (snapshot) => {
      onProfiles(snapshot.docs.map((document) => mapUserProfile(document.id, document.data())));
    },
    onError
  );
}

export async function getChefDiscoveryPage(pageSize = 24, cursor: UserProfilePageCursor = null) {
  const constraints = cursor ? [orderBy("followersCount", "desc"), startAfter(cursor), limit(pageSize)] : [orderBy("followersCount", "desc"), limit(pageSize)];
  const snapshot = await getDocs(query(usersCollection(), ...constraints));

  return {
    chefs: snapshot.docs.map((document) => mapUserProfile(document.id, document.data())),
    cursor: snapshot.docs[snapshot.docs.length - 1] ?? null
  };
}

function uriToBlob(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.onload = () => {
      resolve(xhr.response as Blob);
    };
    xhr.onerror = () => {
      reject(new Error("Could not read the selected profile photo."));
    };
    xhr.responseType = "blob";
    xhr.open("GET", uri, true);
    xhr.send(null);
  });
}

async function uploadProfilePhoto(userId: string, photoUri: string) {
  const blob = await uriToBlob(photoUri);
  const photoRef = ref(requireStorage(), `users/${userId}/profile.jpg`);

  await uploadBytes(photoRef, blob, {
    contentType: blob.type || "image/jpeg"
  });

  return getDownloadURL(photoRef);
}

export async function updateChefProfile(input: UpdateUserProfileInput) {
  const userId = toSafeString(input.userId);
  const displayName = toSafeString(input.displayName).trim();
  const rawUsername = toSafeString(input.username).trim().toLowerCase();
  // Filter username to alphanumeric and underscores only
  const username = rawUsername.replace(/[^a-z0-9_]+/g, "");
  const bio = toSafeString(input.bio).trim();
  const country = toSafeString(input.country).trim();

  if (!userId) {
    throw new Error("Sign in before editing your profile.");
  }

  if (!displayName) {
    throw new Error("Display name is required.");
  }

  if (!username) {
    throw new Error("Username is required.");
  }

  if (username.length < 3) {
    throw new Error("Username must be at least 3 characters.");
  }

  // Check if username is already taken by another user
  const usersRef = collection(requireDb(), "users");
  const q = query(usersRef, where("username", "==", username));
  const querySnapshot = await getDocs(q);
  let isTaken = false;
  querySnapshot.forEach((docSnap) => {
    if (docSnap.id !== userId) {
      isTaken = true;
    }
  });

  if (isTaken) {
    throw new Error("This username is already taken.");
  }

  const photoURL = input.photoUri ? await uploadProfilePhoto(userId, input.photoUri) : undefined;

  await setDoc(
    doc(requireDb(), "users", userId),
    {
      displayName,
      username,
      bio,
      country,
      ...(photoURL ? { photoURL } : {}),
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

  if (auth?.currentUser?.uid === userId) {
    await updateProfile(auth.currentUser, {
      displayName,
      ...(photoURL ? { photoURL } : {})
    });
  }

  return photoURL ?? null;
}
