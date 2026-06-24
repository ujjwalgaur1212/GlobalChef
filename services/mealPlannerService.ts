import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";

import { db } from "@/firebase/config";
import { getRecipes } from "@/services/recipeService";
import type { Recipe } from "@/types/recipe";
import type {
  UserPreferences,
  MealPlan,
  MealPlanItem,
  MealType,
  GroceryItem
} from "@/types/mealPlanner";

function requireDb() {
  if (!db) {
    throw new Error("Firebase Firestore is not configured. Add Firebase values to .env.");
  }
  return db;
}

export function getFoodImageByKeywords(title: string, cuisine: string): string {
  const t = title.toLowerCase();
  const c = cuisine.toLowerCase();
  
  if (t.includes("pancake") || t.includes("waffle") || t.includes("toast") || t.includes("oat") || t.includes("crepe")) {
    return "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80"; // breakfast
  }
  if (t.includes("egg") || t.includes("omelet") || t.includes("scramble")) {
    return "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80"; // breakfast/egg
  }
  if (t.includes("salad") || t.includes("bowl")) {
    return "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80"; // salad
  }
  if (t.includes("soup") || t.includes("stew") || t.includes("broth")) {
    return "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80"; // soup
  }
  if (t.includes("burger") || t.includes("sandwich") || t.includes("wrap")) {
    return "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80"; // burger
  }
  if (t.includes("pizza") || t.includes("pasta") || t.includes("lasagna") || t.includes("spaghetti")) {
    return "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=800&q=80"; // pizza
  }
  if (t.includes("curry") || t.includes("tikka") || t.includes("paneer") || t.includes("dal") || t.includes("masala") || t.includes("korma")) {
    return "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=800&q=80"; // curry
  }
  if (t.includes("taco") || t.includes("burrito") || t.includes("quesadilla") || t.includes("fajita") || t.includes("nacho")) {
    return "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=800&q=80"; // tacos
  }
  if (t.includes("sushi") || t.includes("ramen") || t.includes("noodle") || t.includes("rice") || t.includes("stir-fry") || t.includes("dumpling")) {
    return "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80"; // asian/ramen
  }
  if (t.includes("smoothie") || t.includes("shake") || t.includes("juice") || t.includes("drink") || t.includes("beverage")) {
    return "https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=800&q=80"; // smoothie
  }
  if (t.includes("dessert") || t.includes("cake") || t.includes("cookie") || t.includes("brownie") || t.includes("sweet") || t.includes("ice cream") || t.includes("pudding")) {
    return "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80"; // dessert
  }
  
  // Cuisine fallbacks
  if (c.includes("indian")) {
    return "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=800&q=80";
  }
  if (c.includes("italian")) {
    return "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=800&q=80";
  }
  if (c.includes("mexican")) {
    return "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=800&q=80";
  }
  if (c.includes("chinese") || c.includes("japanese") || c.includes("asian") || c.includes("thai") || c.includes("korean")) {
    return "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80";
  }
  
  // Default general beautiful food image
  return "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=800&q=80";
}

// Call Gemini API helper
async function callGemini(promptText: string): Promise<string> {
  const env = process.env as Record<string, string | undefined>;
  const apiKey = env.EXPO_PUBLIC_GEMINI_API_KEY || env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined in the environment variables.");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: promptText
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  interface GeminiResponse {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
        }>;
      };
    }>;
  }

  const responseText = await response.text();
  const data = JSON.parse(responseText) as GeminiResponse;
  const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!generatedText) {
    throw new Error("No text generated in response candidates.");
  }

  let cleanText = generatedText.trim();
  // Remove markdown formatting
  if (cleanText.startsWith("```json")) {
    cleanText = cleanText.substring(7);
  } else if (cleanText.startsWith("```")) {
    cleanText = cleanText.substring(3);
  }
  if (cleanText.endsWith("```")) {
    cleanText = cleanText.substring(0, cleanText.length - 3);
  }
  return cleanText.trim();
}

