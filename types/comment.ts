export type RecipeComment = {
  id: string;
  commentId: string;
  recipeId: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  text: string;
  createdAt: Date | null;
  likesCount: number;
  isOptimistic?: boolean;
  parentCommentId?: string | null;
  replyToUsername?: string | null;
};
