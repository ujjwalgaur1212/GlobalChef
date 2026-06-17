import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { db, storage } from "@/firebase/config";
import { toSafeDate, toSafeNumber, toSafeString, toSafeStringArray } from "@/services/firestoreConverters";
import type { CreateRecipeInput, UpdateRecipeInput, Recipe, RecipeSearchSort } from "@/types/recipe";

type Unsubscribe = () => void;
export type RecipePageCursor = QueryDocumentSnapshot<DocumentData> | null;

type SeedRecipe = Omit<
  Recipe,
  | "id"
  | "recipeId"
  | "createdAt"
  | "createdBy"
  | "authorId"
  | "authorName"
  | "likesCount"
  | "savesCount"
  | "commentsCount"
  | "averageRating"
  | "ratingsCount"
>;

const seedRecipes: SeedRecipe[] = [
  {
    title: "Kyoto Miso Ramen",
    description: "A silky miso broth with springy noodles, mushrooms, and a soft egg finish.",
    country: "Japan",
    cuisine: "Japanese",
    imageUrl: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1200&q=85",
    ingredients: ["ramen noodles", "miso paste", "soft boiled eggs", "scallions", "shiitake mushrooms"],
    steps: ["Simmer the miso broth.", "Cook noodles until springy.", "Top with eggs, scallions, and mushrooms."],
    tags: ["comfort", "noodles", "umami"],
    likes: 24
  },
  {
    title: "Old Delhi Butter Chicken",
    description: "Charred chicken simmered in a glossy tomato butter sauce with warm spices.",
    country: "India",
    cuisine: "Indian",
    imageUrl: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=1200&q=85",
    ingredients: ["chicken", "tomato puree", "cream", "butter", "garam masala"],
    steps: ["Marinate and sear the chicken.", "Build the tomato butter sauce.", "Simmer together until glossy."],
    tags: ["classic", "spiced", "dinner"],
    likes: 31
  },
  {
    title: "Smoky Oaxaca Tacos",
    description: "Quick corn tortillas loaded with chipotle mushrooms, avocado, lime, and cotija.",
    country: "Mexico",
    cuisine: "Mexican",
    imageUrl: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=1200&q=85",
    ingredients: ["corn tortillas", "chipotle mushrooms", "avocado", "lime", "cotija"],
    steps: ["Char the tortillas.", "Saute the mushrooms with chipotle.", "Assemble with avocado, lime, and cotija."],
    tags: ["tacos", "smoky", "weeknight"],
    likes: 18
  }
];

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

function recipesCollection() {
  return collection(requireDb(), "recipes");
}

function recipesQuery() {
  return query(recipesCollection(), orderBy("createdAt", "desc"));
}

function recipeSearchQuery(sort: RecipeSearchSort) {
  const constraints: QueryConstraint[] =
    sort === "mostLiked"
      ? [orderBy("likesCount", "desc")]
      : sort === "mostCommented"
        ? [orderBy("commentsCount", "desc")]
        : [orderBy("createdAt", "desc")];

  return query(recipesCollection(), ...constraints);
}

export function mapRecipeData(documentId: string, data: DocumentData): Recipe {
  return {
    id: toSafeString(documentId),
    recipeId: toSafeString(data.recipeId, documentId),
    title: toSafeString(data.title),
    description: toSafeString(data.description),
    country: toSafeString(data.country),
    cuisine: toSafeString(data.cuisine),
    ingredients: toSafeStringArray(data.ingredients),
    steps: toSafeStringArray(data.steps),
    tags: toSafeStringArray(data.tags),
    imageUrl: toSafeString(data.imageUrl),
    authorId: toSafeString(data.authorId ?? data.createdBy),
    authorName: toSafeString(data.authorName, "GlobalChef cook"),
    createdBy: toSafeString(data.createdBy ?? data.authorId),
    createdAt: toSafeDate(data.createdAt),
    likes: toSafeNumber(data.likesCount ?? data.likes),
    likesCount: toSafeNumber(data.likesCount ?? data.likes),
    savesCount: toSafeNumber(data.savesCount),
    commentsCount: toSafeNumber(data.commentsCount),
    averageRating: toSafeNumber(data.averageRating),
    ratingsCount: toSafeNumber(data.ratingsCount)
  };
}

function mapRecipeDocument(document: QueryDocumentSnapshot<DocumentData> | { id: string; data: () => DocumentData }): Recipe {
  return mapRecipeData(document.id, document.data());
}

export async function getRecipe(recipeId: string) {
  const snapshot = await getDoc(doc(requireDb(), "recipes", recipeId));

  if (!snapshot.exists()) {
    return null;
  }

  return mapRecipeDocument(snapshot);
}

export async function getRecipes() {
  const snapshot = await getDocs(recipesQuery());
  return snapshot.docs.map(mapRecipeDocument);
}

export function subscribeToRecipe(recipeId: string, onRecipe: (recipe: Recipe | null) => void, onError: (error: Error) => void): Unsubscribe {
  return onSnapshot(
    doc(requireDb(), "recipes", recipeId),
    (snapshot) => {
      onRecipe(snapshot.exists() ? mapRecipeDocument(snapshot) : null);
    },
    (error) => {
      onError(error);
    }
  );
}

export function subscribeToRecipes(onRecipes: (recipes: Recipe[]) => void, onError: (error: Error) => void): Unsubscribe {
  return onSnapshot(
    recipesQuery(),
    (snapshot) => {
      onRecipes(snapshot.docs.map(mapRecipeDocument));
    },
    (error) => {
      onError(error);
    }
  );
}

