import { Bell, Sparkles } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { CategoryChips } from "@/components/CategoryChips";
import { RecipeCard } from "@/components/RecipeCard";
import { RecipeSkeletonList } from "@/components/RecipeSkeleton";
import { SearchBar } from "@/components/SearchBar";
import { TrendingRecipeCard } from "@/components/TrendingRecipeCard";
import { cuisineCategories } from "@/constants/recipes";
import { colors } from "@/constants/theme";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { useRecipeInteractions } from "@/hooks/useRecipeInteractions";
import { useRecipes } from "@/hooks/useRecipes";
import { useToast } from "@/hooks/useToast";
import type { Recipe } from "@/types/recipe";

export default function HomeFeedTab() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { recipes, isLoading, isRefreshing, error, refresh } = useRecipes(user?.id);
  const { likedRecipeIds, savedRecipeIds, toggleLikedRecipeById, toggleSavedRecipeById } = useRecipeInteractions(user?.id);
  const { showToast } = useToast();
  const { unreadCount } = useNotifications(user?.id);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [pendingLikeIds, setPendingLikeIds] = useState<Set<string>>(new Set());
  const [pendingSaveIds, setPendingSaveIds] = useState<Set<string>>(new Set());

  const firstName = user?.displayName?.split(" ")[0] || "";
  const welcomeMsg = firstName ? t("home.welcome", { name: firstName }) : t("home.welcomeDefault");
  const trendingRecipes = useMemo(() => recipes.slice(0, 5), [recipes]);
  const categories = useMemo(() => {
    const uploadedCuisines = recipes.map((recipe) => recipe.cuisine).filter(Boolean);
    return ["All", ...Array.from(new Set([...cuisineCategories.filter((category) => category !== "All"), ...uploadedCuisines]))];
  }, [recipes]);
  const filteredRecipes = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return recipes.filter((recipe) => {
      const matchesCategory = selectedCategory === "All" || recipe.cuisine === selectedCategory;
      const matchesSearch =
        !normalizedQuery ||
        recipe.title.toLowerCase().includes(normalizedQuery) ||
        recipe.country.toLowerCase().includes(normalizedQuery) ||
        recipe.cuisine.toLowerCase().includes(normalizedQuery);

      return matchesCategory && matchesSearch;
    });
  }, [recipes, searchQuery, selectedCategory]);

  useEffect(() => {
    if (error) {
      showToast(error, "error");
    }
  }, [error, showToast]);

  async function handleLike(recipeId: string) {
    if (pendingLikeIds.has(recipeId)) {
      return;
    }

    setPendingLikeIds((current) => new Set(current).add(recipeId));

    try {
      const didLike = await toggleLikedRecipeById(recipeId);
      showToast(didLike ? t("recipeDetail.recipeLiked") : t("recipeDetail.recipeUnliked"), "success");
    } catch (likeError) {
      showToast(likeError instanceof Error ? likeError.message : "Could not like this recipe. Try again.", "error");
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
      params: { id: String(recipeId ?? "") }
    });
  }

  function renderRecipe({ item, index }: { item: Recipe; index: number }) {
    return (
      <View className="px-6">
        <RecipeCard
          index={index}
          isLiked={likedRecipeIds.has(item.id)}
          isLikeLoading={pendingLikeIds.has(item.id)}
          isSaved={savedRecipeIds.has(item.id)}
          isSaveLoading={pendingSaveIds.has(item.id)}
          onLike={handleLike}
          onPress={openRecipe}
          onSave={handleSave}
          recipe={item}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-chef-black">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <FlatList
          contentContainerStyle={{ paddingBottom: 112 }}
          data={filteredRecipes}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          onRefresh={refresh}
          refreshing={!!isRefreshing}
          ListEmptyComponent={
            isLoading ? (
              <RecipeSkeletonList />
            ) : (
              <View className="mx-6 rounded-chef border border-chef-line bg-chef-panel px-5 py-8">
                <Text className="text-center text-chef-lg font-extrabold text-chef-cream">
                  {error ? t("home.couldNotLoad") : t("home.noRecipes")}
                </Text>
                <Text className="mt-2 text-center text-chef-sm text-chef-muted">
                  {error || t("home.noRecipesSubtitle")}
                </Text>
              </View>
            )
          }
          ListHeaderComponent={
            <>
              <View className="px-6 pb-5 pt-3">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-4">
                    <Text className="text-chef-sm font-bold uppercase text-chef-saffron">GlobalChef</Text>
                    <Text className="mt-2 text-[32px] font-extrabold leading-10 text-chef-cream">
                      {welcomeMsg}
                    </Text>
                  </View>
                  <Pressable
                    className="h-12 w-12 items-center justify-center rounded-chef border border-chef-line bg-chef-panel"
                    onPress={() => router.push("/(tabs)/notifications")}
                  >
                    <Bell stroke={colors.cream} size={21} strokeWidth={2.3} />
                    {unreadCount > 0 ? (
                      <View
                        style={{
                          position: "absolute",
                          right: -5,
                          top: -5,
                          backgroundColor: colors.tomato,
                          minWidth: 18,
                          height: 18,
                          borderRadius: 9,
                          alignItems: "center",
                          justifyContent: "center",
                          paddingHorizontal: 2
                        }}
                      >
                        <Text className="text-[10px] font-extrabold text-chef-cream text-center leading-4">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </Text>
                      </View>
                    ) : null}
                  </Pressable>
                </View>
              </View>

              <View className="px-6 pb-5">
                <SearchBar onChangeText={setSearchQuery} value={searchQuery} />
                <View className="mt-4">
                  <CategoryChips
                    categories={categories}
                    onSelectCategory={setSelectedCategory}
                    selectedCategory={selectedCategory}
                  />
                </View>
              </View>

              {trendingRecipes.length > 0 ? (
                <View className="mb-8">
                  <View className="mb-4 flex-row items-center justify-between px-6">
                    <View>
                      <Text className="text-chef-xl font-extrabold text-chef-cream">{t("home.trendingTitle")}</Text>
                      <Text className="mt-1 text-chef-sm font-semibold text-chef-muted">{t("home.trendingSubtitle")}</Text>
                    </View>
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-chef-saffron/15">
                      <Sparkles stroke={colors.saffron} size={20} />
                    </View>
                  </View>

                  <ScrollView
                    contentContainerStyle={{ paddingLeft: 24, paddingRight: 8 }}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                  >
                    {trendingRecipes.map((recipe) => (
                      <TrendingRecipeCard key={recipe.id} onPress={openRecipe} recipe={recipe} />
                    ))}
                  </ScrollView>
                </View>
              ) : null}

              <View className="mb-4 flex-row items-end justify-between px-6">
                <View>
                  <Text className="text-chef-xl font-extrabold text-chef-cream">{t("home.feedTitle")}</Text>
                  <Text className="mt-1 text-chef-sm font-semibold text-chef-muted">{t("home.dishesFound", { count: filteredRecipes.length })}</Text>
                </View>
                <Text className="text-chef-sm font-extrabold text-chef-saffron">{selectedCategory}</Text>
              </View>
            </>
          }
          renderItem={renderRecipe}
          ItemSeparatorComponent={() => <View className="h-5" />}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </View>
  );
}
