import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Bookmark, ChefHat, Globe2, Heart, Pencil, Share2, UserPlus, UserRound, UsersRound } from "lucide-react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, FlatList, Image, ImageBackground, Pressable, Share, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { RecipeSkeletonList } from "@/components/RecipeSkeleton";
import { colors } from "@/constants/theme";
import { useAuth } from "@/hooks/useAuth";
import { useFollow } from "@/hooks/useFollow";
import { useRecipeInteractions } from "@/hooks/useRecipeInteractions";
import { useToast } from "@/hooks/useToast";
import { subscribeToRecipesByAuthor } from "@/services/recipeService";
import { subscribeToUserProfile } from "@/services/userService";
import type { Recipe } from "@/types/recipe";
import type { UserProfile } from "@/types/user";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part.trim().slice(0, 1))
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

type StatCardProps = {
  label: string;
  value: number;
  icon: React.ReactNode;
};

function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <View className="flex-1 rounded-chef border border-chef-line bg-chef-panel p-4">
      {icon}
      <Text className="mt-3 text-chef-2xl font-extrabold text-chef-cream">{String(value)}</Text>
      <Text className="mt-1 text-chef-xs font-extrabold uppercase text-chef-muted">{label}</Text>
    </View>
  );
}

type RecipeGridTileProps = {
  recipe: Recipe;
  isLiked: boolean;
  isLikeLoading: boolean;
  isSaved: boolean;
  isSaveLoading: boolean;
  onLike: (recipeId: string) => void;
  onOpen: (recipeId: string) => void;
  onSave: (recipeId: string) => void;
};

function RecipeGridTile({ recipe, isLiked, isLikeLoading, isSaved, isSaveLoading, onLike, onOpen, onSave }: RecipeGridTileProps) {
  const { t } = useTranslation();
  return (
    <Pressable className="mb-4 flex-1 overflow-hidden rounded-chef border border-chef-line bg-chef-panel" onPress={() => onOpen(recipe.id)}>
      <ImageBackground className="h-40 justify-between overflow-hidden" resizeMode="cover" source={{ uri: recipe.imageUrl }}>
        <View className="flex-row justify-between p-2">
          <View className="rounded-full bg-chef-black/75 px-2 py-1">
            <Text className="text-[10px] font-extrabold uppercase text-chef-saffron" numberOfLines={1}>
              {recipe.country || t("recipeDetail.global")}
            </Text>
          </View>
          <Pressable
            className="h-8 w-8 items-center justify-center rounded-full bg-chef-black/75"
            disabled={!!isSaveLoading}
            onPress={(event) => {
              event.stopPropagation();
              onSave(recipe.id);
            }}
          >
            {isSaveLoading ? (
              <ActivityIndicator color={colors.saffron} size="small" />
            ) : (
              <Bookmark fill={isSaved ? colors.saffron : "transparent"} stroke={isSaved ? colors.saffron : colors.cream} size={15} />
            )}
          </Pressable>
        </View>
        <View className="bg-chef-black/75 p-3">
          <Text className="text-chef-sm font-extrabold text-chef-cream" numberOfLines={2}>
            {recipe.title}
          </Text>
          <View className="mt-2 flex-row items-center justify-between">
            <Text className="text-chef-xs font-bold text-chef-muted" numberOfLines={1}>
              {recipe.cuisine}
            </Text>
            <Pressable
              className="flex-row items-center"
              disabled={!!isLikeLoading}
              onPress={(event) => {
                event.stopPropagation();
                onLike(recipe.id);
              }}
            >
              {isLikeLoading ? (
                <ActivityIndicator color={colors.saffron} size="small" />
              ) : (
                <Heart fill={isLiked ? colors.saffron : "transparent"} stroke={colors.saffron} size={14} />
              )}
              <Text className="ml-1 text-chef-xs font-bold text-chef-saffron">{String(recipe.likesCount)}</Text>
            </Pressable>
          </View>
        </View>
      </ImageBackground>
    </Pressable>
  );
}

