import { LinearGradient } from "expo-linear-gradient";
import { Clock3, Heart, MessageCircle } from "lucide-react-native";
import { useRef } from "react";
import { Animated, ImageBackground, Pressable, Text, View } from "react-native";

import { colors } from "@/constants/theme";
import type { Recipe } from "@/types/recipe";

type TrendingRecipeCardProps = {
  recipe: Recipe;
  onPress?: (recipeId: string) => void;
};

export function TrendingRecipeCard({ recipe, onPress }: TrendingRecipeCardProps) {
  const recipeId = String(recipe.id ?? "");
  const imageUrl = String(recipe.imageUrl ?? "");
  const country = String(recipe.country ?? "");
  const title = String(recipe.title ?? "");
  const likes = Number.isFinite(Number(recipe.likes)) ? Number(recipe.likes) : 0;
  const cookTime = String(recipe.cookTime ?? "");
  const commentsCount = Number.isFinite(Number(recipe.commentsCount)) ? Number(recipe.commentsCount) : 0;
  const scale = useRef(new Animated.Value(1)).current;

  function animate(toValue: number) {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      speed: 30,
      bounciness: 7
    }).start();
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable onPress={() => onPress?.(recipeId)} onPressIn={() => animate(0.97)} onPressOut={() => animate(1)}>
        <ImageBackground source={{ uri: imageUrl }} className="mr-4 h-44 w-64 overflow-hidden rounded-chef" resizeMode="cover">
          <LinearGradient colors={["rgba(14,17,17,0.08)", "rgba(14,17,17,0.86)"]} className="flex-1 justify-end p-4">
            <View className="mb-3 self-start rounded-full bg-chef-saffron px-3 py-1">
              <Text className="text-chef-xs font-extrabold uppercase text-chef-black">{country}</Text>
            </View>
            <Text className="text-chef-lg font-extrabold text-chef-cream" numberOfLines={1}>
              {title}
            </Text>
            <View className="mt-2 flex-row items-center">
              <Heart stroke={colors.saffron} size={14} />
              <Text className="ml-1 mr-4 text-chef-xs font-bold text-chef-cream">{String(likes)}</Text>
              <Clock3 stroke={colors.textMuted} size={14} />
              <Text className="ml-1 mr-4 text-chef-xs font-bold text-chef-muted">{cookTime}</Text>
              <MessageCircle stroke={colors.textMuted} size={14} />
              <Text className="ml-1 text-chef-xs font-bold text-chef-muted">{String(commentsCount)}</Text>
            </View>
          </LinearGradient>
        </ImageBackground>
      </Pressable>
    </Animated.View>
  );
}
