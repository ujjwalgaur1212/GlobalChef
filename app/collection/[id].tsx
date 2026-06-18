import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Folder } from "lucide-react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { RecipeCard } from "@/components/RecipeCard";
import { RecipeSkeletonList } from "@/components/RecipeSkeleton";
import { colors } from "@/constants/theme";
import { useAuth } from "@/hooks/useAuth";
import { useRecipeInteractions } from "@/hooks/useRecipeInteractions";
import { useToast } from "@/hooks/useToast";
import { getCollectionById, getCollectionErrorMessage, getCollectionRecipes } from "@/services/collectionService";
import type { RecipeCollection } from "@/types/collection";
import type { Recipe } from "@/types/recipe";

export default function CollectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const collectionId = String((Array.isArray(id) ? id[0] : id) ?? "");
  const router = useRouter();
  const { user, initializing } = useAuth();
  const { showToast } = useToast();
  const { likedRecipeIds, savedRecipeIds, toggleLikedRecipeById, toggleSavedRecipeById } = useRecipeInteractions(user?.id);
  const [recipeCollection, setRecipeCollection] = useState<RecipeCollection | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingLikeIds, setPendingLikeIds] = useState<Set<string>>(new Set());
  const [pendingSaveIds, setPendingSaveIds] = useState<Set<string>>(new Set());
  const { t } = useTranslation();

  useEffect(() => {
    let isMounted = true;
    const cleanCollectionId = collectionId.trim();

    if (!cleanCollectionId) {
      setError("collectionDetail.collectionNotFound");
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    setIsLoading(true);
    Promise.all([getCollectionById(cleanCollectionId), getCollectionRecipes(cleanCollectionId)])
      .then(([nextCollection, nextRecipes]) => {
        if (!isMounted) {
          return;
        }

        setRecipeCollection(nextCollection);
        setRecipes(nextRecipes);
        setError(nextCollection ? null : "collectionDetail.collectionNotFound");
      })
      .catch((collectionError) => {
        if (isMounted) {
          setError(getCollectionErrorMessage(collectionError));
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [collectionId]);

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

  if (initializing || isLoading) {
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
            <View className="mx-6 rounded-chef border border-chef-line bg-chef-panel px-5 py-8">
              <View className="mx-auto mb-4 h-14 w-14 items-center justify-center rounded-full bg-chef-saffron/15">
                <Folder stroke={colors.saffron} size={24} />
              </View>
              <Text className="text-center text-chef-lg font-extrabold text-chef-cream">
                {error ? t("collectionDetail.couldNotLoad") : t("collectionDetail.emptyTitle")}
              </Text>
              <Text className="mt-2 text-center text-chef-sm text-chef-muted">
                {error ? (error.startsWith("collectionDetail.") ? t(error) : error) : t("collectionDetail.emptySubtitle", { name: recipeCollection?.name || t("collectionDetail.fallbackName") })}
              </Text>
            </View>
          }
          ListHeaderComponent={
            <View className="px-6 pb-5 pt-3">
              <View className="flex-row items-center justify-between">
                <Pressable className="h-11 w-11 items-center justify-center rounded-full bg-chef-panel" onPress={() => router.back()}>
                  <ArrowLeft stroke={colors.cream} size={22} strokeWidth={2.4} />
                </Pressable>
                <Text className="text-chef-sm font-extrabold uppercase text-chef-saffron">
                  {t("profile.recipesCount", { count: recipeCollection?.recipeCount ?? recipes.length })}
                </Text>
              </View>
              <Text className="mt-5 text-chef-sm font-bold uppercase text-chef-saffron">{t("collectionDetail.collectionTitle")}</Text>
              <Text className="mt-2 text-[32px] font-extrabold leading-10 text-chef-cream">
                {recipeCollection?.name || t("collectionDetail.fallbackName")}
              </Text>
              {recipeCollection?.description ? (
                <Text className="mt-2 text-chef-base leading-7 text-chef-muted">{recipeCollection.description}</Text>
              ) : null}
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
