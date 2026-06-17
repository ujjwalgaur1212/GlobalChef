import { LinearGradient } from "expo-linear-gradient";
import { Bookmark, Heart, MessageCircle, Utensils } from "lucide-react-native";
import { useEffect, useRef } from "react";
import { ActivityIndicator, Animated, ImageBackground, Pressable, Text, View } from "react-native";

import { colors } from "@/constants/theme";
import type { Recipe } from "@/types/recipe";

type RecipeCardProps = {
  recipe: Recipe;
  index?: number;
  isLiked?: boolean;
  isLikeLoading?: boolean;
  isSaved?: boolean;
  isSaveLoading?: boolean;
  onLike?: (recipeId: string) => void;
  onPress?: (recipeId: string) => void;
  onSave?: (recipeId: string) => void;
};

export function RecipeCard({
  recipe,
  index = 0,
  isLiked = false,
  isLikeLoading = false,
  isSaved = false,
  isSaveLoading = false,
  onLike,
  onPress,
  onSave
}: RecipeCardProps) {
  const recipeId = String(recipe.id ?? "");
  const title = String(recipe.title ?? "");
  const country = String(recipe.country ?? "");
  const cuisine = String(recipe.cuisine ?? "");
  const imageUrl = String(recipe.imageUrl ?? "");

  const commentsCount = Number.isFinite(Number(recipe.commentsCount)) ? Number(recipe.commentsCount) : 0;
  const likes = Number.isFinite(Number(recipe.likes)) ? Number(recipe.likes) : 0;
  const ingredientsCount = Array.isArray(recipe.ingredients) ? recipe.ingredients.length : 0;
  const stepsCount = Array.isArray(recipe.steps) ? recipe.steps.length : 0;
  const likeLoading = !!isLikeLoading;
  const saveLoading = !!isSaveLoading;
  const liked = !!isLiked;
  const saved = !!isSaved;
  const entrance = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const heartScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 420,
      delay: Math.min(index * 70, 420),
      useNativeDriver: true
    }).start();
  }, [entrance, index]);

  function animateScale(toValue: number) {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      speed: 28,
      bounciness: 6
    }).start();
  }

  function animateHeart() {
    Animated.sequence([
      Animated.spring(heartScale, {
        toValue: 1.18,
        useNativeDriver: true,
        speed: 32,
        bounciness: 8
      }),
      Animated.spring(heartScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 30,
        bounciness: 7
      })
    ]).start();
  }

  return (
    <Animated.View
      style={{
        opacity: entrance,
        transform: [
          { scale },
          {
            translateY: entrance.interpolate({
              inputRange: [0, 1],
              outputRange: [18, 0]
            })
          }
        ]
      }}
    >
      <Pressable onPress={() => onPress?.(recipeId)} onPressIn={() => animateScale(0.98)} onPressOut={() => animateScale(1)}>
        <View className="overflow-hidden rounded-chef border border-chef-line bg-chef-panel">
          <ImageBackground source={{ uri: imageUrl }} className="h-56 justify-end overflow-hidden" resizeMode="cover">
            <LinearGradient colors={["rgba(14,17,17,0.04)", "rgba(14,17,17,0.88)"]} className="flex-1 justify-between p-4">
              <View className="flex-row justify-between">
                <View className="rounded-full bg-chef-black/70 px-3 py-2">
                  <Text className="text-chef-xs font-extrabold uppercase text-chef-saffron">{country}</Text>
                </View>
                <View className="flex-row items-center rounded-full bg-chef-black/70 px-3 py-2">
                  <Utensils stroke={colors.saffron} size={14} />
                  <Text className="ml-1 text-chef-xs font-extrabold text-chef-cream">{cuisine}</Text>
                </View>
              </View>

              <View>
                <Text className="text-[24px] font-extrabold leading-8 text-chef-cream">{title}</Text>
                <Text className="mt-1 text-chef-sm font-semibold text-chef-muted">
                  {String(ingredientsCount)} ingredients - {String(stepsCount)} steps
                </Text>
              </View>
            </LinearGradient>
          </ImageBackground>

          <View className="flex-row items-center justify-between px-4 py-4">

            <View className="flex-row items-center">
              <MessageCircle stroke={colors.textMuted} size={17} />
              <Text className="ml-2 text-chef-sm font-bold text-chef-cream">{String(commentsCount)}</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Pressable
                className="flex-row items-center rounded-full bg-chef-saffron/15 px-3 py-2"
                disabled={!!likeLoading}
                onPress={(event) => {
                  event.stopPropagation();
                  animateHeart();
                  onLike?.(recipeId);
                }}
              >
                <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                  {likeLoading ? (
                    <ActivityIndicator color={colors.saffron} size="small" />
                  ) : (
                    <Heart fill={liked ? colors.saffron : "transparent"} stroke={colors.saffron} size={16} />
                  )}
                </Animated.View>
                <Text className="ml-2 text-chef-sm font-bold text-chef-saffron">{String(likes)}</Text>
              </Pressable>
              <Pressable
                className="h-9 w-9 items-center justify-center rounded-full bg-chef-black/70"
                disabled={!!saveLoading}
                onPress={(event) => {
                  event.stopPropagation();
                  onSave?.(recipeId);
                }}
              >
                {saveLoading ? (
                  <ActivityIndicator color={colors.saffron} size="small" />
                ) : (
                  <Bookmark fill={saved ? colors.saffron : "transparent"} stroke={saved ? colors.saffron : colors.textMuted} size={16} />
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
