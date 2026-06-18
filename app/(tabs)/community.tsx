import { useRouter } from "expo-router";
import { Activity, ChefHat, Clock3, Heart, MessageCircle, Sparkles, UserPlus, UsersRound } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Animated, Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { RecipeCard } from "@/components/RecipeCard";
import { RecipeSkeletonList } from "@/components/RecipeSkeleton";
import { colors } from "@/constants/theme";
import { useAuth } from "@/hooks/useAuth";
import { useFollow } from "@/hooks/useFollow";
import { useRecipeInteractions } from "@/hooks/useRecipeInteractions";
import { useRecipes } from "@/hooks/useRecipes";
import { useToast } from "@/hooks/useToast";
import { subscribeToFollowingIds } from "@/services/followService";
import { subscribeToSuggestedChefs, subscribeToTrendingChefs } from "@/services/userService";
import type { Recipe } from "@/types/recipe";
import type { UserProfile } from "@/types/user";

type ChefCardProps = {
  chef: UserProfile;
  currentUserId: string;
  onOpenChef: (chefId: string) => void;
};

function formatActivityDate(date: Date | null) {
  if (!date) {
    return "Just now";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part.trim().slice(0, 1))
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function SectionTitle({ kicker, title }: { kicker?: string; title: string }) {
  return (
    <View className="mb-4 flex-row items-end justify-between">
      <View>
        {kicker ? <Text className="text-chef-xs font-extrabold uppercase text-chef-saffron">{kicker}</Text> : null}
        <Text className="mt-1 text-chef-xl font-extrabold text-chef-cream">{title}</Text>
      </View>
    </View>
  );
}

function ChefCard({ chef, currentUserId, onOpenChef }: ChefCardProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { isFollowing, isLoading, toggleFollow } = useFollow(currentUserId, chef.id);
  const scale = useRef(new Animated.Value(1)).current;
  const initials = getInitials(chef.displayName || "GlobalChef cook") || "GC";
  const isOwnProfile = chef.id === currentUserId;

  function animate(toValue: number) {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      speed: 30,
      bounciness: 7
    }).start();
  }

  async function handleFollow() {
    if (isOwnProfile) {
      return;
    }

    try {
      const result = await toggleFollow();
      showToast(result.isFollowing ? "Chef followed" : "Chef unfollowed", result.didChange ? "success" : "info");
    } catch (followError) {
      showToast(followError instanceof Error ? followError.message : "Could not update follow state.", "error");
    }
  }

  return (
    <Animated.View className="mr-4 w-72" style={{ transform: [{ scale }] }}>
      <Pressable onPress={() => onOpenChef(chef.id)} onPressIn={() => animate(0.98)} onPressOut={() => animate(1)}>
        <View className="rounded-chef border border-chef-line bg-chef-panel p-5">
          <View className="flex-row items-start justify-between">
            <View className="h-16 w-16 overflow-hidden rounded-chef bg-chef-saffron/15">
              {chef.photoURL ? (
                <Image className="h-full w-full" resizeMode="cover" source={{ uri: chef.photoURL }} />
              ) : (
                <View className="h-full w-full items-center justify-center">
                  <Text className="text-chef-lg font-extrabold text-chef-saffron">{initials}</Text>
                </View>
              )}
            </View>
            <View className="rounded-full bg-chef-black px-3 py-2">
              <Text className="text-chef-xs font-extrabold text-chef-muted">{t("community.chefCard.followersCount", { count: chef.followersCount })}</Text>
            </View>
          </View>

          <Text className="mt-5 text-chef-lg font-extrabold text-chef-cream" numberOfLines={1}>
            {chef.displayName || "GlobalChef cook"}
          </Text>
          <Text className="mt-1 text-chef-sm font-semibold text-chef-muted" numberOfLines={1}>
            {chef.country || chef.email || "GlobalChef member"}
          </Text>
          {chef.bio ? (
            <Text className="mt-3 min-h-10 text-chef-sm leading-5 text-chef-muted" numberOfLines={2}>
              {chef.bio}
            </Text>
          ) : null}

          <View className="mt-5 flex-row gap-3">
            <View className="flex-1 items-center justify-center rounded-chef bg-chef-black px-2 py-3">
              <Text numberOfLines={1} className="text-chef-lg font-extrabold text-chef-cream text-center">{String(chef.followersCount)}</Text>
              <Text numberOfLines={1} className="mt-1 text-chef-xs font-extrabold text-chef-muted text-center">{t("community.chefCard.followers")}</Text>
            </View>
            <View className="flex-1 items-center justify-center rounded-chef bg-chef-black px-2 py-3">
              <Text numberOfLines={1} className="text-chef-lg font-extrabold text-chef-cream text-center">{String(chef.followingCount)}</Text>
              <Text numberOfLines={1} className="mt-1 text-chef-xs font-extrabold text-chef-muted text-center">{t("community.chefCard.following")}</Text>
            </View>
          </View>

          {!isOwnProfile ? (
            <Pressable
              className={`mt-5 h-12 flex-row items-center justify-center rounded-chef border ${
                isFollowing ? "border-chef-line bg-chef-black" : "border-chef-saffron bg-chef-saffron"
              }`}
              disabled={!!isLoading}
              onPress={(event) => {
                event.stopPropagation();
                handleFollow();
              }}
            >
              {isLoading ? (
                <ActivityIndicator color={isFollowing ? colors.saffron : colors.background} />
              ) : (
                <>
                  <UserPlus stroke={isFollowing ? colors.saffron : colors.background} size={17} />
                  <Text className={`ml-2 text-chef-sm font-extrabold ${isFollowing ? "text-chef-saffron" : "text-chef-black"}`}>
                    {isFollowing ? t("search.following") : t("search.follow")}
                  </Text>
                </>
              )}
            </Pressable>
          ) : (
            <View className="mt-5 h-12 items-center justify-center rounded-chef border border-chef-line bg-chef-black">
              <Text className="text-chef-sm font-extrabold text-chef-muted">{t("community.chefCard.yourProfile")}</Text>
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

function EmptyPanel({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <View className="rounded-chef border border-chef-line bg-chef-panel px-5 py-7">
      <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-chef-saffron/15">{icon}</View>
      <Text className="text-chef-lg font-extrabold text-chef-cream">{title}</Text>
      <Text className="mt-2 text-chef-sm leading-6 text-chef-muted">{body}</Text>
    </View>
  );
}

export default function CommunityTab() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { recipes, isLoading: areRecipesLoading, error: recipeError } = useRecipes(user?.id);
  const { likedRecipeIds, savedRecipeIds, toggleLikedRecipeById, toggleSavedRecipeById } = useRecipeInteractions(user?.id);
  const [suggestedChefs, setSuggestedChefs] = useState<UserProfile[]>([]);
  const [trendingChefs, setTrendingChefs] = useState<UserProfile[]>([]);
  const [followedChefIds, setFollowedChefIds] = useState<Set<string>>(new Set());
  const [areChefsLoading, setAreChefsLoading] = useState(true);
  const [pendingLikeIds, setPendingLikeIds] = useState<Set<string>>(new Set());
  const [pendingSaveIds, setPendingSaveIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      setFollowedChefIds(new Set());
      return;
    }

    return subscribeToFollowingIds(
      user.id,
      (nextFollowedIds) => {
        setFollowedChefIds(new Set(nextFollowedIds));
      },
      (followError) => {
        showToast(followError.message, "error");
      }
    );
  }, [showToast, user]);

  useEffect(() => {
    let suggestedLoaded = false;
    let trendingLoaded = false;

    function markLoaded(type: "suggested" | "trending") {
      if (type === "suggested") {
        suggestedLoaded = true;
      } else {
        trendingLoaded = true;
      }

      if (suggestedLoaded && trendingLoaded) {
        setAreChefsLoading(false);
      }
    }

    setAreChefsLoading(true);

    const unsubscribeSuggested = subscribeToSuggestedChefs(
      (profiles) => {
        setSuggestedChefs(profiles);
        markLoaded("suggested");
      },
      (profileError) => {
        showToast(profileError.message, "error");
        markLoaded("suggested");
      }
    );
    const unsubscribeTrending = subscribeToTrendingChefs(
      (profiles) => {
        setTrendingChefs(profiles);
        markLoaded("trending");
      },
      (profileError) => {
        showToast(profileError.message, "error");
        markLoaded("trending");
      }
    );

    return () => {
      unsubscribeSuggested();
      unsubscribeTrending();
    };
  }, [showToast]);

  useEffect(() => {
    if (recipeError) {
      showToast(recipeError, "error");
    }
  }, [recipeError, showToast]);

  const visibleSuggestedChefs = useMemo(
    () => suggestedChefs.filter((chef) => chef.id !== user?.id && !followedChefIds.has(chef.id)).slice(0, 10),
    [followedChefIds, suggestedChefs, user?.id]
  );
  const visibleTrendingChefs = useMemo(
    () =>
      trendingChefs
        .filter((chef) => chef.id !== user?.id)
        .sort((left, right) => right.followersCount - left.followersCount)
        .slice(0, 10),
    [trendingChefs, user?.id]
  );
  const followedRecipes = useMemo(
    () => recipes.filter((recipe) => followedChefIds.has(recipe.authorId || recipe.createdBy)).slice(0, 4),
    [followedChefIds, recipes]
  );
  const recentActivity = useMemo(() => recipes.slice(0, 6), [recipes]);

  function openChef(chefId: string) {
    router.push({
      pathname: "/chef/[id]",
      params: { id: chefId }
    });
  }

  function openRecipe(recipeId: string) {
    router.push({
      pathname: "/recipe/[id]",
      params: { id: recipeId }
    });
  }

  async function handleLike(recipeId: string) {
    if (pendingLikeIds.has(recipeId)) {
      return;
    }

    setPendingLikeIds((current) => new Set(current).add(recipeId));

    try {
      const didLike = await toggleLikedRecipeById(recipeId);
      showToast(didLike ? t("recipeDetail.recipeLiked") : t("recipeDetail.recipeUnliked"), "success");
    } catch (likeError) {
      showToast(likeError instanceof Error ? likeError.message : "Could not like this recipe.", "error");
    } finally {
      setPendingLikeIds((current) => {
        const next = new Set(current);
        next.delete(recipeId);
        return next;
      });
    }
  }

  async function handleSave(recipeId: string) {
    if (pendingSaveIds.has(recipeId)) {
      return;
    }

    setPendingSaveIds((current) => new Set(current).add(recipeId));

    try {
      const didSave = await toggleSavedRecipeById(recipeId);
      showToast(didSave ? t("recipeDetail.recipeSaved") : t("recipeDetail.recipeRemovedSaved"), "success");
    } catch (saveError) {
      showToast(saveError instanceof Error ? saveError.message : "Could not update saved recipes.", "error");
    } finally {
      setPendingSaveIds((current) => {
        const next = new Set(current);
        next.delete(recipeId);
        return next;
      });
    }
  }

  function renderChefSection(chefs: UserProfile[], emptyTitle: string, emptyBody: string) {
    if (areChefsLoading) {
      return (
        <View className="h-48 items-center justify-center rounded-chef border border-chef-line bg-chef-panel">
          <ActivityIndicator color={colors.saffron} />
        </View>
      );
    }

    if (!user || chefs.length === 0) {
      return <EmptyPanel icon={<ChefHat stroke={colors.saffron} size={24} />} title={emptyTitle} body={emptyBody} />;
    }

    return (
      <ScrollView contentContainerStyle={{ paddingRight: 8 }} horizontal showsHorizontalScrollIndicator={false}>
        {chefs.map((chef) => (
          <ChefCard chef={chef} currentUserId={user.id} key={chef.id} onOpenChef={openChef} />
        ))}
      </ScrollView>
    );
  }

  function renderRecipeCard(recipe: Recipe, index: number) {
    return (
      <View className={index === 0 ? "" : "mt-5"} key={recipe.id}>
        <RecipeCard
          index={index}
          isLiked={likedRecipeIds.has(recipe.id)}
          isLikeLoading={pendingLikeIds.has(recipe.id)}
          isSaved={savedRecipeIds.has(recipe.id)}
          isSaveLoading={pendingSaveIds.has(recipe.id)}
          onLike={handleLike}
          onPress={openRecipe}
          onSave={handleSave}
          recipe={recipe}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-chef-black">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <ScrollView contentContainerStyle={{ paddingBottom: 116 }} showsVerticalScrollIndicator={false}>
          <View className="px-6 pb-5 pt-3">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-chef-sm font-bold uppercase text-chef-saffron">{t("community.headerTitle")}</Text>
                <Text className="mt-2 text-[32px] font-extrabold leading-10 text-chef-cream">{t("community.headerSubtitle")}</Text>
                <Text className="mt-3 text-chef-base leading-7 text-chef-muted">
                  {t("community.subtitle")}
                </Text>
              </View>
              <View className="h-12 w-12 items-center justify-center rounded-chef border border-chef-line bg-chef-panel">
                <UsersRound stroke={colors.saffron} size={22} strokeWidth={2.4} />
              </View>
            </View>
          </View>

          <View className="px-6">
            <SectionTitle kicker="Discover" title={t("community.suggestedChefs")} />
            {renderChefSection(
              visibleSuggestedChefs,
              t("community.noChefsTitle"),
              t("community.noChefsSubtitle")
            )}
          </View>

          <View className="mt-8 px-6">
            <SectionTitle kicker="Rising cooks" title={t("community.trendingChefs")} />
            {renderChefSection(
              visibleTrendingChefs,
              t("community.trendingWarming"),
              t("community.trendingFollowerCounts")
            )}
          </View>

          <View className="mt-8 px-6">
            <SectionTitle kicker="Your network" title={t("community.networkTitle")} />
            {areRecipesLoading ? (
              <RecipeSkeletonList />
            ) : followedRecipes.length > 0 ? (
              followedRecipes.map(renderRecipeCard)
            ) : (
              <EmptyPanel
                icon={<Sparkles stroke={colors.saffron} size={24} />}
                title={t("community.networkEmptyTitle")}
                body={t("community.networkEmptySubtitle")}
              />
            )}
          </View>

          <View className="mt-8 px-6">
            <SectionTitle kicker="Live table" title={t("community.recentActivity")} />
            {areRecipesLoading ? (
              <View className="rounded-chef border border-chef-line bg-chef-panel p-6">
                <ActivityIndicator color={colors.saffron} />
              </View>
            ) : recentActivity.length > 0 ? (
              <View className="rounded-chef border border-chef-line bg-chef-panel p-4">
                {recentActivity.map((recipe, index) => (
                  <Pressable
                    className={`flex-row items-start ${index === recentActivity.length - 1 ? "" : "mb-4 border-b border-chef-line pb-4"}`}
                    key={recipe.id}
                    onPress={() => openRecipe(recipe.id)}
                  >
                    <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-chef-saffron/15">
                      <Activity stroke={colors.saffron} size={19} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-chef-sm font-extrabold text-chef-cream" numberOfLines={1}>
                        {t("community.sharedRecipe", { chef: recipe.authorName || "GlobalChef cook", title: recipe.title })}
                      </Text>
                      <View className="mt-2 flex-row flex-wrap items-center">
                        <Clock3 stroke={colors.textMuted} size={14} />
                        <Text className="ml-1 mr-4 text-chef-xs font-bold text-chef-muted">{formatActivityDate(recipe.createdAt)}</Text>
                        <Heart stroke={colors.saffron} size={14} />
                        <Text className="ml-1 mr-4 text-chef-xs font-bold text-chef-muted">{String(recipe.likesCount)}</Text>
                        <MessageCircle stroke={colors.textMuted} size={14} />
                        <Text className="ml-1 text-chef-xs font-bold text-chef-muted">{String(recipe.commentsCount)}</Text>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : (
              <EmptyPanel
                icon={<Activity stroke={colors.saffron} size={24} />}
                title={t("community.noActivity")}
                body={t("community.noActivitySubtitle")}
              />
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
