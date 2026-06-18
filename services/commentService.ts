import {
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  type DocumentData,
  type QueryDocumentSnapshot
} from "firebase/firestore";

import { auth, db } from "@/firebase/config";
import { toSafeDate, toSafeNumber, toSafeString } from "@/services/firestoreConverters";
import { createCommentNotification } from "@/services/notificationService";
import { mapRecipeData } from "@/services/recipeService";
import type { AuthUser } from "@/types/auth";
import type { RecipeComment } from "@/types/comment";

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

function recipeRef(recipeId: string) {
  return doc(requireDb(), "recipes", recipeId);
}

function commentsCollection(recipeId: string) {
  return collection(requireDb(), "recipes", recipeId, "comments");
}

function commentRef(recipeId: string, commentId: string) {
  return doc(requireDb(), "recipes", recipeId, "comments", commentId);
}

function commentLikeRef(recipeId: string, commentId: string, userId: string) {
  return doc(requireDb(), "recipes", recipeId, "comments", commentId, "likes", userId);
}

function mapCommentDocument(document: QueryDocumentSnapshot<DocumentData>): RecipeComment {
  const data = document.data();

  return {
    id: document.id,
    commentId: toSafeString(data.commentId, document.id),
    recipeId: toSafeString(data.recipeId),
    userId: toSafeString(data.userId),
    userName: toSafeString(data.userName, "GlobalChef cook"),
    userAvatar: typeof data.userAvatar === "string" ? data.userAvatar : null,
    text: toSafeString(data.text),
    createdAt: toSafeDate(data.createdAt),
    likesCount: toSafeNumber(data.likesCount)
  };
}

export function subscribeToRecipeComments(
  recipeId: string,
  onComments: (comments: RecipeComment[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const commentsQuery = query(commentsCollection(recipeId), orderBy("createdAt", "desc"));

  return onSnapshot(
    commentsQuery,
    (snapshot) => {
      onComments(snapshot.docs.map(mapCommentDocument));
    },
    (error) => {
      onError(error);
    }
  );
}

export function subscribeToUserLikedComments(
  recipeId: string,
  userId: string,
  commentIds: string[],
  onLikedCommentIds: (commentIds: Set<string>) => void
): Unsubscribe {
  if (commentIds.length === 0) {
    onLikedCommentIds(new Set());
    return () => undefined;
  }

  const likedCommentIds = new Set<string>();
  const unsubscribes = commentIds.map((commentId) =>
    onSnapshot(commentLikeRef(recipeId, commentId, userId), (snapshot) => {
      if (snapshot.exists()) {
        likedCommentIds.add(commentId);
      } else {
        likedCommentIds.delete(commentId);
      }

      onLikedCommentIds(new Set(likedCommentIds));
    })
  );

  return () => {
    unsubscribes.forEach((unsubscribe) => unsubscribe());
  };
}

export async function addRecipeComment(recipeId: string, text: string, user: AuthUser) {
  const trimmedText = text.trim();

  if (!trimmedText) {
    throw new Error("Comment cannot be empty.");
  }

  assertCurrentUser(user.id);

  const nextCommentRef = doc(commentsCollection(recipeId));
  const nextRecipeRef = recipeRef(recipeId);

  const firestore = requireDb();

  await runTransaction(firestore, async (transaction) => {
    const recipeSnapshot = await transaction.get(nextRecipeRef);

    if (!recipeSnapshot.exists()) {
      throw new Error("Recipe not found.");
    }

    const recipeData = mapRecipeData(recipeSnapshot.id, recipeSnapshot.data());

    transaction.set(nextCommentRef, {
      commentId: nextCommentRef.id,
      recipeId,
      userId: user.id,
      userName: user.displayName || "GlobalChef cook",
      userAvatar: user.photoURL ?? null,
      text: trimmedText,
      createdAt: serverTimestamp(),
      likesCount: 0
    });
    transaction.update(nextRecipeRef, {
      commentsCount: increment(1)
    });
    createCommentNotification(
      user.id,
      user.displayName || "GlobalChef cook",
      user.photoURL ?? null,
      recipeData.authorId || recipeData.createdBy,
      recipeId,
      trimmedText.slice(0, 160),
      transaction
    );
  });

  return nextCommentRef.id;
}

export async function deleteRecipeComment(recipeId: string, commentId: string, userId: string) {
  assertCurrentUser(userId);

  const currentCommentRef = commentRef(recipeId, commentId);
  const currentRecipeRef = recipeRef(recipeId);

  await runTransaction(requireDb(), async (transaction) => {
    const commentSnapshot = await transaction.get(currentCommentRef);

    if (!commentSnapshot.exists()) {
      return;
    }

    const comment = commentSnapshot.data();

    if (comment.userId !== userId) {
      throw new Error("You can only delete your own comments.");
    }

    transaction.delete(currentCommentRef);
    transaction.update(currentRecipeRef, {
      commentsCount: increment(-1)
    });
  });
}

export async function likeRecipeComment(recipeId: string, commentId: string, userId: string) {
  assertCurrentUser(userId);

  const currentLikeRef = commentLikeRef(recipeId, commentId, userId);
  const currentCommentRef = commentRef(recipeId, commentId);

  return runTransaction(requireDb(), async (transaction) => {
    const likeSnapshot = await transaction.get(currentLikeRef);

    if (likeSnapshot.exists()) {
      return false;
    }

    transaction.set(currentLikeRef, {
      commentId,
      recipeId,
      userId,
      createdAt: serverTimestamp()
    });
    transaction.update(currentCommentRef, {
      likesCount: increment(1)
    });

    return true;
  });
}
