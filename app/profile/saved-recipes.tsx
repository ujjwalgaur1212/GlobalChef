import { Redirect, useRouter } from "expo-router";
import { ArrowLeft, Bookmark } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { RecipeCard } from "@/components/RecipeCard";
import { RecipeSkeletonList } from "@/components/RecipeSkeleton";
import { colors } from "@/constants/theme";
import { useAuth } from "@/hooks/useAuth";
import { useRecipeInteractions } from "@/hooks/useRecipeInteractions";
import { useToast } from "@/hooks/useToast";
import { getRecipesForInteractions } from "@/services/recipeInteractionService";
import type { Recipe } from "@/types/recipe";

export default function SavedRecipesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, initializing } = useAuth();
  const {
    likedRecipeIds,
    savedRecipeIds,
    savedInteractions,
    isLoading: areInteractionsLoading,
    error: interactionError,
    toggleLikedRecipeById,
    toggleSavedRecipeById
  } = useRecipeInteractions(user?.id);
  const { showToast } = useToast();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingLikeIds, setPendingLikeIds] = useState<Set<string>>(new Set());
  const [pendingSaveIds, setPendingSaveIds] = useState<Set<string>>(new Set());

  const sortedSavedInteractions = useMemo(
    () =>
      [...savedInteractions].sort((left, right) => {
        const leftTime = left.createdAt?.getTime() ?? 0;
        const rightTime = right.createdAt?.getTime() ?? 0;

        return rightTime - leftTime;
      }),
    [savedInteractions]
  );

  useEffect(() => {
    let isMounted = true;

    if (!user) {
      setRecipes([]);
      setIsLoadingRecipes(initializing);
      return () => {
        isMounted = false;
      };
    }

    if (areInteractionsLoading) {
      setIsLoadingRecipes(true);
      return () => {
        isMounted = false;
      };
    }

    if (sortedSavedInteractions.length === 0) {
      setRecipes([]);
      setIsLoadingRecipes(false);
      setError(interactionError);
      return () => {
        isMounted = false;
      };
    }

    setIsLoadingRecipes(true);
    getRecipesForInteractions(sortedSavedInteractions)
      .then((nextRecipes) => {
        if (isMounted) {
          setRecipes(nextRecipes);
          setError(interactionError);
        }
      })
      .catch((recipeError) => {
        if (isMounted) {
          setError(recipeError instanceof Error ? recipeError.message : "Could not load saved recipes.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingRecipes(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [areInteractionsLoading, initializing, interactionError, sortedSavedInteractions, user]);

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

  if (initializing) {
    return <RecipeSkeletonList />;
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <View className="flex-1 bg-chef-black">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <FlatList
          contentContainerStyle={{ paddingBottom: 40 }}
          data={recipes}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            isLoadingRecipes ? (
              <RecipeSkeletonList />
            ) : (
              <View className="mx-6 rounded-chef border border-chef-line bg-chef-panel px-5 py-8">
                <View className="mx-auto mb-4 h-14 w-14 items-center justify-center rounded-full bg-chef-saffron/15">
                  <Bookmark stroke={colors.saffron} size={24} />
                </View>
                <Text className="text-center text-chef-lg font-extrabold text-chef-cream">
                  {error ? error : t("savedRecipes.emptyTitle")}
                </Text>
                <Text className="mt-2 text-center text-chef-sm text-chef-muted">
                  {error || t("savedRecipes.emptySubtitle")}
                </Text>
              </View>
            )
          }
          ListHeaderComponent={
            <View className="px-6 pb-5 pt-3">
              <View className="flex-row items-center justify-between">
                <Pressable className="h-11 w-11 items-center justify-center rounded-full bg-chef-panel" onPress={() => router.back()}>
                  <ArrowLeft stroke={colors.cream} size={22} strokeWidth={2.4} />
                </Pressable>
                <Text className="text-chef-sm font-extrabold uppercase text-chef-saffron">{t("profile.recipesCount", { count: recipes.length })}</Text>
              </View>
              <Text className="mt-5 text-chef-sm font-bold uppercase text-chef-saffron">{t("tabs.profile")}</Text>
              <Text className="mt-2 text-[32px] font-extrabold leading-10 text-chef-cream">{t("savedRecipes.title")}</Text>
              <Text className="mt-2 text-chef-base leading-7 text-chef-muted">{t("savedRecipes.desc")}</Text>
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
