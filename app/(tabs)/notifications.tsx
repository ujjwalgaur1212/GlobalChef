import { Redirect, useRouter } from "expo-router";
import { Bell, CheckCheck, ChefHat, Heart, MessageCircle, UserPlus } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/constants/theme";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { useToast } from "@/hooks/useToast";
import type { GlobalChefNotification, NotificationType } from "@/types/notification";

function formatNotificationDate(date: Date | null) {
  if (!date) {
    return "Just now";
  }

  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) {
    return "Just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part.trim().slice(0, 1))
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case "newFollower":
      return <UserPlus stroke={colors.saffron} size={20} />;
    case "recipeLike":
      return <Heart stroke={colors.tomato} size={20} />;
    case "recipeComment":
      return <MessageCircle stroke={colors.herb} size={20} />;
    default:
      return <Bell stroke={colors.saffron} size={20} />;
  }
}

function getNotificationTitle(notification: GlobalChefNotification) {
  switch (notification.type) {
    case "newFollower":
      return `${notification.actorName} followed you`;
    case "recipeLike":
      return `${notification.actorName} liked your recipe`;
    case "recipeComment":
      return `${notification.actorName} commented on your recipe`;
    default:
      return "New GlobalChef activity";
  }
}

function getNotificationBody(notification: GlobalChefNotification) {
  switch (notification.type) {
    case "newFollower":
      return "Open their chef profile and see what they are cooking.";
    case "recipeLike":
      return notification.recipeTitle ? `"${notification.recipeTitle}" is getting some love.` : "One of your recipes got a new like.";
    case "recipeComment":
      return notification.commentText
        ? `"${notification.commentText}"`
        : notification.recipeTitle
          ? `New note on "${notification.recipeTitle}".`
          : "Someone left a note on your recipe.";
    default:
      return "Open GlobalChef to see what changed.";
  }
}

type NotificationRowProps = {
  notification: GlobalChefNotification;
  isUpdating: boolean;
  onOpen: (notification: GlobalChefNotification) => void;
  onMarkRead: (notification: GlobalChefNotification) => void;
};

