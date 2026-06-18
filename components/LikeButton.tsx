import { Heart } from "lucide-react-native";
import { useEffect, useRef } from "react";
import { ActivityIndicator, Animated, Pressable, Text, View } from "react-native";

import { colors } from "@/constants/theme";

type LikeButtonProps = {
  recipeId: string;
  isLiked: boolean;
  likesCount: number;
  isLoading?: boolean;
  onLike: (recipeId: string) => void;
  showCount?: boolean;
  variant?: "pill" | "header";
};

export function LikeButton({
  recipeId,
  isLiked,
  likesCount,
  isLoading = false,
  onLike,
  showCount = true,
  variant = "pill"
}: LikeButtonProps) {
  const heartScale = useRef(new Animated.Value(1)).current;

  function animateHeart() {
    Animated.sequence([
      Animated.spring(heartScale, {
        toValue: 1.25,
        useNativeDriver: true,
        speed: 34,
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

  if (variant === "header") {
    return (
      <Animated.View style={{ transform: [{ scale: heartScale }] }}>
        <Pressable
          className="h-11 w-11 items-center justify-center rounded-full bg-chef-saffron"
          disabled={isLoading}
          onPress={() => {
            animateHeart();
            onLike(recipeId);
          }}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.background} size="small" />
          ) : (
            <Heart fill={isLiked ? colors.background : "transparent"} stroke={colors.background} size={21} strokeWidth={2.4} />
          )}
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Pressable
      className="flex-row items-center rounded-full bg-chef-saffron/15 px-3 py-2"
      disabled={isLoading}
      onPress={(event) => {
        event.stopPropagation();
        animateHeart();
        onLike(recipeId);
      }}
    >
      <Animated.View style={{ transform: [{ scale: heartScale }] }}>
        {isLoading ? (
          <ActivityIndicator color={colors.saffron} size="small" />
        ) : (
          <Heart fill={isLiked ? colors.saffron : "transparent"} stroke={colors.saffron} size={16} strokeWidth={2} />
        )}
      </Animated.View>
      {showCount ? (
        <Text className="ml-2 text-chef-sm font-bold text-chef-saffron">
          {String(likesCount)}
        </Text>
      ) : null}
    </Pressable>
  );
}
