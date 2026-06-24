import {
  collection,
  doc,
  increment,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type DocumentData,
  type QueryDocumentSnapshot
} from "firebase/firestore";

import { auth, db } from "@/firebase/config";
import { toSafeDate, toSafeNumber, toSafeString } from "@/services/firestoreConverters";
import { createLikeNotification } from "@/services/notificationService";
import { mapRecipeData } from "@/services/recipeService";
import type { RecipeInteraction } from "@/types/recipeInteraction";

function requireDb() {
  if (!db) {
    throw new Error("Firebase Firestore is not configured. Add Firebase values to .env.");
  }
  return db;
}

function likeDocumentId(recipeId: string, userId: string) {
  return `${recipeId}_${userId}`;
}

function assertCurrentUser(userId: string) {
  const currentUserId = auth?.currentUser?.uid;
  if (currentUserId && currentUserId !== userId) {
    throw new Error("Signed-in user changed. Please try again.");
  }
}

function mapLikeDocument(document: QueryDocumentSnapshot<DocumentData>): RecipeInteraction {
  const data = document.data();
  return {
    id: document.id,
    recipeId: toSafeString(data.recipeId),
    userId: toSafeString(data.userId),
    createdAt: toSafeDate(data.createdAt),
    recipe: null
  };
}

export const LikeService = {
  async likeRecipe(recipeId: string, userId: string): Promise<boolean> {
    assertCurrentUser(userId);

    const firestore = requireDb();
    const likeRef = doc(firestore, "recipeLikes", likeDocumentId(recipeId, userId));
    const recipeRef = doc(firestore, "recipes", recipeId);

    return runTransaction(firestore, async (transaction) => {
      const likeSnapshot = await transaction.get(likeRef);
      const recipeSnapshot = await transaction.get(recipeRef);

      if (likeSnapshot.exists()) {
        return false;
      }

      if (!recipeSnapshot.exists()) {
        throw new Error("Recipe not found.");
      }

      const recipeData = mapRecipeData(recipeSnapshot.id, recipeSnapshot.data());

      transaction.set(likeRef, {
        recipeId,
        userId,
        createdAt: serverTimestamp()
      });
      transaction.update(recipeRef, {
        likes: increment(1),
        likesCount: increment(1)
      });

      // Send real-time notification to the recipe owner/author
      const recipientId = recipeData.authorId || recipeData.createdBy;
      if (recipientId && recipientId !== userId) {
        createLikeNotification(
          userId,
          auth?.currentUser?.displayName || "HiChef cook",
          auth?.currentUser?.photoURL ?? null,
          recipientId,
          recipeId,
          transaction
        );
      }

      return true;
    });
  },

  async unlikeRecipe(recipeId: string, userId: string): Promise<boolean> {
    assertCurrentUser(userId);

    const firestore = requireDb();
    const likeRef = doc(firestore, "recipeLikes", likeDocumentId(recipeId, userId));
    const recipeRef = doc(firestore, "recipes", recipeId);

    return runTransaction(firestore, async (transaction) => {
      const likeSnapshot = await transaction.get(likeRef);
      const recipeSnapshot = await transaction.get(recipeRef);

      if (!likeSnapshot.exists()) {
        return false;
      }

      if (!recipeSnapshot.exists()) {
        throw new Error("Recipe not found.");
      }

      const recipeData = recipeSnapshot.data();
      const nextLikes = Math.max(0, toSafeNumber(recipeData.likes) - 1);
      const nextLikesCount = Math.max(0, toSafeNumber(recipeData.likesCount ?? recipeData.likes) - 1);
      const recipeUpdates: Partial<Record<"likes" | "likesCount", number>> = {};

      if (nextLikes !== toSafeNumber(recipeData.likes)) {
        recipeUpdates.likes = nextLikes;
      }

      if (nextLikesCount !== toSafeNumber(recipeData.likesCount ?? recipeData.likes)) {
        recipeUpdates.likesCount = nextLikesCount;
      }

      transaction.delete(likeRef);

      if (Object.keys(recipeUpdates).length > 0) {
        transaction.update(recipeRef, recipeUpdates);
      }

      return true;
    });
  },

  subscribeToUserLikes(
    userId: string,
    onLikes: (likes: RecipeInteraction[]) => void,
    onError: (error: Error) => void
  ): () => void {
    const firestore = requireDb();
    const likesQuery = query(collection(firestore, "recipeLikes"), where("userId", "==", userId));

    return onSnapshot(
      likesQuery,
      (snapshot) => {
        const likes = snapshot.docs.map(mapLikeDocument);
        onLikes(likes);
      },
      (error) => {
        onError(error);
      }
    );
  }
};
