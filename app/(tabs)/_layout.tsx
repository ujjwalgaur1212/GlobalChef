import { Redirect, Tabs } from "expo-router";
import { ChefHat, House, PlusCircle, Search, UserRound, UsersRound } from "lucide-react-native";

import { LoadingScreen } from "@/components/LoadingScreen";
import { colors } from "@/constants/theme";
import { useAuth } from "@/hooks/useAuth";

export default function TabsLayout() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

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
          height: 86,
          paddingBottom: 24,
          paddingTop: 10
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <House stroke={color} size={size} strokeWidth={2.3} />
        }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          title: "Upload",
          tabBarIcon: ({ color, size }) => <PlusCircle stroke={color} size={size} strokeWidth={2.3} />
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color, size }) => <Search stroke={color} size={size} strokeWidth={2.3} />
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: "Community",
          tabBarIcon: ({ color, size }) => <UsersRound stroke={color} size={size} strokeWidth={2.3} />
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) =>
            user.photoURL ? <UserRound stroke={color} size={size} strokeWidth={2.3} /> : <ChefHat stroke={color} size={size} strokeWidth={2.3} />
        }}
      />
    </Tabs>
  );
}
