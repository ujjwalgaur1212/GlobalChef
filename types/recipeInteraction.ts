import type { Recipe } from "@/types/recipe";

export type RecipeInteraction = {
  id: string;
  recipeId: string;
  userId: string;
  createdAt: Date | null;
  recipe: Recipe | null;
};
