export type UserProfile = {
  id: string;
  displayName: string;
  username: string;
  email: string;
  photoURL?: string | null;
  bio: string;
  country: string;
  followersCount: number;
  followingCount: number;
  recipeCount: number;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type UpdateUserProfileInput = {
  userId: string;
  displayName: string;
  bio: string;
  country: string;
  photoUri?: string | null;
};
