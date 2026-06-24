import { Redirect, Tabs, useRouter } from "expo-router";
import { Bell, Calendar, ChefHat, House, PlusCircle, Search, UserRound, UsersRound } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LoadingScreen } from "@/components/LoadingScreen";
import { TarzanButton } from "@/components/TarzanButton";
import { colors } from "@/constants/theme";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";

export default function TabsLayout() {
  const { t } = useTranslation();
  const { user, initializing } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { unreadCount } = useNotifications(user?.id);

  if (initializing) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  const paddingBottom = Math.max(insets.bottom, 24);
  const height = 62 + paddingBottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.saffron,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "700"
        },
        tabBarStyle: {
          backgroundColor: colors.panel,
          borderTopColor: colors.line,
          height,
          paddingBottom,
          paddingTop: 10
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.home"),
          tabBarIcon: ({ color, size }) => <House stroke={color} size={size} strokeWidth={2.3} />
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          href: null,
          title: t("tabs.search"),
          tabBarIcon: ({ color, size }) => <Search stroke={color} size={size} strokeWidth={2.3} />
        }}
      />
      <Tabs.Screen
        name="mealplanner"
        options={{
          title: t("tabs.mealPlanner", "Planner"),
          tabBarIcon: ({ color, size }) => <Calendar stroke={color} size={size} strokeWidth={2.3} />
        }}
      />
      <Tabs.Screen
        name="tarzan"
        options={{
          title: "Tarzan",
          tabBarStyle: { display: "none" },
          tabBarButton: (props) => (
            <TarzanButton
              onPress={() => {
                console.log("Chef button pressed");
                console.log("Chef intro state enabled");
                console.log("Navigating to Chef Chat");
                console.log("Current target route: /tarzan");
                router.push("/tarzan");
              }}
            />
          )
        }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          title: t("tabs.upload"),
          tabBarIcon: ({ color, size }) => <PlusCircle stroke={color} size={size} strokeWidth={2.3} />
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.profile"),
          tabBarIcon: ({ color, size }) =>
            user.photoURL ? <UserRound stroke={color} size={size} strokeWidth={2.3} /> : <ChefHat stroke={color} size={size} strokeWidth={2.3} />
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          href: null
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
          title: t("tabs.alerts", "Alerts"),
          tabBarIcon: ({ color, size }) => <Bell stroke={color} size={size} strokeWidth={2.3} />,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.saffron,
            color: colors.background,
            fontSize: 10,
            fontWeight: "700"
          }
        }}
      />
    </Tabs>
  );
}
