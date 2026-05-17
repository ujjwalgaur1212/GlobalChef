import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { CalendarDays, Home, UsersRound, UserRound } from "lucide-react-native";

import { FamilyDashboardScreen } from "../screens/core/FamilyDashboardScreen";
import { HomeDashboardScreen } from "../screens/core/HomeDashboardScreen";
import { ProfileSettingsScreen } from "../screens/core/ProfileSettingsScreen";
import { ScheduleScreen } from "../screens/core/ScheduleScreen";
import type { MainTabParamList } from "../types/navigation";

const Tab = createBottomTabNavigator<MainTabParamList>();

export function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#2F8C67",
        tabBarInactiveTintColor: "#7E8B96",
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: "700",
          marginTop: 2
        },
        tabBarStyle: {
          borderTopWidth: 0,
          elevation: 0,
          height: 84,
          paddingBottom: 16,
          paddingTop: 10
        }
      }}
    >
      <Tab.Screen
        component={HomeDashboardScreen}
        name="Home"
        options={{ tabBarIcon: ({ color }) => <Home color={color} size={24} /> }}
      />
      <Tab.Screen
        component={ScheduleScreen}
        name="Schedule"
        options={{ tabBarIcon: ({ color }) => <CalendarDays color={color} size={24} /> }}
      />
      <Tab.Screen
        component={FamilyDashboardScreen}
        name="Family"
        options={{ tabBarIcon: ({ color }) => <UsersRound color={color} size={24} /> }}
      />
      <Tab.Screen
        component={ProfileSettingsScreen}
        name="Profile"
        options={{ tabBarIcon: ({ color }) => <UserRound color={color} size={24} /> }}
      />
    </Tab.Navigator>
  );
}
