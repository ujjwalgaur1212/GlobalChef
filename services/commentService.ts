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
import { createCommentNotification, createReplyNotification } from "@/services/notificationService";
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
    userName: toSafeString(data.userName, "HiChef cook"),
    userAvatar: typeof data.userAvatar === "string" ? data.userAvatar : null,
    text: toSafeString(data.text),
    createdAt: toSafeDate(data.createdAt),
    likesCount: toSafeNumber(data.likesCount),
    parentCommentId: typeof data.parentCommentId === "string" ? data.parentCommentId : null,
    replyToUsername: typeof data.replyToUsername === "string" ? data.replyToUsername : null
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

export async function addRecipeComment(
  recipeId: string,
  text: string,
  user: AuthUser,
  parentCommentId?: string | null,
  replyToUsername?: string | null
) {
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
      userName: user.displayName || "HiChef cook",
      userAvatar: user.photoURL ?? null,
      text: trimmedText,
      createdAt: serverTimestamp(),
      likesCount: 0,
      parentCommentId: parentCommentId || null,
      replyToUsername: replyToUsername || null
    });
    transaction.update(nextRecipeRef, {
      commentsCount: increment(1)
    });

    let parentCommentUserId: string | null = null;
    if (parentCommentId) {
      const parentCommentRef = doc(firestore, "recipes", recipeId, "comments", parentCommentId);
      const parentCommentSnapshot = await transaction.get(parentCommentRef);
      if (parentCommentSnapshot.exists()) {
        parentCommentUserId = toSafeString(parentCommentSnapshot.data().userId);
      }
    }

    const recipeAuthorId = recipeData.authorId || recipeData.createdBy;

    if (parentCommentUserId && parentCommentUserId !== user.id) {
      createReplyNotification(
        user.id,
        user.displayName || "HiChef cook",
        user.photoURL ?? null,
        parentCommentUserId,
        recipeId,
        trimmedText.slice(0, 160),
        transaction
      );

      if (recipeAuthorId && recipeAuthorId !== parentCommentUserId && recipeAuthorId !== user.id) {
        createCommentNotification(
          user.id,
          user.displayName || "HiChef cook",
          user.photoURL ?? null,
          recipeAuthorId,
          recipeId,
          trimmedText.slice(0, 160),
          transaction
        );
      }
    } else {
      if (recipeAuthorId && recipeAuthorId !== user.id) {
        createCommentNotification(
          user.id,
          user.displayName || "HiChef cook",
          user.photoURL ?? null,
          recipeAuthorId,
          recipeId,
          trimmedText.slice(0, 160),
          transaction
        );
      }
    }
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
