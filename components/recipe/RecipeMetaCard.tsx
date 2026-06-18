import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

type RecipeMetaCardProps = {
  icon: ReactNode;
  label: string;
  value: string;
  onPress?: () => void;
};

export function RecipeMetaCard({ icon, label, value, onPress }: RecipeMetaCardProps) {
  const displayValue = String(value ?? "");

  const content = (
    <>
      <View className="mb-3 h-9 w-9 items-center justify-center rounded-full bg-chef-saffron/15">{icon}</View>
      <Text className="text-chef-xs font-extrabold uppercase text-chef-muted">{label}</Text>
      <Text className="mt-1 text-chef-sm font-extrabold text-chef-cream" numberOfLines={2}>
        {displayValue}
      </Text>
    </>
  );

  if (onPress) {
    return (
      <Pressable className="flex-1 rounded-chef border border-chef-line bg-chef-panel px-3 py-4" onPress={onPress}>
        {content}
      </Pressable>
    );
  }

  return (
    <View className="flex-1 rounded-chef border border-chef-line bg-chef-panel px-3 py-4">
      {content}
    </View>
  );
}
