import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { AppTabs } from "./AppTabs";
import { AuthNavigator } from "./AuthNavigator";
import { AddMedicationScreen } from "../screens/core/AddMedicationScreen";
import { EmergencySupportScreen } from "../screens/core/EmergencySupportScreen";
import { ReminderScreen } from "../screens/core/ReminderScreen";
import { OnboardingScreen } from "../screens/onboarding/OnboardingScreen";
import { SplashScreen } from "../screens/system/SplashScreen";
import type { RootStackParamList } from "../types/navigation";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen component={SplashScreen} name="Splash" />
      <Stack.Screen component={OnboardingScreen} name="Onboarding" />
      <Stack.Screen component={AuthNavigator} name="Auth" />
      <Stack.Screen component={AppTabs} name="MainTabs" />
      <Stack.Screen component={AddMedicationScreen} name="AddMedication" />
      <Stack.Screen component={ReminderScreen} name="Reminder" />
      <Stack.Screen component={EmergencySupportScreen} name="EmergencySupport" />
    </Stack.Navigator>
  );
}
