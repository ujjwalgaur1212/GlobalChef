import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  runTransaction,
  serverTimestamp,
  where,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot
} from "firebase/firestore";

import { auth, db } from "@/firebase/config";
import { toSafeDate, toSafeNumber, toSafeString } from "@/services/firestoreConverters";
import { getRecipe } from "@/services/recipeService";
import type { CollectionRecipe, CreateCollectionInput, RecipeCollection, UpdateCollectionInput } from "@/types/collection";
import type { Recipe } from "@/types/recipe";

function requireDb() {
  if (!db) {
    throw new Error("Firebase Firestore is not configured. Add Firebase values to .env.");
  }

  return db;
}

function assertCurrentUser(ownerId: string) {
  const currentUserId = auth?.currentUser?.uid;

  if (currentUserId && currentUserId !== ownerId) {
    throw new Error("Signed-in user changed. Please try again.");
  }
}

function collectionRecipeDocumentId(collectionId: string, recipeId: string) {
  return `${collectionId}_${recipeId}`;
}

function collectionsCollection() {
  return collection(requireDb(), "collections");
}

function mapCollectionDocument(document: QueryDocumentSnapshot<DocumentData> | { id: string; data: () => DocumentData }): RecipeCollection {
  const data = document.data();

  return {
    id: toSafeString(data.id, document.id),
    ownerId: toSafeString(data.ownerId),
    name: toSafeString(data.name),
    description: toSafeString(data.description),
    createdAt: toSafeDate(data.createdAt),
    recipeCount: toSafeNumber(data.recipeCount)
  };
}

function mapCollectionRecipeDocument(document: QueryDocumentSnapshot<DocumentData> | { id: string; data: () => DocumentData }): CollectionRecipe {
  const data = document.data();
  const recipeId = toSafeString(data.recipeId);

  return {
    id: document.id,
    collectionId: toSafeString(data.collectionId),
    recipeId,
    addedAt: toSafeDate(data.addedAt)
  };
}

function validateCollectionName(name: string) {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("Collection name is required.");
  }

  return trimmedName;
}

async function withCoverImages(collections: RecipeCollection[]) {
  const collectionsWithCovers = await Promise.all(
    collections.map(async (recipeCollection) => {
      const recipes = await getCollectionRecipes(recipeCollection.id);
      const coverImageUrl = recipes.find((recipe) => recipe.imageUrl)?.imageUrl;

      return coverImageUrl ? { ...recipeCollection, coverImageUrl } : recipeCollection;
    })
  );

  return collectionsWithCovers;
}

export async function createCollection(input: CreateCollectionInput) {
  const ownerId = toSafeString(input.ownerId);
  assertCurrentUser(ownerId);

  const collectionRef = doc(collectionsCollection());

  await writeBatch(requireDb())
    .set(collectionRef, {
      id: collectionRef.id,
      ownerId,
      name: validateCollectionName(toSafeString(input.name)),
      description: toSafeString(input.description).trim(),
      createdAt: serverTimestamp(),
      recipeCount: 0
    })
    .commit();

  return collectionRef.id;
}

export async function updateCollection(input: UpdateCollectionInput) {
  const ownerId = toSafeString(input.ownerId);
  assertCurrentUser(ownerId);

  const collectionRef = doc(requireDb(), "collections", input.collectionId);
  const snapshot = await getDoc(collectionRef);

  if (!snapshot.exists()) {
    throw new Error("Collection not found.");
  }

  const currentCollection = mapCollectionDocument(snapshot);
  if (currentCollection.ownerId !== ownerId) {
    throw new Error("You can only edit your own collections.");
  }

  await writeBatch(requireDb())
    .update(collectionRef, {
      name: validateCollectionName(toSafeString(input.name)),
      description: toSafeString(input.description).trim()
    })
    .commit();
}

export async function deleteCollection(collectionId: string, ownerId: string) {
  assertCurrentUser(ownerId);

  const firestore = requireDb();
  const collectionRef = doc(firestore, "collections", collectionId);
  const snapshot = await getDoc(collectionRef);

  if (!snapshot.exists()) {
    return;
  }

  const recipeCollection = mapCollectionDocument(snapshot);
  if (recipeCollection.ownerId !== ownerId) {
    throw new Error("You can only delete your own collections.");
  }

  const recipesSnapshot = await getDocs(query(collection(firestore, "collectionRecipes"), where("collectionId", "==", collectionId)));
  const batch = writeBatch(firestore);

  recipesSnapshot.docs.forEach((recipeDocument) => {
    batch.delete(recipeDocument.ref);
  });
  batch.delete(collectionRef);

  await batch.commit();
}

