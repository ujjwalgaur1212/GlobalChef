export type RecipeSearchSort = "newest" | "mostLiked" | "mostCommented";

export type Recipe = {
  id: string;
  recipeId: string;
  title: string;
  description: string;
  country: string;
  cuisine: string;
  ingredients: string[];
  steps: string[];
  tags: string[];
  imageUrl: string;
  authorId: string;
  authorName: string;
  createdBy: string;
  createdAt: Date | null;
  likes: number;
  likesCount: number;
  savesCount: number;
  commentsCount: number;
  averageRating: number;
  ratingsCount: number;
};

export type CreateRecipeInput = {
  title: string;
  description: string;
  country: string;
  cuisine: string;
  ingredients: string[];
  steps: string[];
  tags: string[];
  imageUri: string;
  authorId: string;
  authorName: string;
};
export type UpdateRecipeInput = {
  title: string;
  description: string;
  country: string;
  cuisine: string;
  ingredients: string[];
  steps: string[];
  tags: string[];
  imageUri: string;
};