export const MealPlannerService = {
  // User Preferences
  async saveUserPreferences(preferences: UserPreferences): Promise<void> {
    const firestore = requireDb();
    const prefRef = doc(firestore, "userPreferences", preferences.userId);
    await setDoc(prefRef, {
      ...preferences,
      updatedAt: serverTimestamp()
    });
  },

  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    const firestore = requireDb();
    const prefRef = doc(firestore, "userPreferences", userId);
    const snap = await getDoc(prefRef);
    if (!snap.exists()) {
      return null;
    }
    const data = snap.data();
    return {
      userId: data.userId,
      goal: data.goal,
      diet: data.diet,
      mealsPerDay: data.mealsPerDay,
      allergies: data.allergies ?? [],
      cuisines: data.cuisines ?? [],
      updatedAt: data.updatedAt
    };
  },

  // Meal Plans metadata
  async getUserMealPlans(userId: string): Promise<MealPlan[]> {
    const firestore = requireDb();
    const plansQuery = query(
      collection(firestore, "mealPlans"),
      where("userId", "==", userId)
    );
    const snap = await getDocs(plansQuery);
    const plans = snap.docs.map((document) => {
      const data = document.data();
      return {
        id: document.id,
        userId: data.userId,
        planName: data.planName,
        daysCount: data.daysCount,
        createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : new Date()
      };
    });
    // Sort locally by createdAt desc
    return plans.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  async getMealPlanItems(planId: string): Promise<MealPlanItem[]> {
    const firestore = requireDb();
    const itemsQuery = query(
      collection(firestore, "mealPlanItems"),
      where("planId", "==", planId)
    );
    const snap = await getDocs(itemsQuery);
    const items = snap.docs.map((document) => {
      const data = document.data();
      return {
        id: document.id,
        planId: data.planId,
        userId: data.userId,
        dayNumber: data.dayNumber,
        mealType: data.mealType as MealType,
        recipeId: data.recipeId,
        recipeTitle: data.recipeTitle,
        recipeImageUrl: data.recipeImageUrl,
        calories: Number(data.calories) || 0,
        prepTime: Number(data.prepTime) || 0,
        ingredients: data.ingredients ?? [],
        steps: data.steps ?? []
      };
    });
    // Sort by day number, and then meal type order
    const mealOrder: Record<MealType, number> = {
      Breakfast: 1,
      Lunch: 2,
      Dinner: 3,
      Snack: 4
    };
    return items.sort((a, b) => {
      if (a.dayNumber !== b.dayNumber) {
        return a.dayNumber - b.dayNumber;
      }
      return mealOrder[a.mealType] - mealOrder[b.mealType];
    });
  },

  async deleteMealPlan(planId: string): Promise<void> {
    const firestore = requireDb();
    const batch = writeBatch(firestore);
    
    // Delete plan doc
    batch.delete(doc(firestore, "mealPlans", planId));
    
    // Delete associated plan items
    const itemsQuery = query(
      collection(firestore, "mealPlanItems"),
      where("planId", "==", planId)
    );
    const snap = await getDocs(itemsQuery);
    snap.docs.forEach((itemDoc) => {
      batch.delete(itemDoc.ref);
    });

    await batch.commit();
  },

  async renameMealPlan(planId: string, newName: string): Promise<void> {
    const firestore = requireDb();
    await updateDoc(doc(firestore, "mealPlans", planId), {
      planName: newName
    });
  },

  // Plan generation via Gemini
  async generateMealPlan(
    userId: string,
    preferences: UserPreferences,
    daysCount: number
  ): Promise<{ planId: string; items: MealPlanItem[] }> {
    const firestore = requireDb();
    const dbRecipes = await getRecipes();

    const promptText = `
You are an advanced AI Meal Planner for HiChef. Generate a personalized meal plan for a user.

User preferences:
- Goal: ${preferences.goal}
- Diet: ${preferences.diet}
- Meals per day: ${preferences.mealsPerDay}
- Allergies: ${preferences.allergies.join(", ") || "None"}
- Cuisine preferences: ${preferences.cuisines.join(", ") || "Any"}
- Plan duration: ${daysCount} day(s)

Here is a list of recipes already available in our app (in JSON format):
${JSON.stringify(
  dbRecipes.map((r) => ({
    id: r.id,
    title: r.title,
    cuisine: r.cuisine,
    ingredients: r.ingredients,
    steps: r.steps
  }))
)}

INSTRUCTIONS:
1. Generate a plan for exactly ${daysCount} day(s), where dayNumber goes from 1 to ${daysCount}.
2. For each day, generate exactly ${preferences.mealsPerDay} meals.
   - If meals per day is 3: Breakfast, Lunch, Dinner.
   - If meals per day is 4: Breakfast, Lunch, Dinner, Snack.
   - If meals per day is 5: Breakfast, Lunch, Dinner, Snack, Snack.
   - If meals per day is 6: Breakfast, Lunch, Dinner, Snack, Snack, Snack.
3. IMPORTANT: Use the recipes available in the app whenever possible! If an available recipe matches the user's diet (Vegetarian/Vegan/Non-Vegetarian/Pescatarian), cuisine, and goal, select it and set its 'recipeId' to the database recipe ID, and use its title, ingredients, and steps exactly.
4. If no available recipe is a good fit, generate a new recipe suitable for the user's preferences. For generated/synthetic recipes, set 'recipeId' to null, and create a realistic title, ingredients list, and clear steps.
5. For all meals, estimate the calories (number) and prepTime (number in minutes).
6. Respect the user's diet and allergies strictly. (Vegetarian must not have meat/fish, Vegan must not have meat/fish/dairy/eggs, allergies must be avoided).

Return ONLY a JSON array matching this TypeScript structure:
Array<{
  dayNumber: number;
  mealType: "Breakfast" | "Lunch" | "Dinner" | "Snack";
  recipeId: string | null;
  recipeTitle: string;
  calories: number;
  prepTime: number;
  ingredients: string[];
  steps: string[];
}>

Do not include any extra text or conversational response. Return only the raw JSON array.
`;

    const resultJson = await callGemini(promptText);
    const rawItems = JSON.parse(resultJson) as Array<{
      dayNumber: number;
      mealType: MealType;
      recipeId: string | null;
      recipeTitle: string;
      calories: number;
      prepTime: number;
      ingredients: string[];
      steps: string[];
    }>;

    // Create the meal plan document
    const planRef = doc(collection(firestore, "mealPlans"));
    const planId = planRef.id;
    const planName = `${preferences.goal} Plan - ${daysCount} Day${daysCount > 1 ? "s" : ""}`;

    const batch = writeBatch(firestore);
    
    batch.set(planRef, {
      id: planId,
      userId,
      planName,
      daysCount,
      createdAt: serverTimestamp()
    });

    const items: MealPlanItem[] = [];

    rawItems.forEach((raw) => {
      const itemRef = doc(collection(firestore, "mealPlanItems"));
      
      // Lookup recipe imageUrl from database if recipeId matches, else resolve image by title keywords
      let imageUrl = "";
      if (raw.recipeId) {
        const matched = dbRecipes.find((r) => r.id === raw.recipeId);
        if (matched) {
          imageUrl = matched.imageUrl;
        }
      }
      
      if (!imageUrl) {
        // Resolve a beautiful Unsplash food image
        imageUrl = getFoodImageByKeywords(raw.recipeTitle, preferences.cuisines[0] || "Any");
      }

      const planItem: MealPlanItem = {
        id: itemRef.id,
        planId,
        userId,
        dayNumber: raw.dayNumber,
        mealType: raw.mealType,
        recipeId: raw.recipeId,
        recipeTitle: raw.recipeTitle,
        recipeImageUrl: imageUrl,
        calories: Number(raw.calories) || 250,
        prepTime: Number(raw.prepTime) || 15,
        ingredients: raw.ingredients ?? [],
        steps: raw.steps ?? []
      };

      batch.set(itemRef, planItem);
      items.push(planItem);
    });

    await batch.commit();

    const mealOrder: Record<MealType, number> = {
      Breakfast: 1,
      Lunch: 2,
      Dinner: 3,
      Snack: 4
    };
    return {
      planId,
      items: items.sort((a, b) => {
        if (a.dayNumber !== b.dayNumber) {
          return a.dayNumber - b.dayNumber;
        }
        return mealOrder[a.mealType] - mealOrder[b.mealType];
      })
    };
  },

  // Regenerate a single meal item in a plan
  async regenerateSingleMeal(
    planId: string,
    itemToReplace: MealPlanItem,
    preferences: UserPreferences
  ): Promise<MealPlanItem> {
    const firestore = requireDb();
    const dbRecipes = await getRecipes();

    const promptText = `
You are an advanced AI Meal Planner for HiChef. Replace a single meal in a meal plan.

User preferences:
- Goal: ${preferences.goal}
- Diet: ${preferences.diet}
- Allergies: ${preferences.allergies.join(", ") || "None"}
- Cuisine preferences: ${preferences.cuisines.join(", ") || "Any"}

The current meal being replaced:
- Meal Type: ${itemToReplace.mealType}
- Title: ${itemToReplace.recipeTitle}
- Day Number: ${itemToReplace.dayNumber}

Here is a list of recipes already available in our app (in JSON format):
${JSON.stringify(
  dbRecipes.map((r) => ({
    id: r.id,
    title: r.title,
    cuisine: r.cuisine,
    ingredients: r.ingredients,
    steps: r.steps
  }))
)}

INSTRUCTIONS:
1. Generate exactly ONE replacement meal of type '${itemToReplace.mealType}' for day ${itemToReplace.dayNumber}.
2. It must be DIFFERENT from the current meal ("${itemToReplace.recipeTitle}").
3. Use a recipe available in the app if it matches the user preferences, setting 'recipeId' to its database ID.
4. Otherwise, generate a custom recipe setting 'recipeId' to null.
5. Respect all dietary restrictions and allergies strictly.
6. Estimate calories (number) and prepTime (number in minutes).

Return ONLY a JSON object matching this structure:
{
  dayNumber: number;
  mealType: "Breakfast" | "Lunch" | "Dinner" | "Snack";
  recipeId: string | null;
  recipeTitle: string;
  calories: number;
  prepTime: number;
  ingredients: string[];
  steps: string[];
}

Return only the raw JSON.
`;

    const resultJson = await callGemini(promptText);
    const raw = JSON.parse(resultJson) as {
      dayNumber: number;
      mealType: MealType;
      recipeId: string | null;
      recipeTitle: string;
      calories: number;
      prepTime: number;
      ingredients: string[];
      steps: string[];
    };

    let imageUrl = "";
    if (raw.recipeId) {
      const matched = dbRecipes.find((r) => r.id === raw.recipeId);
      if (matched) {
        imageUrl = matched.imageUrl;
      }
    }
    
    if (!imageUrl) {
      imageUrl = getFoodImageByKeywords(raw.recipeTitle, preferences.cuisines[0] || "Any");
    }

    const updatedItem: MealPlanItem = {
      id: itemToReplace.id,
      planId,
      userId: itemToReplace.userId,
      dayNumber: itemToReplace.dayNumber,
      mealType: itemToReplace.mealType,
      recipeId: raw.recipeId,
      recipeTitle: raw.recipeTitle,
      recipeImageUrl: imageUrl,
      calories: Number(raw.calories) || 250,
      prepTime: Number(raw.prepTime) || 15,
      ingredients: raw.ingredients ?? [],
      steps: raw.steps ?? []
    };

    // Update in Firestore
    await setDoc(doc(firestore, "mealPlanItems", itemToReplace.id), updatedItem);

    return updatedItem;
  },

  // Consolidated Grocery List
  async generateGroceryList(ingredients: string[]): Promise<GroceryItem[]> {
    if (!ingredients || ingredients.length === 0) {
      return [];
    }

    const promptText = `
You are a grocery shopping list consolidator for HiChef.

Combine and merge this list of raw ingredients into a clean, grouped, and structured shopping list. Combine duplicate ingredients and sum up their quantities where appropriate.

Raw Ingredients:
${JSON.stringify(ingredients)}

INSTRUCTIONS:
1. Consolidate duplicates (e.g., if we have "2 tomatoes" and "4 tomatoes", output "Tomatoes" with quantity "x6").
2. Standardize formatting: capitalize names and format them nicely.
3. Keep quantities short, clean, and readable.
4. Try to merge matching products like "chopped onion" and "onions" into one group (e.g. "Onions", "x3").

Return ONLY a JSON array matching this structure:
Array<{
  ingredient: string; // E.g. "Tomatoes", "Onions", "Olive Oil"
  quantity: string;   // E.g. "x6", "3 cups", "1 bottle", "500g"
}>

Return only raw JSON.
`;

    try {
      const resultJson = await callGemini(promptText);
      return JSON.parse(resultJson) as GroceryItem[];
    } catch (e) {
      console.error("Failed to consolidate grocery list via Gemini, falling back to local merge:", e);
      
      // Fallback local crude merge
      const merged: Record<string, number> = {};
      ingredients.forEach((ing) => {
        const clean = ing.trim().toLowerCase();
        // Extract numbers if simple
        const match = clean.match(/^(\d+(?:\.\d+)?)\s*(.*)/);
        if (match) {
          const num = parseFloat(match[1]);
          const name = match[2].trim();
          merged[name] = (merged[name] || 0) + num;
        } else {
          merged[clean] = (merged[clean] || 0) + 1;
        }
      });

      return Object.keys(merged).map((key) => {
        // Capitalize words
        const cap = key.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
        return {
          ingredient: cap,
          quantity: `x${merged[key]}`
        };
      });
    }
  },

  // AI Personalized Recommendations
  async getAIRecommendations(
    userId: string,
    likedRecipeIds: Set<string>,
    savedRecipeIds: Set<string>,
    cookedRecipeIds: Set<string>,
    preferences: UserPreferences
  ): Promise<Recipe[]> {
    const dbRecipes = await getRecipes();
    if (dbRecipes.length === 0) {
      return [];
    }

    const likedTitles = dbRecipes.filter((r) => likedRecipeIds.has(r.id)).map((r) => r.title);
    const savedTitles = dbRecipes.filter((r) => savedRecipeIds.has(r.id)).map((r) => r.title);
    const cookedTitles = dbRecipes.filter((r) => cookedRecipeIds.has(r.id)).map((r) => r.title);

    const promptText = `
You are an AI food recommendation assistant for HiChef. Recommend 3 to 5 recipes from our app database that the user would love.

User preferences:
- Goal: ${preferences.goal}
- Diet: ${preferences.diet}
- Allergies: ${preferences.allergies.join(", ") || "None"}
- Cuisine preferences: ${preferences.cuisines.join(", ") || "Any"}

User history:
- Liked recipe titles: ${JSON.stringify(likedTitles)}
- Bookmarked recipe titles: ${JSON.stringify(savedTitles)}
- Previously cooked recipe titles: ${JSON.stringify(cookedTitles)}

Here is the list of recipes available in our app (in JSON format):
${JSON.stringify(
  dbRecipes.map((r) => ({
    id: r.id,
    title: r.title,
    cuisine: r.cuisine,
    tags: r.tags
  }))
)}

INSTRUCTIONS:
1. Select 3 to 5 recipe IDs from the database list that best match the user's goals, diet, and history.
2. The selection should strictly respect their diet and allergies (e.g. Vegetarian must not get non-vegetarian dishes).
3. Try to suggest recipes that user has not liked, saved, or cooked recently unless database has very few options.

Return ONLY a JSON array of the recommended recipe IDs from the database list:
["id_1", "id_2", ...]

Return only raw JSON.
`;

    try {
      const resultJson = await callGemini(promptText);
      const recommendedIds = JSON.parse(resultJson) as string[];
      
      const filtered = dbRecipes.filter((r) => recommendedIds.includes(r.id));
      if (filtered.length > 0) {
        return filtered;
      }
    } catch (e) {
      console.error("Failed to generate AI recommendations, falling back to matching preferences:", e);
    }

    // Fallback: match preferences in JS
    return dbRecipes.filter((r) => {
      // Basic diet matching
      const diet = preferences.diet;
      const c = r.cuisine.toLowerCase();
      
      // Match diet
      if (diet === "Vegetarian") {
        const isVeg = r.tags.includes("veg") || r.tags.includes("vegetarian") || !r.ingredients.some(i => i.toLowerCase().includes("chicken") || i.toLowerCase().includes("meat") || i.toLowerCase().includes("fish") || i.toLowerCase().includes("pork"));
        if (!isVeg) return false;
      } else if (diet === "Vegan") {
        const isVegan = r.tags.includes("vegan") || (!r.ingredients.some(i => i.toLowerCase().includes("chicken") || i.toLowerCase().includes("meat") || i.toLowerCase().includes("fish") || i.toLowerCase().includes("milk") || i.toLowerCase().includes("cheese") || i.toLowerCase().includes("egg") || i.toLowerCase().includes("butter")));
        if (!isVegan) return false;
      } else if (diet === "Pescatarian") {
        const isPesc = !r.ingredients.some(i => i.toLowerCase().includes("chicken") || i.toLowerCase().includes("meat") || i.toLowerCase().includes("pork"));
        if (!isPesc) return false;
      }
      
      // Match cuisine
      if (preferences.cuisines.length > 0 && !preferences.cuisines.includes("Any")) {
        const matchesCuisine = preferences.cuisines.some((prefCuisine) => c.includes(prefCuisine.toLowerCase()));
        if (!matchesCuisine) return false;
      }

      return true;
    }).slice(0, 5);
  }
};
