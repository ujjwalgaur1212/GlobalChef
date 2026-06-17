export type RecipeCollection = {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  createdAt: Date | null;
  recipeCount: number;
  coverImageUrl?: string;
};

export type CollectionRecipe = {
  id: string;
  collectionId: string;
  recipeId: string;
  addedAt: Date | null;
};

export type CreateCollectionInput = {
  ownerId: string;
  name: string;
  description?: string;
};

export type UpdateCollectionInput = {
  collectionId: string;
  ownerId: string;
  name: string;
  description?: string;
};
