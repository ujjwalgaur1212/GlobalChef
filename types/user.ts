export type UserProfile = {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string | null;
  followersCount: number;
  followingCount: number;
  createdAt: Date | null;
  updatedAt: Date | null;
};