function NotificationRow({ notification, isUpdating, onOpen, onMarkRead }: NotificationRowProps) {
  const initials = getInitials(notification.actorName || "GlobalChef cook") || "GC";
  const isUnread = !notification.read;

  return (
    <Pressable
      className={`rounded-chef border px-4 py-4 ${isUnread ? "border-chef-saffron bg-chef-saffron/10" : "border-chef-line bg-chef-panel"}`}
      onPress={() => onOpen(notification)}
    >
      <View className="flex-row items-start">
        <View className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-chef-black">
          <Text className="text-chef-sm font-extrabold text-chef-saffron">{initials}</Text>
        </View>
        <View className="flex-1">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-chef-base font-extrabold text-chef-cream">{getNotificationTitle(notification)}</Text>
              <Text className="mt-2 text-chef-sm leading-6 text-chef-muted">{getNotificationBody(notification)}</Text>
            </View>
            <View className="items-end">
              <View className="h-9 w-9 items-center justify-center rounded-full bg-chef-black">{getNotificationIcon(notification.type)}</View>
              {isUnread ? <View className="mt-2 h-2.5 w-2.5 rounded-full bg-chef-tomato" /> : null}
            </View>
          </View>

          <View className="mt-4 flex-row items-center justify-between">
            <Text className="text-chef-xs font-bold text-chef-muted">{formatNotificationDate(notification.createdAt)}</Text>
            {isUnread ? (
              <Pressable
                className="h-9 flex-row items-center justify-center rounded-full bg-chef-black px-3"
                disabled={!!isUpdating}
                onPress={(event) => {
                  event.stopPropagation();
                  onMarkRead(notification);
                }}
              >
                {isUpdating ? (
                  <ActivityIndicator color={colors.saffron} size="small" />
                ) : (
                  <>
                    <CheckCheck stroke={colors.saffron} size={14} />
                    <Text className="ml-2 text-chef-xs font-extrabold text-chef-saffron">Read</Text>
                  </>
                )}
              </Pressable>
            ) : (
              <Text className="text-chef-xs font-extrabold text-chef-muted">Read</Text>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function NotificationsTab() {
  const router = useRouter();
  const { user, initializing } = useAuth();
  const { showToast } = useToast();
  const { notifications, unreadCount, isLoading, error, markAsRead, markAllAsRead } = useNotifications(user?.id);
  const [updatingNotificationIds, setUpdatingNotificationIds] = useState<Set<string>>(new Set());
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const subtitle = useMemo(() => {
    if (unreadCount === 0) {
      return "You are caught up on chef activity.";
    }

    return `${unreadCount} unread kitchen update${unreadCount === 1 ? "" : "s"}.`;
  }, [unreadCount]);

  useEffect(() => {
    if (error) {
      showToast(error, "error");
    }
  }, [error, showToast]);

  async function handleMarkRead(notification: GlobalChefNotification) {
    if (notification.read || updatingNotificationIds.has(notification.id)) {
      return;
    }

    setUpdatingNotificationIds((current) => new Set(current).add(notification.id));

    try {
      await markAsRead(notification.id);
    } catch (markError) {
      showToast(markError instanceof Error ? markError.message : "Could not mark notification as read.", "error");
    } finally {
      setUpdatingNotificationIds((current) => {
        const next = new Set(current);
        next.delete(notification.id);
        return next;
      });
    }
  }

  async function handleOpen(notification: GlobalChefNotification) {
    await handleMarkRead(notification);

    if (notification.type === "newFollower") {
      router.push({
        pathname: "/chef/[id]",
        params: { id: notification.actorId }
      });
      return;
    }

    if (notification.recipeId) {
      router.push({
        pathname: "/recipe/[id]",
        params: { id: notification.recipeId }
      });
    }
  }

  async function handleMarkAllRead() {
    if (unreadCount === 0 || isMarkingAll) {
      return;
    }

    setIsMarkingAll(true);

    try {
      await markAllAsRead();
      showToast("Notifications marked as read", "success");
    } catch (markError) {
      showToast(markError instanceof Error ? markError.message : "Could not mark notifications as read.", "error");
    } finally {
      setIsMarkingAll(false);
    }
  }

  if (initializing) {
    return (
      <View className="flex-1 items-center justify-center bg-chef-black">
        <ActivityIndicator color={colors.saffron} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <View className="flex-1 bg-chef-black">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <FlatList
          contentContainerStyle={{ paddingBottom: 112 }}
          data={notifications}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View className="h-4" />}
          ListEmptyComponent={
            isLoading ? (
              <View className="mx-6 items-center rounded-chef border border-chef-line bg-chef-panel py-10">
                <ActivityIndicator color={colors.saffron} />
              </View>
            ) : (
              <View className="mx-6 rounded-chef border border-chef-line bg-chef-panel px-5 py-8">
                <View className="mx-auto mb-4 h-14 w-14 items-center justify-center rounded-full bg-chef-saffron/15">
                  <ChefHat stroke={colors.saffron} size={24} />
                </View>
                <Text className="text-center text-chef-lg font-extrabold text-chef-cream">No notifications yet</Text>
                <Text className="mt-2 text-center text-chef-sm leading-6 text-chef-muted">
                  Follows, recipe likes, and new comments on your dishes will appear here.
                </Text>
              </View>
            )
          }
          ListHeaderComponent={
            <View className="px-6 pb-5 pt-3">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-4">
                  <Text className="text-chef-sm font-bold uppercase text-chef-saffron">Notifications</Text>
                  <Text className="mt-2 text-[32px] font-extrabold leading-10 text-chef-cream">Kitchen alerts</Text>
                  <Text className="mt-3 text-chef-base leading-7 text-chef-muted">{subtitle}</Text>
                </View>
                <View className="h-12 w-12 items-center justify-center rounded-chef border border-chef-line bg-chef-panel">
                  <Bell stroke={colors.saffron} size={22} strokeWidth={2.4} />
                </View>
              </View>

              <View className="mt-6 flex-row items-center justify-between rounded-chef border border-chef-line bg-chef-panel px-4 py-4">
                <View>
                  <Text className="text-chef-2xl font-extrabold text-chef-cream">{String(unreadCount)}</Text>
                  <Text className="mt-1 text-chef-xs font-extrabold uppercase text-chef-muted">Unread</Text>
                </View>
                <Pressable
                  className="h-11 flex-row items-center justify-center rounded-chef bg-chef-saffron px-4"
                  disabled={unreadCount === 0 || isMarkingAll}
                  onPress={handleMarkAllRead}
                  style={{ opacity: unreadCount === 0 ? 0.55 : 1 }}
                >
                  {isMarkingAll ? (
                    <ActivityIndicator color={colors.background} size="small" />
                  ) : (
                    <>
                      <CheckCheck stroke={colors.background} size={17} />
                      <Text className="ml-2 text-chef-sm font-extrabold text-chef-black">Mark all read</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <View className="px-6">
              <NotificationRow
                isUpdating={updatingNotificationIds.has(item.id)}
                notification={item}
                onMarkRead={handleMarkRead}
                onOpen={handleOpen}
              />
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </View>
  );
}
