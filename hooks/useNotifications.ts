import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getNotificationErrorMessage,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  subscribeToNotifications
} from "@/services/notificationService";
import type { GlobalChefNotification } from "@/types/notification";

export function useNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<GlobalChefNotification[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);

    const unsubscribe = subscribeToNotifications(
      userId,
      (nextNotifications) => {
        setNotifications(nextNotifications);
        setError(null);
        setIsLoading(false);
      },
      (notificationError) => {
        setError(getNotificationErrorMessage(notificationError));
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, [userId]);

  const unreadCount = useMemo(() => notifications.filter((notification) => !notification.read).length, [notifications]);

  const markAsRead = useCallback(async (notificationId: string) => {
    await markNotificationAsRead(notificationId);
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!userId) {
      throw new Error("Sign in before updating notifications.");
    }

    await markAllNotificationsAsRead(userId);
  }, [userId]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead
  };
}