export default function ChefProfileScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const chefId = String((Array.isArray(id) ? id[0] : id) ?? "");
  const router = useRouter();
  const { user, initializing } = useAuth();
  const { showToast } = useToast();
  const { likedRecipeIds, savedRecipeIds, toggleLikedRecipeById, toggleSavedRecipeById } = useRecipeInteractions(user?.id);
  const { isFollowing, isLoading: isFollowLoading, toggleFollow } = useFollow(user?.id, chefId);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [areRecipesLoading, setAreRecipesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingLikeIds, setPendingLikeIds] = useState<Set<string>>(new Set());
  const [pendingSaveIds, setPendingSaveIds] = useState<Set<string>>(new Set());
  const { t } = useTranslation();

  useEffect(() => {
    if (!chefId) {
      setError("chefProfile.chefNotFound");
      setIsProfileLoading(false);
      return;
    }

    setIsProfileLoading(true);

    return subscribeToUserProfile(
      chefId,
      (nextProfile) => {
        setProfile(nextProfile);
        setError(nextProfile ? null : "chefProfile.chefNotFound");
        setIsProfileLoading(false);
      },
      (profileError) => {
        setError(profileError.message);
        setIsProfileLoading(false);
      }
    );
  }, [chefId]);

  useEffect(() => {
    if (!chefId) {
      setAreRecipesLoading(false);
      return;
    }

    setAreRecipesLoading(true);

    return subscribeToRecipesByAuthor(
      chefId,
      (nextRecipes) => {
        setRecipes(nextRecipes);
        setAreRecipesLoading(false);
      },
      (recipeError) => {
        showToast(recipeError.message, "error");
        setAreRecipesLoading(false);
      }
    );
  }, [chefId, showToast]);

  async function handleFollow() {
    try {
      const result = await toggleFollow();
      showToast(result.isFollowing ? t("chefProfile.chefFollowed") : t("chefProfile.chefUnfollowed"), result.didChange ? "success" : "info");
    } catch (followError) {
      showToast(followError instanceof Error ? followError.message : "Could not update follow state.", "error");
    }
  }

  async function handleShare() {
    if (!profile) {
      return;
    }

    try {
      await Share.share({
        title: t("chefProfile.shareChefTitle", { name: profile.displayName }),
        message: profile.country
          ? t("chefProfile.shareChefMessageWithCountry", { name: profile.displayName, country: profile.country, id: profile.id })
          : t("chefProfile.shareChefMessage", { name: profile.displayName, id: profile.id })
      });
    } catch {
      showToast(t("recipeDetail.shareError"), "error");
    }
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

  function openRecipe(recipeId: string) {
    router.push({
      pathname: "/recipe/[id]",
      params: { id: recipeId }
    });
  }

  if (initializing || isProfileLoading) {
    return <RecipeSkeletonList />;
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (error || !profile || !chefId) {
    return (
      <View className="flex-1 bg-chef-black">
        <SafeAreaView className="flex-1 px-6 py-6">
          <Pressable className="h-11 w-11 items-center justify-center rounded-full bg-chef-panel" onPress={() => router.back()}>
            <ArrowLeft stroke={colors.cream} size={22} />
          </Pressable>
          <View className="flex-1 items-center justify-center">
            <Text className="text-center text-chef-xl font-extrabold text-chef-cream">
              {error ? (error.startsWith("chefProfile.") ? t(error) : error) : t("chefProfile.chefNotFound")}
            </Text>
            <Text className="mt-2 text-center text-chef-sm text-chef-muted">{t("chefProfile.returnToFeed")}</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const isOwnProfile = user.id === chefId;
  const displayRecipeCount = Math.max(profile.recipeCount, recipes.length);
  const initials = getInitials(profile.displayName || "HiChef cook") || "HC";

  return (
    <View className="flex-1 bg-chef-black">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <FlatList
          columnWrapperStyle={recipes.length > 0 ? { gap: 2, paddingHorizontal: 2 } : undefined}
          contentContainerStyle={{ gap: 2, paddingBottom: 44 }}
          data={recipes}
          keyExtractor={(item) => item.id}
          numColumns={3}
          ListEmptyComponent={
            areRecipesLoading ? (
              <RecipeSkeletonList />
            ) : (
              <View className="mx-6 rounded-chef border border-chef-line bg-chef-panel px-5 py-8">
                <View className="mx-auto mb-4 h-14 w-14 items-center justify-center rounded-full bg-chef-saffron/15">
                  <ChefHat stroke={colors.saffron} size={24} />
                </View>
                <Text className="text-center text-chef-lg font-extrabold text-chef-cream">{t("chefProfile.noChefRecipes")}</Text>
                <Text className="mt-2 text-center text-chef-sm text-chef-muted">{t("chefProfile.noRecipesUploaded")}</Text>
              </View>
            )
          }
          ListHeaderComponent={
            <View className="px-6 pb-5 pt-3">
              <View className="flex-row items-center justify-between">
                <Pressable className="h-11 w-11 items-center justify-center rounded-full bg-chef-panel" onPress={() => router.back()}>
                  <ArrowLeft stroke={colors.cream} size={22} strokeWidth={2.4} />
                </Pressable>
                <View className="flex-row gap-3">
                  <Pressable className="h-11 w-11 items-center justify-center rounded-full bg-chef-panel" onPress={handleShare}>
                    <Share2 stroke={colors.cream} size={20} strokeWidth={2.4} />
                  </Pressable>
                  {isOwnProfile ? (
                    <Pressable className="h-11 w-11 items-center justify-center rounded-full bg-chef-panel" onPress={() => router.push("/profile/edit")}>
                      <Pencil stroke={colors.saffron} size={20} strokeWidth={2.4} />
                    </Pressable>
                  ) : null}
                </View>
              </View>

              <View className="mt-8 items-center">
                <View className="h-28 w-28 overflow-hidden rounded-chef border border-chef-line bg-chef-panel">
                  {profile.photoURL ? (
                    <Image className="h-full w-full" resizeMode="cover" source={{ uri: profile.photoURL }} />
                  ) : (
                    <View className="h-full w-full items-center justify-center bg-chef-saffron/15">
                      <Text className="text-[34px] font-extrabold text-chef-saffron">{initials}</Text>
                    </View>
                  )}
                </View>
                <Text className="mt-5 text-chef-xs font-bold uppercase text-chef-saffron">{t("chefProfile.publicChefProfile")}</Text>
                <Text className="mt-3 text-center text-[32px] font-extrabold leading-10 text-chef-cream">{profile.displayName}</Text>
                {profile.username ? (
                  <Text className="mt-1.5 text-center text-chef-base font-extrabold text-chef-saffron">@{profile.username}</Text>
                ) : null}
                {profile.country ? (
                  <View className="mt-3 flex-row items-center rounded-full bg-chef-panel px-4 py-2">
                    <Globe2 stroke={colors.saffron} size={16} />
                    <Text className="ml-2 text-chef-sm font-extrabold text-chef-cream">{profile.country}</Text>
                  </View>
                ) : null}
                <Text className="mt-4 text-center text-chef-base leading-7 text-chef-muted">
                  {profile.bio || t("chefProfile.chefBioPlaceholder")}
                </Text>
              </View>

              <View className="mt-7 flex-row gap-3">
                <StatCard icon={<UsersRound stroke={colors.saffron} size={21} />} label={t("chefProfile.followers")} value={profile.followersCount} />
                <StatCard icon={<UserPlus stroke={colors.saffron} size={21} />} label={t("chefProfile.following")} value={profile.followingCount} />
                <StatCard icon={<ChefHat stroke={colors.saffron} size={21} />} label={t("chefProfile.recipes")} value={displayRecipeCount} />
              </View>

              {!isOwnProfile ? (
                <Button
                  className="mt-5"
                  isLoading={isFollowLoading}
                  onPress={handleFollow}
                  title={isFollowing ? t("search.following") : t("chefProfile.followChef")}
                  variant={isFollowing ? "secondary" : "primary"}
                />
              ) : (
                <Button className="mt-5" onPress={() => router.push("/profile/edit")} title={t("profile.editBtn")} variant="secondary" />
              )}

              <Text className="mt-8 text-chef-xl font-extrabold text-chef-cream">{t("chefProfile.recipeGrid")}</Text>
              <Text className="mb-5 mt-1 text-chef-sm font-semibold text-chef-muted">{t("chefProfile.dishesByChef", { count: recipes.length, name: profile.displayName })}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={{ flex: 1 / 3, aspectRatio: 1 }}
              className="bg-chef-panel active:opacity-75 overflow-hidden rounded-md"
              onPress={() => openRecipe(item.id)}
            >
              <Image className="h-full w-full" resizeMode="cover" source={{ uri: item.imageUrl }} />
            </Pressable>
          )}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </View>
  );
}
