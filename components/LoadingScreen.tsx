import { ActivityIndicator, Text, View } from "react-native";

import { colors } from "@/constants/theme";

export function LoadingScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-chef-black px-8">
      <ActivityIndicator color={colors.saffron} size="large" />
      <Text className="mt-4 text-center text-chef-base font-semibold text-chef-cream">Preparing your kitchen...</Text>
    </View>
  );
}
