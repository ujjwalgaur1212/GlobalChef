export type NotificationType = "follow" | "comment" | "like" | "reply";


export interface Notification {
  id: string;
  type: NotificationType;
  recipientId: string;
  senderId: string;
  senderName: string;
  senderPhotoURL: string | null;
  recipeId?: string | null;
  commentText?: string | null;
  createdAt: Date | null;
  isRead: boolean;
}

export type GlobalChefNotification = Notification;

