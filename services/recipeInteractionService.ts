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
import { createNotificationInTransaction } from "@/services/notificationService";
import { getRecipe, mapRecipeData } from "@/services/recipeService";
import type { RecipeInteraction } from "@/types/recipeInteraction";
import type { Recipe } from "@/types/recipe";

type InteractionCollection = "recipeLikes" | "savedRecipes";
type Unsubscribe = () => void;

function requireDb() {
  if (!db) {
    throw new Error("Firebase Firestore is not configured. Add Firebase values to .env.");
  }

  return db;
}

function interactionDocumentId(userId: string, recipeId: string) {
  return `${userId}_${recipeId}`;
}

function assertCurrentUser(userId: string) {
  const currentUserId = auth?.currentUser?.uid;

  if (currentUserId && currentUserId !== userId) {
    throw new Error("Signed-in user changed. Please try again.");
  }
}

function mapInteractionDocument(document: QueryDocumentSnapshot<DocumentData>): RecipeInteraction {
  const data = document.data();
  const recipeSnapshot = typeof data.recipe === "object" && data.recipe ? (data.recipe as DocumentData) : null;

  return {
    id: document.id,
    recipeId: toSafeString(data.recipeId),
    userId: toSafeString(data.userId),
    createdAt: toSafeDate(data.createdAt),
    recipe: recipeSnapshot ? mapRecipeData(toSafeString(recipeSnapshot.id ?? data.recipeId), recipeSnapshot) : null
  };
}

function subscribeToUserInteractions(
  collectionName: InteractionCollection,
  userId: string,
  onInteractions: (interactions: RecipeInteraction[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const interactionsQuery = query(collection(requireDb(), collectionName), where("userId", "==", userId));

  return onSnapshot(
    interactionsQuery,
    (snapshot) => {
      const interactions = snapshot.docs.map(mapInteractionDocument);

      onInteractions(interactions);
    },
    (error) => {
      onError(error);
    }
  );
}

export function subscribeToUserRecipeLikes(
  userId: string,
  onInteractions: (interactions: RecipeInteraction[]) => void,
  onError: (error: Error) => void
) {
  return subscribeToUserInteractions("recipeLikes", userId, onInteractions, onError);
}

export function subscribeToUserSavedRecipes(
  userId: string,
  onInteractions: (interactions: RecipeInteraction[]) => void,
  onError: (error: Error) => void
) {
  return subscribeToUserInteractions("savedRecipes", userId, onInteractions, onError);
}

export async function likeRecipeOnce(recipeId: string, userId: string) {
  assertCurrentUser(userId);

  const firestore = requireDb();
  const likeRef = doc(firestore, "recipeLikes", interactionDocumentId(userId, recipeId));
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
    createNotificationInTransaction(transaction, firestore, {
      recipientId: recipeData.authorId || recipeData.createdBy,
      actorId: userId,
      actorName: auth?.currentUser?.displayName || "GlobalChef cook",
      actorPhotoURL: auth?.currentUser?.photoURL ?? null,
      type: "recipeLike",
      recipeId,
      recipeTitle: recipeData.title
    });

    return true;
  });
}

export async function unlikeRecipe(recipeId: string, userId: string) {
  assertCurrentUser(userId);

  const firestore = requireDb();
  const likeRef = doc(firestore, "recipeLikes", interactionDocumentId(userId, recipeId));
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
}

export async function saveRecipe(recipeId: string, userId: string) {
  assertCurrentUser(userId);

  const firestore = requireDb();
  const saveRef = doc(firestore, "savedRecipes", interactionDocumentId(userId, recipeId));
  const recipeRef = doc(firestore, "recipes", recipeId);

  return runTransaction(firestore, async (transaction) => {
    const saveSnapshot = await transaction.get(saveRef);
    const recipeSnapshot = await transaction.get(recipeRef);

    if (saveSnapshot.exists()) {
      return false;
    }

    if (!recipeSnapshot.exists()) {
      throw new Error("Recipe not found.");
    }

    const recipeData = mapRecipeData(recipeSnapshot.id, recipeSnapshot.data());

    transaction.set(saveRef, {
      recipeId,
      userId,
      createdAt: serverTimestamp(),
      recipe: {
        ...recipeData,
        createdAt: recipeSnapshot.data().createdAt ?? null
      }
    });
    transaction.update(recipeRef, {
      savesCount: increment(1)
    });

    return true;
  });
}

export async function removeSavedRecipe(recipeId: string, userId: string) {
  assertCurrentUser(userId);

  const firestore = requireDb();
  const saveRef = doc(firestore, "savedRecipes", interactionDocumentId(userId, recipeId));
  const recipeRef = doc(firestore, "recipes", recipeId);

  await runTransaction(firestore, async (transaction) => {
    const saveSnapshot = await transaction.get(saveRef);

    if (!saveSnapshot.exists()) {
      return;
    }

    transaction.delete(saveRef);
    transaction.update(recipeRef, {
      savesCount: increment(-1)
    });
  });
}

export async function getRecipesForInteractions(interactions: RecipeInteraction[]) {
  const recipes = await Promise.all(
    interactions.map(async (interaction) => {
      if (interaction.recipe) {
        return interaction.recipe;
      }

      return getRecipe(interaction.recipeId);
    })
  );

  return recipes.filter((recipe): recipe is Recipe => recipe !== null);
}

export function getInteractionErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong while updating this recipe.";
}
