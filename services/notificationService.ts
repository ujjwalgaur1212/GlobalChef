import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  setDoc,
  deleteDoc,
  type DocumentData,
  type Firestore,
  type QueryDocumentSnapshot,
  type Transaction
} from "firebase/firestore";

import { db } from "@/firebase/config";
import { toSafeBoolean, toSafeDate, toSafeString } from "@/services/firestoreConverters";
import type { Notification } from "@/types/notification";

type Unsubscribe = () => void;

function requireDb() {
  if (!db) {
    throw new Error("Firebase Firestore is not configured. Add Firebase values to .env.");
  }

  return db;
}

function notificationsCollection(firestore: Firestore = requireDb()) {
  return collection(firestore, "notifications");
}

function mapNotificationDocument(document: QueryDocumentSnapshot<DocumentData>): Notification {
  const data = document.data();

  return {
    id: document.id,
    recipientId: toSafeString(data.recipientId),
    senderId: toSafeString(data.senderId),
    senderName: toSafeString(data.senderName, "GlobalChef cook"),
    senderPhotoURL: typeof data.senderPhotoURL === "string" ? data.senderPhotoURL : null,
    type:
      data.type === "follow" || data.type === "comment" || data.type === "like"
        ? data.type
        : "comment",
    recipeId: toSafeString(data.recipeId) || null,
    commentText: toSafeString(data.commentText) || null,
    isRead: toSafeBoolean(data.isRead),
    createdAt: toSafeDate(data.createdAt)
  };
}

export function createFollowNotification(
  senderId: string,
  senderName: string,
  senderPhotoURL: string | null,
  recipientId: string,
  transaction?: Transaction
): Promise<void> | void {
  const cleanSenderId = toSafeString(senderId);
  const cleanRecipientId = toSafeString(recipientId);

  if (!cleanSenderId || !cleanRecipientId || cleanSenderId === cleanRecipientId) {
    return;
  }

  const firestore = requireDb();
  const notificationRef = doc(notificationsCollection(firestore));
  const data = {
    senderId: cleanSenderId,
    senderName: toSafeString(senderName, "GlobalChef cook") || "GlobalChef cook",
    senderPhotoURL: senderPhotoURL ?? null,
    recipientId: cleanRecipientId,
    type: "follow" as const,
    isRead: false,
    createdAt: serverTimestamp()
  };

  if (transaction) {
    transaction.set(notificationRef, data);
  } else {
    return setDoc(notificationRef, data);
  }
}

export function createCommentNotification(
  senderId: string,
  senderName: string,
  senderPhotoURL: string | null,
  recipientId: string,
  recipeId: string,
  commentText: string,
  transaction?: Transaction
): Promise<void> | void {
  const cleanSenderId = toSafeString(senderId);
  const cleanRecipientId = toSafeString(recipientId);

  if (!cleanSenderId || !cleanRecipientId || cleanSenderId === cleanRecipientId) {
    return;
  }

  const firestore = requireDb();
  const notificationRef = doc(notificationsCollection(firestore));
  const data = {
    senderId: cleanSenderId,
    senderName: toSafeString(senderName, "GlobalChef cook") || "GlobalChef cook",
    senderPhotoURL: senderPhotoURL ?? null,
    recipientId: cleanRecipientId,
    recipeId: toSafeString(recipeId) || null,
    commentText: toSafeString(commentText) || null,
    type: "comment" as const,
    isRead: false,
    createdAt: serverTimestamp()
  };

  if (transaction) {
    transaction.set(notificationRef, data);
  } else {
    return setDoc(notificationRef, data);
  }
}

export function createLikeNotification(
  senderId: string,
  senderName: string,
  senderPhotoURL: string | null,
  recipientId: string,
  recipeId: string,
  transaction?: Transaction
): Promise<void> | void {
  const cleanSenderId = toSafeString(senderId);
  const cleanRecipientId = toSafeString(recipientId);

  if (!cleanSenderId || !cleanRecipientId || cleanSenderId === cleanRecipientId) {
    return;
  }

  const firestore = requireDb();
  const notificationRef = doc(notificationsCollection(firestore));
  const data = {
    senderId: cleanSenderId,
    senderName: toSafeString(senderName, "GlobalChef cook") || "GlobalChef cook",
    senderPhotoURL: senderPhotoURL ?? null,
    recipientId: cleanRecipientId,
    recipeId: toSafeString(recipeId) || null,
    type: "like" as const,
    isRead: false,
    createdAt: serverTimestamp()
  };

  if (transaction) {
    transaction.set(notificationRef, data);
  } else {
    return setDoc(notificationRef, data);
  }
}

export function subscribeToNotifications(
  userId: string,
  onNotifications: (notifications: Notification[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    query(
      notificationsCollection(),
      where("recipientId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(100)
    ),
    (snapshot) => {
      onNotifications(snapshot.docs.map(mapNotificationDocument));
    },
    onError
  );
}

export async function markNotificationAsRead(notificationId: string) {
  await updateDoc(doc(requireDb(), "notifications", notificationId), {
    isRead: true
  });
}

export async function markAllNotificationsAsRead(userId: string) {
  const firestore = requireDb();
  const snapshot = await getDocs(
    query(
      notificationsCollection(firestore),
      where("recipientId", "==", userId),
      where("isRead", "==", false)
    )
  );

  if (snapshot.empty) {
    return;
  }

  const batch = writeBatch(firestore);

  snapshot.docs.forEach((notification) => {
    batch.update(notification.ref, {
      isRead: true
    });
  });

  await batch.commit();
}

export async function deleteNotification(notificationId: string) {
  await deleteDoc(doc(requireDb(), "notifications", notificationId));
}

export function getNotificationErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Could not update notifications.";
}
