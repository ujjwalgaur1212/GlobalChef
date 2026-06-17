export type NotificationType = "newFollower" | "recipeComment" | "recipeLike";

export type GlobalChefNotification = {
  id: string;
  recipientId: string;
  actorId: string;
  actorName: string;
  actorPhotoURL: string | null;
  type: NotificationType;
  recipeId: string | null;
  recipeTitle: string | null;
  commentId: string | null;
  commentText: string | null;
  read: boolean;
  createdAt: Date | null;
};
