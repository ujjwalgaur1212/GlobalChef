import {
  doc,
  increment,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  type DocumentData,
  type DocumentSnapshot
} from "firebase/firestore";

import { auth, db } from "@/firebase/config";
import { toSafeDate, toSafeString } from "@/services/firestoreConverters";
import type { FollowRelationship } from "@/types/follow";

type Unsubscribe = () => void;

function requireDb() {
  if (!db) {
    throw new Error("Firebase Firestore is not configured. Add Firebase values to .env.");
  }

  return db;
}

function assertCurrentUser(userId: string) {
  const currentUserId = auth?.currentUser?.uid;

  if (currentUserId && currentUserId !== userId) {
    throw new Error("Signed-in user changed. Please try again.");
  }
}

function followDocumentId(followerId: string, followedId: string) {
  return `${followerId}_${followedId}`;
}

function followerDocumentId(followedId: string, followerId: string) {
  return `${followedId}_${followerId}`;
}

function followingRef(followerId: string, followedId: string) {
  return doc(requireDb(), "following", followDocumentId(followerId, followedId));
}

function followerRef(followedId: string, followerId: string) {
  return doc(requireDb(), "followers", followerDocumentId(followedId, followerId));
}

function mapRelationship(snapshot: DocumentSnapshot<DocumentData>): FollowRelationship | null {
  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();

  return {
    id: snapshot.id,
    followerId: toSafeString(data.followerId),
    followedId: toSafeString(data.followedId),
    createdAt: toSafeDate(data.createdAt)
  };
}

export function subscribeToFollowState(
  followerId: string,
  followedId: string,
  onState: (isFollowing: boolean) => void,
  onError: (error: Error) => void
): Unsubscribe {
  if (followerId === followedId) {
    onState(false);
    return () => undefined;
  }

  return onSnapshot(
    followingRef(followerId, followedId),
    (snapshot) => {
      onState(Boolean(mapRelationship(snapshot)));
    },
    onError
  );
}

export async function followChef(followerId: string, followedId: string) {
  assertCurrentUser(followerId);

  if (followerId === followedId) {
    throw new Error("You cannot follow yourself.");
  }

  const firestore = requireDb();
  const nextFollowingRef = followingRef(followerId, followedId);
  const nextFollowerRef = followerRef(followedId, followerId);
  const followerUserRef = doc(firestore, "users", followerId);
  const followedUserRef = doc(firestore, "users", followedId);

  return runTransaction(firestore, async (transaction) => {
    const existingFollow = await transaction.get(nextFollowingRef);

    if (existingFollow.exists()) {
      return false;
    }

    const relationship = {
      followerId,
      followedId,
      createdAt: serverTimestamp()
    };

    transaction.set(nextFollowingRef, relationship);
    transaction.set(nextFollowerRef, relationship);
    transaction.update(followerUserRef, {
      followingCount: increment(1)
    });
    transaction.update(followedUserRef, {
      followersCount: increment(1)
    });

    return true;
  });
}

export async function unfollowChef(followerId: string, followedId: string) {
  assertCurrentUser(followerId);

  if (followerId === followedId) {
    return false;
  }

  const firestore = requireDb();
  const nextFollowingRef = followingRef(followerId, followedId);
  const nextFollowerRef = followerRef(followedId, followerId);
  const followerUserRef = doc(firestore, "users", followerId);
  const followedUserRef = doc(firestore, "users", followedId);

  return runTransaction(firestore, async (transaction) => {
    const existingFollow = await transaction.get(nextFollowingRef);

    if (!existingFollow.exists()) {
      return false;
    }

    transaction.delete(nextFollowingRef);
    transaction.delete(nextFollowerRef);
    transaction.update(followerUserRef, {
      followingCount: increment(-1)
    });
    transaction.update(followedUserRef, {
      followersCount: increment(-1)
    });

    return true;
  });
}

export function getFollowErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Could not update follow state.";
}
