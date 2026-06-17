import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  type DocumentData,
  type QueryDocumentSnapshot
} from "firebase/firestore";

import { auth, db } from "@/firebase/config";
import { toSafeDate, toSafeNumber, toSafeString } from "@/services/firestoreConverters";
import type { RecipeRating } from "@/types/rating";

function requireDb() {
  if (!db) {
    throw new Error("Firebase Firestore is not configured. Add Firebase values to .env.");
  }

  return db;
}

function requireCurrentUserId() {
  const currentUserId = auth?.currentUser?.uid;

  if (!currentUserId) {
    throw new Error("Sign in before rating recipes.");
  }

  return currentUserId;
}

function ratingDocumentId(userId: string, recipeId: string) {
  return `${userId}_${recipeId}`;
}

function normalizeRating(rating: number) {
  const nextRating = Math.round(Number(rating));

  if (!Number.isFinite(nextRating) || nextRating < 1 || nextRating > 5) {
    throw new Error("Choose a rating from 1 to 5 stars.");
  }

  return nextRating;
}

function roundAverage(value: number) {
  return Math.round(value * 100) / 100;
}

function mapRatingDocument(document: QueryDocumentSnapshot<DocumentData> | { id: string; data: () => DocumentData }): RecipeRating {
  const data = document.data();

  return {
    id: toSafeString(data.id, document.id),
    recipeId: toSafeString(data.recipeId),
    userId: toSafeString(data.userId),
    rating: toSafeNumber(data.rating),
    createdAt: toSafeDate(data.createdAt)
  };
}

export async function rateRecipe(recipeId: string, rating: number) {
  const userId = requireCurrentUserId();
  const nextRating = normalizeRating(rating);
  const firestore = requireDb();
  const recipeRef = doc(firestore, "recipes", recipeId);
  const ratingRef = doc(firestore, "recipeRatings", ratingDocumentId(userId, recipeId));

  return runTransaction(firestore, async (transaction) => {
    const [recipeSnapshot, ratingSnapshot] = await Promise.all([transaction.get(recipeRef), transaction.get(ratingRef)]);

    if (!recipeSnapshot.exists()) {
      throw new Error("Recipe not found.");
    }

    const recipeData = recipeSnapshot.data();
    const currentAverage = toSafeNumber(recipeData.averageRating);
    const currentCount = toSafeNumber(recipeData.ratingsCount);
    const currentTotal = currentAverage * currentCount;
    const previousRating = ratingSnapshot.exists() ? normalizeRating(toSafeNumber(ratingSnapshot.data().rating)) : null;
    const hasAggregateForExistingRating = previousRating !== null && currentCount > 0;
    const nextCount = hasAggregateForExistingRating ? currentCount : currentCount + 1;
    const nextTotal = hasAggregateForExistingRating ? currentTotal - previousRating + nextRating : currentTotal + nextRating;
    const nextAverage = nextCount > 0 ? roundAverage(nextTotal / nextCount) : 0;

    if (previousRating) {
      transaction.update(ratingRef, {
        rating: nextRating
      });
    } else {
      transaction.set(ratingRef, {
        id: ratingRef.id,
        recipeId,
        userId,
        rating: nextRating,
        createdAt: serverTimestamp()
      });
    }

    transaction.update(recipeRef, {
      averageRating: nextAverage,
      ratingsCount: nextCount
    });

    return nextRating;
  });
}

export async function getUserRating(recipeId: string) {
  const userId = requireCurrentUserId();
  const snapshot = await getDoc(doc(requireDb(), "recipeRatings", ratingDocumentId(userId, recipeId)));

  if (!snapshot.exists()) {
    return null;
  }

  return mapRatingDocument(snapshot);
}

export async function removeRating(recipeId: string) {
  const userId = requireCurrentUserId();
  const firestore = requireDb();
  const recipeRef = doc(firestore, "recipes", recipeId);
  const ratingRef = doc(firestore, "recipeRatings", ratingDocumentId(userId, recipeId));

  return runTransaction(firestore, async (transaction) => {
    const [recipeSnapshot, ratingSnapshot] = await Promise.all([transaction.get(recipeRef), transaction.get(ratingRef)]);

    if (!ratingSnapshot.exists()) {
      return false;
    }

    if (!recipeSnapshot.exists()) {
      throw new Error("Recipe not found.");
    }

    const recipeData = recipeSnapshot.data();
    const currentAverage = toSafeNumber(recipeData.averageRating);
    const currentCount = toSafeNumber(recipeData.ratingsCount);
    const currentRating = normalizeRating(toSafeNumber(ratingSnapshot.data().rating));
    const nextCount = Math.max(0, currentCount - 1);
    const nextTotal = Math.max(0, currentAverage * currentCount - currentRating);
    const nextAverage = nextCount > 0 ? roundAverage(nextTotal / nextCount) : 0;

    transaction.delete(ratingRef);
    transaction.update(recipeRef, {
      averageRating: nextAverage,
      ratingsCount: nextCount
    });

    return true;
  });
}

export function getRatingErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Could not update recipe rating.";
}
