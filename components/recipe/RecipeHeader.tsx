import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft, Bookmark, Share2 } from "lucide-react-native";
import { useEffect, useRef, type ReactNode } from "react";
import { ActivityIndicator, Animated, ImageBackground, Pressable, Text, View } from "react-native";

import { LikeButton } from "@/components/LikeButton";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/constants/theme";

type HeaderActionButtonProps = {
  children: ReactNode;
  disabled?: boolean;
  isPrimary?: boolean;
  onPress: () => void;
};

type RecipeHeaderProps = {
  chefName: string;
  country: string;
  cuisine: string;
  imageUrl: string;
  isBookmarked: boolean;
  isLiked: boolean;
  isLiking: boolean;
  isSaving: boolean;
  onBack: () => void;
  onLike: () => void;
  onSave: () => void;
  onShare: () => void;
  title: string;
};

function HeaderActionButton({ children, disabled = false, isPrimary = false, onPress }: HeaderActionButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const isDisabled = !!disabled;

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
      <Pressable
        className={`h-11 w-11 items-center justify-center rounded-full ${isPrimary ? "bg-chef-saffron" : "bg-chef-black/70"}`}
        disabled={!!isDisabled}
        onPress={onPress}
        onPressIn={() => animate(0.94)}
        onPressOut={() => animate(1)}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

export function RecipeHeader({
  chefName,
  country,
  cuisine,
  imageUrl,
  isBookmarked,
  isLiked,
  isLiking,
  isSaving,
  onBack,
  onLike,
  onSave,
  onShare,
  title
}: RecipeHeaderProps) {
  const imageOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(imageOpacity, {
      toValue: 1,
      duration: 420,
      useNativeDriver: true
    }).start();
  }, [imageOpacity]);

  const overlay = (
    <LinearGradient colors={["rgba(14,17,17,0.18)", "rgba(14,17,17,0.22)", colors.background]} className="flex-1 justify-between px-6">
      <SafeAreaView edges={["top"]}>
        <View className="mt-2 flex-row items-center justify-between">
          <HeaderActionButton onPress={onBack}>
            <ArrowLeft stroke={colors.cream} size={22} strokeWidth={2.4} />
          </HeaderActionButton>

          <View className="flex-row gap-3">
            <HeaderActionButton onPress={onShare}>
              <Share2 stroke={colors.cream} size={20} strokeWidth={2.4} />
            </HeaderActionButton>
            <HeaderActionButton disabled={!!isSaving} onPress={onSave}>
              {isSaving ? (
                <ActivityIndicator color={colors.saffron} size="small" />
              ) : (
                <Bookmark
                  fill={isBookmarked ? colors.saffron : "transparent"}
                  stroke={isBookmarked ? colors.saffron : colors.cream}
                  size={20}
                  strokeWidth={2.4}
                />
              )}
            </HeaderActionButton>
            <LikeButton
              recipeId=""
              isLiked={isLiked}
              likesCount={0}
              isLoading={isLiking}
              onLike={onLike}
              showCount={false}
              variant="header"
            />
          </View>
        </View>
      </SafeAreaView>

      <View className="pb-8">
        <View className="mb-4 flex-row flex-wrap gap-2">
          <View className="rounded-full bg-chef-saffron px-3 py-2">
            <Text className="text-chef-xs font-extrabold uppercase text-chef-black">{country || "Global"}</Text>
          </View>
          <View className="rounded-full bg-chef-black/70 px-3 py-2">
            <Text className="text-chef-xs font-extrabold uppercase text-chef-cream">{cuisine || "Chef's choice"}</Text>
          </View>
        </View>
        <Text className="text-[36px] font-extrabold leading-[42px] text-chef-cream">{title || "Untitled recipe"}</Text>
        <Text className="mt-3 text-chef-sm font-bold uppercase text-chef-saffron">By {chefName}</Text>
      </View>
    </LinearGradient>
  );

  return (
    <Animated.View className="h-[430px] overflow-hidden" style={{ opacity: imageOpacity }}>
      {imageUrl ? (
        <ImageBackground source={{ uri: imageUrl }} className="flex-1" resizeMode="cover">
          {overlay}
        </ImageBackground>
      ) : (
        <View className="flex-1 bg-chef-panel">{overlay}</View>
      )}
    </Animated.View>
  );
}