export function subscribeToRecipeSearch(
  sort: RecipeSearchSort,
  onRecipes: (recipes: Recipe[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    recipeSearchQuery(sort),
    (snapshot) => {
      onRecipes(snapshot.docs.map(mapRecipeDocument));
    },
    (error) => {
      onError(error);
    }
  );
}

export async function getRecipeDiscoveryPage(sort: RecipeSearchSort = "newest", pageSize = 24, cursor: RecipePageCursor = null) {
  const constraints: QueryConstraint[] =
    sort === "mostLiked"
      ? [orderBy("likesCount", "desc")]
      : sort === "mostCommented"
        ? [orderBy("commentsCount", "desc")]
        : [orderBy("createdAt", "desc")];

  if (cursor) {
    constraints.push(startAfter(cursor));
  }

  constraints.push(limit(pageSize));

  const snapshot = await getDocs(query(recipesCollection(), ...constraints));

  return {
    recipes: snapshot.docs.map(mapRecipeDocument),
    cursor: snapshot.docs[snapshot.docs.length - 1] ?? null
  };
}

export function subscribeToRecipesByAuthor(authorId: string, onRecipes: (recipes: Recipe[]) => void, onError: (error: Error) => void): Unsubscribe {
  return onSnapshot(
    query(recipesCollection(), where("authorId", "==", authorId)),
    (snapshot) => {
      const recipes = snapshot.docs
        .map(mapRecipeDocument)
        .sort((left, right) => (right.createdAt?.getTime() ?? 0) - (left.createdAt?.getTime() ?? 0));

      onRecipes(recipes);
    },
    onError
  );
}

export async function seedRecipesIfEmpty(createdBy: string) {
  const existingRecipes = await getDocs(query(recipesCollection(), limit(1)));

  if (!existingRecipes.empty) {
    return false;
  }

  const batch = writeBatch(requireDb());

  seedRecipes.forEach((recipe) => {
    const recipeRef = doc(recipesCollection());
    batch.set(recipeRef, {
      ...recipe,
      recipeId: recipeRef.id,
      authorId: createdBy,
      authorName: "GlobalChef cook",
      createdBy,
      createdAt: serverTimestamp(),
      likesCount: recipe.likes,
      savesCount: 0,
      commentsCount: 0,
      averageRating: 0,
      ratingsCount: 0
    });
  });
  batch.set(
    doc(requireDb(), "users", createdBy),
    {
      recipeCount: increment(seedRecipes.length),
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

  await batch.commit();
  return true;
}

async function uploadRecipeImage(imageUri: string, recipeId: string, authorId: string) {
  const blob = await uriToBlob(imageUri);
  const imageRef = ref(requireStorage(), `recipes/${authorId}/${recipeId}.jpg`);

  await uploadBytes(imageRef, blob, {
    contentType: blob.type || "image/jpeg"
  });

  return getDownloadURL(imageRef);
}

function uriToBlob(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.onload = () => {
      resolve(xhr.response as Blob);
    };
    xhr.onerror = () => {
      reject(new Error("Could not read the selected image."));
    };
    xhr.responseType = "blob";
    xhr.open("GET", uri, true);
    xhr.send(null);
  });
}

export async function createRecipe(input: CreateRecipeInput) {
  const recipeRef = doc(recipesCollection());
  const authorId = toSafeString(input.authorId);
  const imageUrl = await uploadRecipeImage(toSafeString(input.imageUri), recipeRef.id, authorId);
  const batch = writeBatch(requireDb());

  batch.set(recipeRef, {
    recipeId: recipeRef.id,
    title: toSafeString(input.title).trim(),
    description: toSafeString(input.description).trim(),
    country: toSafeString(input.country).trim(),
    cuisine: toSafeString(input.cuisine).trim(),
    ingredients: toSafeStringArray(input.ingredients),
    steps: toSafeStringArray(input.steps),
    tags: toSafeStringArray(input.tags),
    imageUrl,
    authorId,
    authorName: toSafeString(input.authorName, "GlobalChef cook").trim() || "GlobalChef cook",
    createdBy: authorId,
    createdAt: serverTimestamp(),
    likes: 0,
    likesCount: 0,
    savesCount: 0,
    commentsCount: 0,
    averageRating: 0,
    ratingsCount: 0
  });
  batch.set(
    doc(requireDb(), "users", authorId),
    {
      recipeCount: increment(1),
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

  await batch.commit();

  return recipeRef.id;
}
export async function updateRecipe(
  recipeId: string,
  input: UpdateRecipeInput
) {
  await updateDoc(doc(requireDb(), "recipes", recipeId), {
    title: toSafeString(input.title).trim(),
    description: toSafeString(input.description).trim(),
    country: toSafeString(input.country).trim(),
    cuisine: toSafeString(input.cuisine).trim(),
    ingredients: toSafeStringArray(input.ingredients),
    steps: toSafeStringArray(input.steps),
    tags: toSafeStringArray(input.tags),
    imageUrl: input.imageUri,
  });
}
export async function likeRecipe(recipeId: string) {
  await updateDoc(doc(requireDb(), "recipes", recipeId), {
    likes: increment(1),
    likesCount: increment(1)
  });
}

export function getRecipeErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong while loading recipes.";
}
