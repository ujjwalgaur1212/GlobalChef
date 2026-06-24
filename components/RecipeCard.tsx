import { LinearGradient } from "expo-linear-gradient";
import { Bookmark, MessageCircle, Heart, Send } from "lucide-react-native";
import { useEffect, useRef, useState, useMemo } from "react";
import { ActivityIndicator, Animated, Image, Pressable, Text, View, Share } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

import { colors } from "@/constants/theme";
import type { Recipe } from "@/types/recipe";
import { getUserProfile } from "@/services/userService";
import { trackRecipeShare } from "@/services/recipeService";

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
  onCommentPress?: (recipeId: string, recipeTitle: string) => void;
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
  onSave,
  onCommentPress
}: RecipeCardProps) {
  const router = useRouter();
  const recipeId = String(recipe.id ?? "");
  const title = String(recipe.title ?? "");
  const country = String(recipe.country ?? "");
  const cuisine = String(recipe.cuisine ?? "");
  const imageUrl = String(recipe.imageUrl ?? "");
  const authorName = String(recipe.authorName ?? "HiChef Creator");

  const commentsCount = Number.isFinite(Number(recipe.commentsCount)) ? Number(recipe.commentsCount) : 0;
  const likes = Number.isFinite(Number(recipe.likes)) ? Number(recipe.likes) : 0;
  const likeLoading = !!isLikeLoading;
  const saveLoading = !!isSaveLoading;
  const liked = !!isLiked;
  const saved = !!isSaved;

  // Animations
  const entrance = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const heartScale = useRef(new Animated.Value(1)).current;
  const bookmarkScale = useRef(new Animated.Value(1)).current;
  const heartPopScale = useRef(new Animated.Value(0)).current;

  // States
  const [showHeartPop, setShowHeartPop] = useState(false);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [authorUsername, setAuthorUsername] = useState("");

  useEffect(() => {
    if (recipe.authorId) {
      getUserProfile(recipe.authorId)
        .then((profile) => {
          if (profile?.username) {
            setAuthorUsername(profile.username);
          }
        })
        .catch(() => undefined);
    }
  }, [recipe.authorId]);
  const [cooked, setCooked] = useState(false);
  const [wantToTry, setWantToTry] = useState(false);

  // Deterministic starting cooked count based on recipe likes + 4
  const baseCookedCount = useMemo(() => (likes || 0) + 4, [likes]);
  const [cookedCount, setCookedCount] = useState(baseCookedCount);

  // Double-tap tracker
  const lastTap = useRef<number>(0);

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 420,
      delay: Math.min(index * 70, 420),
      useNativeDriver: true
    }).start();
  }, [entrance, index]);

  // Load local engagement states
  useEffect(() => {
    async function loadEngagementStates() {
      try {
        const storedCooked = await AsyncStorage.getItem(`@cooked_${recipeId}`);
        const storedWant = await AsyncStorage.getItem(`@want_to_try_${recipeId}`);
        if (storedCooked !== null) {
          const isCooked = storedCooked === "true";
          setCooked(isCooked);
          setCookedCount(isCooked ? baseCookedCount + 1 : baseCookedCount);
        }
        if (storedWant !== null) {
          setWantToTry(storedWant === "true");
        }
      } catch (e) {
        console.error("Failed to load engagement states:", e);
      }
    }
    loadEngagementStates();
  }, [recipeId, baseCookedCount]);

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
        toValue: 1.3,
        useNativeDriver: true,
        speed: 34,
        bounciness: 8
      }),
      Animated.spring(heartScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 30
      })
    ]).start();
  }

  function animateBookmark() {
    Animated.sequence([
      Animated.spring(bookmarkScale, {
        toValue: 1.3,
        useNativeDriver: true,
        speed: 34,
        bounciness: 8
      }),
      Animated.spring(bookmarkScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 30
      })
    ]).start();
  }

  const handleImagePress = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      handleDoubleTap();
    } else {
      // Small timeout to allow double-tap to interrupt single-tap if needed
      setTimeout(() => {
        if (Date.now() - lastTap.current >= 300) {
          onPress?.(recipeId);
        }
      }, 300);
    }
    lastTap.current = now;
  };

  const handleDoubleTap = () => {
    if (!liked) {
      onLike?.(recipeId);
      animateHeart();
    }
    setShowHeartPop(true);
    heartPopScale.setValue(0);
    Animated.sequence([
      Animated.spring(heartPopScale, {
        toValue: 1.3,
        useNativeDriver: true,
        bounciness: 12,
        speed: 24
      }),
      Animated.delay(400),
      Animated.timing(heartPopScale, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true
      })
    ]).start(() => {
      setShowHeartPop(false);
    });
  };

  const handleShare = async () => {
    try {
      const usernameDisplay = authorUsername ? `@${authorUsername}` : recipe.authorName;
      const cleanDesc = recipe.description ? `\n\n"${recipe.description}"` : "";
      const shareMessage = `🍳 Check out "${recipe.title}" by ${usernameDisplay} on HiChef!${cleanDesc}\n\nDeep Link: globalchef://recipe/${recipe.id}\nWeb Link: https://globalchef.app/recipe/${recipe.id}`;

      const result = await Share.share({
        title: recipe.title,
        message: shareMessage,
      });

      if (result.action === Share.sharedAction) {
        await trackRecipeShare(recipe.id);
      }
    } catch (err) {
      console.error("Error sharing recipe:", err);
    }
  };

  const handleCookedPress = async () => {
    try {
      const nextState = !cooked;
      setCooked(nextState);
      setCookedCount(prev => nextState ? prev + 1 : prev - 1);
      await AsyncStorage.setItem(`@cooked_${recipeId}`, String(nextState));
    } catch (e) {
      console.error("Failed to save cooked state:", e);
    }
  };

  const handleWantToTryPress = async () => {
    try {
      const nextState = !wantToTry;
      setWantToTry(nextState);
      await AsyncStorage.setItem(`@want_to_try_${recipeId}`, String(nextState));
    } catch (e) {
      console.error("Failed to save want-to-try state:", e);
    }
  };

  // Deterministic cook time and difficulty
  const cookTime = useMemo(() => {
    const ingredientVal = Array.isArray(recipe.ingredients) ? recipe.ingredients.length : 5;
    const stepVal = Array.isArray(recipe.steps) ? recipe.steps.length : 4;
    return `${ingredientVal * 2 + stepVal * 3 + 10}m`;
  }, [recipe.ingredients, recipe.steps]);

  const difficulty = useMemo(() => {
    const ingredientCount = Array.isArray(recipe.ingredients) ? recipe.ingredients.length : 5;
    return ingredientCount > 8 ? "Medium" : "Easy";
  }, [recipe.ingredients]);

  // Deterministic creator avatar initials
  const initials = useMemo(() => {
    if (!authorName) return "HC";
    return authorName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [authorName]);

  // Deterministic comments based on recipe title to keep them realistic
  const commentsPreview = useMemo(() => {
    const firstLettersSum = title.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    const commenters = [
      { name: "chef_cynthia" },
      { name: "foodie_dan" },
      { name: "baking_queen" },
      { name: "gordon_fans" },
      { name: "spice_master" }
    ];

    const commentTexts = [
      `Wow! This looks absolutely incredible. Can't wait to make it! 😍`,
      `Made this for dinner tonight, and it was a massive hit. Recommended! 🌟`,
      `Would this work well with gluten-free ingredients? looks delicious.`,
      `A perfect blend of spices. My family polished off the entire dish! 🍛`,
      `Simple instructions, wonderful results. Thanks for sharing this chef! 🙌`
    ];

    const idx1 = firstLettersSum % commenters.length;
    const idx2 = (firstLettersSum + 2) % commenters.length;

    const comm1 = {
      username: commenters[idx1].name,
      text: commentTexts[idx1]
    };
    const comm2 = {
      username: commenters[idx2].name,
      text: commentTexts[idx2]
    };

    return [comm1, comm2];
  }, [title]);

  const displayDescription = useMemo(() => {
    if (!recipe.description) return "";
    const hasLongDescription = recipe.description.length > 95;
    return isDescExpanded || !hasLongDescription
      ? recipe.description
      : `${recipe.description.slice(0, 95)}...`;
  }, [recipe.description, isDescExpanded]);

  const hasLongDescription = recipe.description && recipe.description.length > 95;

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
      <Pressable 
        onPressIn={() => animateScale(0.985)} 
        onPressOut={() => animateScale(1)}
        className="mb-8 overflow-hidden rounded-chef border border-chef-line bg-chef-charcoal"
      >
        {/* 1. Large Edge-to-Edge Image (Hero Element) */}
        <View className="relative w-full overflow-hidden" style={{ aspectRatio: 4 / 5 }}>
          <Pressable onPress={handleImagePress} className="w-full h-full">
            <Image 
              source={{ uri: imageUrl || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c" }} 
              className="w-full h-full"
              resizeMode="cover"
            />
          </Pressable>

          {/* Floating Chips Overlay (Cook Time, Difficulty) */}
          <View className="absolute top-4 left-4 flex-row items-center gap-2">
            <View className="flex-row items-center rounded-full bg-chef-black/60 px-3 py-1.5 border border-chef-line/40">
              <Text className="text-chef-xs font-extrabold text-chef-cream">⏱️ {cookTime}</Text>
            </View>
            <View className="flex-row items-center rounded-full bg-chef-black/60 px-3 py-1.5 border border-chef-line/40">
              <Text className="text-chef-xs font-extrabold text-chef-cream">🔥 {difficulty}</Text>
            </View>
          </View>

          {/* Gradient Overlay for Readability */}
          <LinearGradient 
            colors={["transparent", "rgba(14,17,17,0.85)"]} 
            className="absolute bottom-0 left-0 right-0 h-32"
          />

          {/* Double-tap pop-up heart zoom overlay */}
          {showHeartPop && (
            <Animated.View 
              style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                justifyContent: 'center',
                alignItems: 'center',
                transform: [{ scale: heartPopScale }]
              }}
              pointerEvents="none"
            >
              <Heart fill={colors.tomato} stroke={colors.tomato} size={80} />
            </Animated.View>
          )}
        </View>

        {/* 2. Creator Row */}
        <Pressable
          className="flex-row items-center justify-between px-4 pt-4 pb-2 active:opacity-75"
          onPress={() => {
            if (recipe.authorId) {
              router.push({
                pathname: "/chef/[id]",
                params: { id: recipe.authorId }
              });
            }
          }}
        >
          <View className="flex-row items-center flex-1 pr-4">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-chef-saffron/10 border border-chef-saffron/30 mr-3">
              <Text className="text-chef-sm font-extrabold text-chef-saffron">{initials}</Text>
            </View>
            <View className="flex-1">
              <View className="flex-row items-center">
                <Text className="text-chef-base font-extrabold text-chef-cream mr-1.5" numberOfLines={1}>{authorName}</Text>
                <View className="h-4 w-4 items-center justify-center rounded-full bg-chef-saffron">
                  <Text className="text-[9px] font-black text-chef-black">✓</Text>
                </View>
              </View>
              <Text className="text-chef-xs text-chef-muted mt-0.5" numberOfLines={1}>
                {cuisine ? `${cuisine} Cuisine` : "Global Chef"} • {country || "Culinary World"}
              </Text>
            </View>
          </View>
        </Pressable>

        {/* 3. Recipe Title */}
        <View className="px-4 pt-1">
          <Text className="text-[22px] font-extrabold text-chef-cream leading-7">{title}</Text>
        </View>

        {/* 4. Short Description with Read More */}
        {recipe.description ? (
          <View className="px-4 pt-2 pb-1">
            <Text className="text-chef-sm font-medium text-chef-muted leading-5">
              {displayDescription}{' '}
              {hasLongDescription && !isDescExpanded && (
                <Text 
                  onPress={() => setIsDescExpanded(true)}
                  className="text-chef-saffron font-extrabold text-chef-xs"
                >
                  Read More
                </Text>
              )}
            </Text>
          </View>
        ) : null}

        {/* 5. Instagram Action Row */}
        <View className="flex-row items-center justify-between px-4 py-3.5 border-t border-b border-chef-line/20 mt-3">
          <View className="flex-row items-center gap-5">
            {/* Heart Button */}
            <Pressable 
              disabled={likeLoading}
              onPress={() => {
                animateHeart();
                onLike?.(recipeId);
              }}
              className="active:opacity-75"
            >
              <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                <Heart 
                  fill={liked ? colors.tomato : "transparent"} 
                  stroke={liked ? colors.tomato : colors.cream} 
                  size={24} 
                  strokeWidth={2}
                />
              </Animated.View>
            </Pressable>

            {/* Comment Button */}
            <Pressable 
              onPress={() => onCommentPress ? onCommentPress(recipeId, title) : onPress?.(recipeId)} 
              className="active:opacity-75"
            >
              <MessageCircle stroke={colors.cream} size={24} strokeWidth={2} />
            </Pressable>

            {/* Share Button */}
            <Pressable onPress={handleShare} className="active:opacity-75">
              <Send stroke={colors.cream} size={22} strokeWidth={2} />
            </Pressable>
          </View>

          {/* Bookmark Button */}
          <Pressable
            disabled={saveLoading}
            onPress={() => {
              animateBookmark();
              onSave?.(recipeId);
            }}
            className="active:opacity-75"
          >
            <Animated.View style={{ transform: [{ scale: bookmarkScale }] }}>
              {saveLoading ? (
                <ActivityIndicator size="small" color={colors.saffron} />
              ) : (
                <Bookmark 
                  fill={saved ? colors.saffron : "transparent"} 
                  stroke={saved ? colors.saffron : colors.cream} 
                  size={24} 
                  strokeWidth={2}
                />
              )}
            </Animated.View>
          </Pressable>
        </View>

        {/* Natural Counts Row */}
        <View className="px-4 pt-3 flex-row items-center gap-4">
          <Text className="text-chef-sm font-extrabold text-chef-cream">
            {likes + (liked && !isLiked ? 1 : 0)} likes
          </Text>
          {recipe.sharesCount > 0 && (
            <Text className="text-chef-sm font-extrabold text-chef-cream">
              {recipe.sharesCount} shares
            </Text>
          )}
        </View>

        {/* 6. Quick Engagement Row */}
        <View className="flex-row items-center gap-3 px-4 py-3">
          <Pressable
            onPress={handleCookedPress}
            className={`flex-1 flex-row items-center justify-center rounded-chef py-2.5 px-3 border ${
              cooked ? 'bg-chef-herb/15 border-chef-herb' : 'bg-chef-panel border-chef-line/60'
            }`}
          >
            <Text className={`mr-1 text-chef-xs font-extrabold ${cooked ? 'text-chef-herb' : 'text-chef-muted'}`}>✓</Text>
            <Text className={`text-chef-xs font-extrabold ${cooked ? 'text-chef-herb' : 'text-chef-muted'}`}>
              Cooked This ({cookedCount})
            </Text>
          </Pressable>

          <Pressable
            onPress={handleWantToTryPress}
            className={`flex-1 flex-row items-center justify-center rounded-chef py-2.5 px-3 border ${
              wantToTry ? 'bg-chef-saffron/15 border-chef-saffron' : 'bg-chef-panel border-chef-line/60'
            }`}
          >
            <Text className={`mr-1 text-chef-xs font-extrabold ${wantToTry ? 'text-chef-saffron' : 'text-chef-muted'}`}>⭐</Text>
            <Text className={`text-chef-xs font-extrabold ${wantToTry ? 'text-chef-saffron' : 'text-chef-muted'}`}>
              Want To Try
            </Text>
          </Pressable>
        </View>

        {/* 7. Comments Preview */}
        <View className="px-4 pb-4 pt-1">
          {commentsPreview.map((comment, index) => (
            <View key={index} className="flex-row items-start mt-1">
              <Text className="text-chef-sm font-extrabold text-chef-cream mr-1.5">
                {comment.username}
              </Text>
              <Text className="text-chef-sm text-chef-muted flex-1 leading-4">
                {comment.text}
              </Text>
            </View>
          ))}
          {commentsCount > 2 && (
            <Pressable onPress={() => onPress?.(recipeId)} className="mt-2">
              <Text className="text-chef-xs font-bold text-chef-saffron">
                View all {commentsCount} comments
              </Text>
            </Pressable>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}
