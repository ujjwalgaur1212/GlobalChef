export type RecipeRating = {
  id: string;
  recipeId: string;
  userId: string;
  rating: number;
  createdAt: Date | null;
};
