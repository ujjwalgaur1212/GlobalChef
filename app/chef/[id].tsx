import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, ChefHat, UserPlus, UserRound, UsersRound } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { RecipeCard } from "@/components/RecipeCard";
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

export default function ChefProfileScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const chefId = String((Array.isArray(id) ? id[0] : id) ?? "");
  const router = useRouter();
  const { user, initializing } = useAuth();
  const { showToast } = useToast();
  const { likedRecipeIds, savedRecipeIds, likeRecipeById, toggleSavedRecipeById } = useRecipeInteractions(user?.id);
  const { isFollowing, isLoading: isFollowLoading, toggleFollow } = useFollow(user?.id, chefId);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [areRecipesLoading, setAreRecipesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingLikeIds, setPendingLikeIds] = useState<Set<string>>(new Set());
  const [pendingSaveIds, setPendingSaveIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!chefId) {
      setError("Chef not found.");
      setIsProfileLoading(false);
      return;
    }

    setIsProfileLoading(true);

    return subscribeToUserProfile(
      chefId,
      (nextProfile) => {
        setProfile(nextProfile);
        setError(nextProfile ? null : "Chef not found.");
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
      showToast(result.isFollowing ? "Chef followed" : "Chef unfollowed", result.didChange ? "success" : "info");
    } catch (followError) {
      showToast(followError instanceof Error ? followError.message : "Could not update follow state.", "error");
    }
  }

  async function handleLike(recipeId: string) {
    if (pendingLikeIds.has(recipeId)) {
      return;
    }

    setPendingLikeIds((current) => new Set(current).add(recipeId));

    try {
      const didLike = await likeRecipeById(recipeId);
      showToast(didLike ? "Recipe liked" : "You already liked this recipe", didLike ? "success" : "info");
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
      showToast(didSave ? "Recipe saved" : "Recipe removed from saved", "success");
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
            <Text className="text-center text-chef-xl font-extrabold text-chef-cream">{error || "Chef not found."}</Text>
            <Text className="mt-2 text-center text-chef-sm text-chef-muted">Return to the feed and pick another chef.</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const isOwnProfile = user.id === chefId;

  return (
    <View className="flex-1 bg-chef-black">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <FlatList
          contentContainerStyle={{ paddingBottom: 44 }}
          data={recipes}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            areRecipesLoading ? (
              <RecipeSkeletonList />
            ) : (
              <View className="mx-6 rounded-chef border border-chef-line bg-chef-panel px-5 py-8">
                <View className="mx-auto mb-4 h-14 w-14 items-center justify-center rounded-full bg-chef-saffron/15">
                  <ChefHat stroke={colors.saffron} size={24} />
                </View>
                <Text className="text-center text-chef-lg font-extrabold text-chef-cream">No recipes yet</Text>
                <Text className="mt-2 text-center text-chef-sm text-chef-muted">This chef has not uploaded a recipe yet.</Text>
              </View>
            )
          }
          ListHeaderComponent={
            <View className="px-6 pb-5 pt-3">
              <View className="flex-row items-center justify-between">
                <Pressable className="h-11 w-11 items-center justify-center rounded-full bg-chef-panel" onPress={() => router.back()}>
                  <ArrowLeft stroke={colors.cream} size={22} strokeWidth={2.4} />
                </Pressable>
                <Text className="text-chef-sm font-extrabold uppercase text-chef-saffron">{String(recipes.length)} recipes</Text>
              </View>

              <View className="mt-8 h-20 w-20 items-center justify-center rounded-chef bg-chef-panel">
                <UserRound stroke={colors.saffron} size={34} strokeWidth={2.4} />
              </View>
              <Text className="mt-5 text-chef-xs font-bold uppercase text-chef-saffron">Chef profile</Text>
              <Text className="mt-3 text-[32px] font-extrabold leading-10 text-chef-cream">{String(profile.displayName ?? "")}</Text>

              <View className="mt-6 flex-row gap-3">
                <View className="flex-1 rounded-chef border border-chef-line bg-chef-panel p-4">
                  <UsersRound stroke={colors.saffron} size={21} />
                  <Text className="mt-3 text-chef-2xl font-extrabold text-chef-cream">{String(profile.followersCount)}</Text>
                  <Text className="mt-1 text-chef-xs font-extrabold uppercase text-chef-muted">Followers</Text>
                </View>
                <View className="flex-1 rounded-chef border border-chef-line bg-chef-panel p-4">
                  <UserPlus stroke={colors.saffron} size={21} />
                  <Text className="mt-3 text-chef-2xl font-extrabold text-chef-cream">{String(profile.followingCount)}</Text>
                  <Text className="mt-1 text-chef-xs font-extrabold uppercase text-chef-muted">Following</Text>
                </View>
              </View>

              {!isOwnProfile ? (
                <Button
                  className="mt-5"
                  isLoading={isFollowLoading}
                  onPress={handleFollow}
                  title={isFollowing ? "Following" : "Follow chef"}
                  variant={isFollowing ? "secondary" : "primary"}
                />
              ) : null}

              <Text className="mt-8 text-chef-xl font-extrabold text-chef-cream">Recipes by {String(profile.displayName ?? "")}</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <View className="px-6">
              <RecipeCard
                index={index}
                isLiked={likedRecipeIds.has(item.id)}
                isLikeLoading={pendingLikeIds.has(item.id)}
                isSaved={savedRecipeIds.has(item.id)}
                isSaveLoading={pendingSaveIds.has(item.id)}
                onLike={handleLike}
                onPress={(recipeId) =>
                  router.push({
                    pathname: "/recipe/[id]",
                    params: { id: String(recipeId ?? "") }
                  })
                }
                onSave={handleSave}
                recipe={item}
              />
            </View>
          )}
          ItemSeparatorComponent={() => <View className="h-5" />}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </View>
  );
}
