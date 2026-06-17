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
  type DocumentData,
  type Firestore,
  type QueryDocumentSnapshot,
  type Transaction
} from "firebase/firestore";

import { db } from "@/firebase/config";
import { toSafeBoolean, toSafeDate, toSafeString } from "@/services/firestoreConverters";
import type { GlobalChefNotification, NotificationType } from "@/types/notification";

type Unsubscribe = () => void;

type CreateNotificationInput = {
  recipientId: string;
  actorId: string;
  actorName: string;
  actorPhotoURL?: string | null;
  type: NotificationType;
  recipeId?: string | null;
  recipeTitle?: string | null;
  commentId?: string | null;
  commentText?: string | null;
};

function requireDb() {
  if (!db) {
    throw new Error("Firebase Firestore is not configured. Add Firebase values to .env.");
  }

  return db;
}

function notificationsCollection(firestore: Firestore = requireDb()) {
  return collection(firestore, "notifications");
}

function mapNotificationDocument(document: QueryDocumentSnapshot<DocumentData>): GlobalChefNotification {
  const data = document.data();

  return {
    id: document.id,
    recipientId: toSafeString(data.recipientId),
    actorId: toSafeString(data.actorId),
    actorName: toSafeString(data.actorName, "GlobalChef cook"),
    actorPhotoURL: typeof data.actorPhotoURL === "string" ? data.actorPhotoURL : null,
    type:
      data.type === "newFollower" || data.type === "recipeComment" || data.type === "recipeLike"
        ? data.type
        : "recipeComment",
    recipeId: toSafeString(data.recipeId) || null,
    recipeTitle: toSafeString(data.recipeTitle) || null,
    commentId: toSafeString(data.commentId) || null,
    commentText: toSafeString(data.commentText) || null,
    read: toSafeBoolean(data.read),
    createdAt: toSafeDate(data.createdAt)
  };
}

export function createNotificationInTransaction(
  transaction: Transaction,
  firestore: Firestore,
  input: CreateNotificationInput
) {
  const recipientId = toSafeString(input.recipientId);
  const actorId = toSafeString(input.actorId);

  if (!recipientId || !actorId || recipientId === actorId) {
    return;
  }

  const notificationRef = doc(notificationsCollection(firestore));

  transaction.set(notificationRef, {
    recipientId,
    actorId,
    actorName: toSafeString(input.actorName, "GlobalChef cook") || "GlobalChef cook",
    actorPhotoURL: input.actorPhotoURL ?? null,
    type: input.type,
    recipeId: input.recipeId ?? null,
    recipeTitle: input.recipeTitle ?? null,
    commentId: input.commentId ?? null,
    commentText: input.commentText ?? null,
    read: false,
    createdAt: serverTimestamp()
  });
}

export function subscribeToNotifications(
  userId: string,
  onNotifications: (notifications: GlobalChefNotification[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    query(notificationsCollection(), where("recipientId", "==", userId), orderBy("createdAt", "desc"), limit(50)),
    (snapshot) => {
      onNotifications(snapshot.docs.map(mapNotificationDocument));
    },
    onError
  );
}

export async function markNotificationAsRead(notificationId: string) {
  await updateDoc(doc(requireDb(), "notifications", notificationId), {
    read: true
  });
}

export async function markAllNotificationsAsRead(userId: string) {
  const firestore = requireDb();
  const snapshot = await getDocs(query(notificationsCollection(firestore), where("recipientId", "==", userId), where("read", "==", false)));

  if (snapshot.empty) {
    return;
  }

  const batch = writeBatch(firestore);

  snapshot.docs.forEach((notification) => {
    batch.update(notification.ref, {
      read: true
    });
  });

  await batch.commit();
}

export function getNotificationErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Could not update notifications.";
}
