export type FollowRelationship = {
  id: string;
  followerId: string;
  followedId: string;
  createdAt: Date | null;
};
