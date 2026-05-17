import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useAuthStore } from "../../store/useAuthStore";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "Splash">;

export function SplashScreen({ navigation }: Props) {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const hasCompletedOnboarding = useAuthStore((state) => state.hasCompletedOnboarding);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const timeout = setTimeout(() => {
      if (!hasCompletedOnboarding) {
        navigation.replace("Onboarding");
        return;
      }

      navigation.replace(user ? "MainTabs" : "Auth");
    }, 650);

    return () => clearTimeout(timeout);
  }, [hasCompletedOnboarding, isLoading, navigation, user]);

  return (
    <View className="flex-1 items-center justify-center bg-[#F6FBF8] px-8 dark:bg-[#0F171D]">
      <View className="h-24 w-24 items-center justify-center rounded-[28px] bg-care-mint">
        <Text className="text-[44px] font-black text-care-leaf">C</Text>
      </View>
      <Text className="mt-6 text-care-2xl font-bold text-care-ink dark:text-white">CareDose</Text>
      <Text className="mt-2 text-center text-care-base text-care-muted dark:text-[#A7B0BA]">Medicine care, made simple.</Text>
      <ActivityIndicator className="mt-8" color="#2F8C67" size="large" />
    </View>
  );
}