export async function getUserCollections(ownerId: string) {
  const snapshot = await getDocs(query(collectionsCollection(), where("ownerId", "==", ownerId)));
  const userCollections = snapshot.docs
    .map(mapCollectionDocument)
    .sort((left, right) => (right.createdAt?.getTime() ?? 0) - (left.createdAt?.getTime() ?? 0));

  return withCoverImages(userCollections);
}

export async function getCollectionById(collectionId: string) {
  const snapshot = await getDoc(doc(requireDb(), "collections", collectionId));

  if (!snapshot.exists()) {
    return null;
  }

  const recipeCollection = mapCollectionDocument(snapshot);
  const recipes = await getCollectionRecipes(collectionId);
  const coverImageUrl = recipes.find((recipe) => recipe.imageUrl)?.imageUrl;

  return coverImageUrl ? { ...recipeCollection, coverImageUrl } : recipeCollection;
}

export async function addRecipeToCollection(collectionId: string, recipeId: string, ownerId: string) {
  assertCurrentUser(ownerId);

  const firestore = requireDb();
  const collectionRef = doc(firestore, "collections", collectionId);
  const recipeRef = doc(firestore, "recipes", recipeId);
  const collectionRecipeRef = doc(firestore, "collectionRecipes", collectionRecipeDocumentId(collectionId, recipeId));

  return runTransaction(firestore, async (transaction) => {
    const [collectionSnapshot, recipeSnapshot, collectionRecipeSnapshot] = await Promise.all([
      transaction.get(collectionRef),
      transaction.get(recipeRef),
      transaction.get(collectionRecipeRef)
    ]);

    if (!collectionSnapshot.exists()) {
      throw new Error("Collection not found.");
    }

    const recipeCollection = mapCollectionDocument(collectionSnapshot);
    if (recipeCollection.ownerId !== ownerId) {
      throw new Error("You can only update your own collections.");
    }

    if (!recipeSnapshot.exists()) {
      throw new Error("Recipe not found.");
    }

    if (collectionRecipeSnapshot.exists()) {
      return false;
    }

    transaction.set(collectionRecipeRef, {
      collectionId,
      recipeId,
      addedAt: serverTimestamp()
    });
    transaction.update(collectionRef, {
      recipeCount: increment(1)
    });

    return true;
  });
}

export async function removeRecipeFromCollection(collectionId: string, recipeId: string, ownerId: string) {
  assertCurrentUser(ownerId);

  const firestore = requireDb();
  const collectionRef = doc(firestore, "collections", collectionId);
  const collectionRecipeRef = doc(firestore, "collectionRecipes", collectionRecipeDocumentId(collectionId, recipeId));

  return runTransaction(firestore, async (transaction) => {
    const [collectionSnapshot, collectionRecipeSnapshot] = await Promise.all([
      transaction.get(collectionRef),
      transaction.get(collectionRecipeRef)
    ]);

    if (!collectionSnapshot.exists()) {
      throw new Error("Collection not found.");
    }

    const recipeCollection = mapCollectionDocument(collectionSnapshot);
    if (recipeCollection.ownerId !== ownerId) {
      throw new Error("You can only update your own collections.");
    }

    if (!collectionRecipeSnapshot.exists()) {
      return false;
    }

    transaction.delete(collectionRecipeRef);
    transaction.update(collectionRef, {
      recipeCount: increment(-1)
    });

    return true;
  });
}

export async function getCollectionRecipes(collectionId: string) {
  const snapshot = await getDocs(query(collection(requireDb(), "collectionRecipes"), where("collectionId", "==", collectionId)));
  const collectionRecipes = snapshot.docs
    .map(mapCollectionRecipeDocument)
    .sort((left, right) => (right.addedAt?.getTime() ?? 0) - (left.addedAt?.getTime() ?? 0));
  const recipes = await Promise.all(
    collectionRecipes.map(async (collectionRecipe) => {
      return getRecipe(collectionRecipe.recipeId);
    })
  );

  return recipes.filter((recipe): recipe is Recipe => recipe !== null);
}

export async function getRecipeCollectionIds(recipeId: string, userCollections: RecipeCollection[]) {
  const firestore = requireDb();
  const snapshots = await Promise.all(
    userCollections.map((recipeCollection) => getDoc(doc(firestore, "collectionRecipes", collectionRecipeDocumentId(recipeCollection.id, recipeId))))
  );

  return new Set(
    snapshots
      .filter((snapshot) => snapshot.exists())
      .map((snapshot) => mapCollectionRecipeDocument(snapshot).collectionId)
  );
}

export function getCollectionErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong while updating collections.";
}
