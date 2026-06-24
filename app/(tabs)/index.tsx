import { Bell, Sparkles, Camera } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, Text, View, Alert, Modal, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import * as ImagePicker from "expo-image-picker";

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
import { scanIngredients } from "@/src/services/ingredientScannerService";
import { CommentsBottomSheet } from "@/components/CommentsBottomSheet";

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

  // Ingredient Scanner MVP States
  const [isScanning, setIsScanning] = useState(false);
  const [detectedIngredients, setDetectedIngredients] = useState<string[] | null>(null);
  const [showDetectedModal, setShowDetectedModal] = useState(false);

  // Premium Social Feed active tab state
  const [activeTab, setActiveTab] = useState<'forYou' | 'popular' | 'following' | 'trending'>('forYou');

  // Instagram comments bottom sheet state
  const [commentsRecipe, setCommentsRecipe] = useState<{ id: string; title: string } | null>(null);

  const firstName = user?.displayName?.split(" ")[0] || "";
  const welcomeMsg = firstName ? t("home.welcome", { name: firstName }) : t("home.welcomeDefault");
  const trendingRecipes = useMemo(() => recipes.slice(0, 5), [recipes]);
  const categories = useMemo(() => {
    const uploadedCuisines = recipes.map((recipe) => recipe.cuisine).filter(Boolean);
    return ["All", ...Array.from(new Set([...cuisineCategories.filter((category) => category !== "All"), ...uploadedCuisines]))];
  }, [recipes]);
  const processedRecipes = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    let list = recipes.filter((recipe) => {
      const matchesCategory = selectedCategory === "All" || recipe.cuisine === selectedCategory;
      const matchesSearch =
        !normalizedQuery ||
        recipe.title.toLowerCase().includes(normalizedQuery) ||
        recipe.country.toLowerCase().includes(normalizedQuery) ||
        recipe.cuisine.toLowerCase().includes(normalizedQuery);

      return matchesCategory && matchesSearch;
    });

    if (activeTab === "popular") {
      list = [...list].sort((a, b) => {
        const aLikes = Number(a.likes) || 0;
        const bLikes = Number(b.likes) || 0;
        const aComments = Number(a.commentsCount) || 0;
        const bComments = Number(b.commentsCount) || 0;
        return (bLikes + bComments) - (aLikes + aComments);
      });
    } else if (activeTab === "following") {
      list = list.filter((r) => r.authorId !== user?.id);
    } else if (activeTab === "trending") {
      list = [...list].sort((a, b) => (Number(b.averageRating) || 0) - (Number(a.averageRating) || 0));
    }

    return list;
  }, [recipes, searchQuery, selectedCategory, activeTab, user?.id]);

  useEffect(() => {
    if (error) {
      showToast(error, "error");
    }
  }, [error, showToast]);

  async function handleScanIngredients() {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "Camera permissions are required to scan ingredients. Please enable them in settings."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.85
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setIsScanning(true);
        const ingredientsList = await scanIngredients(result.assets[0].uri);
        setDetectedIngredients(ingredientsList);
        setShowDetectedModal(true);
      }
    } catch (scanError) {
      console.error("Ingredient Scanner Error:", scanError);
      Alert.alert("Scanner Error", "Failed to analyze ingredients. Please try again.");
    } finally {
      setIsScanning(false);
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
          onCommentPress={(id, title) => setCommentsRecipe({ id, title })}
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
          data={processedRecipes}
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
                    <Text className="text-chef-sm font-bold uppercase text-chef-saffron">HiChef</Text>
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
                
                <Pressable
                  onPress={handleScanIngredients}
                  className="mt-4 flex-row items-center justify-center bg-chef-saffron rounded-chef py-3.5 px-4 active:opacity-90"
                >
                  <Camera stroke={colors.background} size={20} strokeWidth={2.5} />
                  <Text className="text-chef-black font-extrabold text-chef-base ml-2">
                    Scan Ingredients
                  </Text>
                </Pressable>

                <View className="mt-4">
                  <CategoryChips
                    categories={categories}
                    onSelectCategory={setSelectedCategory}
                    selectedCategory={selectedCategory}
                  />
                </View>
              </View>

              {/* Premium Feed Tab Navigation */}
              <View className="px-6 mb-6">
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingRight: 16 }}
                >
                  <View className="flex-row items-center gap-3">
                    <Pressable
                      onPress={() => setActiveTab("forYou")}
                      className={`rounded-full px-4 py-2.5 border ${
                        activeTab === "forYou"
                          ? "bg-chef-saffron border-chef-saffron"
                          : "bg-chef-panel/40 border-chef-line/60"
                      }`}
                    >
                      <Text
                        className={`text-chef-sm font-extrabold ${
                          activeTab === "forYou" ? "text-chef-black" : "text-chef-cream"
                        }`}
                      >
                        For You
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => setActiveTab("popular")}
                      className={`rounded-full px-4 py-2.5 border ${
                        activeTab === "popular"
                          ? "bg-chef-saffron border-chef-saffron"
                          : "bg-chef-panel/40 border-chef-line/60"
                      }`}
                    >
                      <Text
                        className={`text-chef-sm font-extrabold ${
                          activeTab === "popular" ? "text-chef-black" : "text-chef-cream"
                        }`}
                      >
                        Popular This Week
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => setActiveTab("following")}
                      className={`rounded-full px-4 py-2.5 border ${
                        activeTab === "following"
                          ? "bg-chef-saffron border-chef-saffron"
                          : "bg-chef-panel/40 border-chef-line/60"
                      }`}
                    >
                      <Text
                        className={`text-chef-sm font-extrabold ${
                          activeTab === "following" ? "text-chef-black" : "text-chef-cream"
                        }`}
                      >
                        Friends & Following
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => setActiveTab("trending")}
                      className={`rounded-full px-4 py-2.5 border ${
                        activeTab === "trending"
                          ? "bg-chef-saffron border-chef-saffron"
                          : "bg-chef-panel/40 border-chef-line/60"
                      }`}
                    >
                      <Text
                        className={`text-chef-sm font-extrabold ${
                          activeTab === "trending" ? "text-chef-black" : "text-chef-cream"
                        }`}
                      >
                        Trending Near You
                      </Text>
                    </Pressable>
                  </View>
                </ScrollView>
              </View>

              <View className="mb-4 flex-row items-end justify-between px-6">
                <View>
                  <Text className="text-chef-xl font-extrabold text-chef-cream">
                    {activeTab === "forYou"
                      ? "For You"
                      : activeTab === "popular"
                      ? "Popular This Week"
                      : activeTab === "following"
                      ? "Friends & Following"
                      : "Trending Near You"}
                  </Text>
                  <Text className="mt-1 text-chef-sm font-semibold text-chef-muted">{t("home.dishesFound", { count: processedRecipes.length })}</Text>
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

      {/* Loading Modal */}
      <Modal
        transparent={true}
        animationType="fade"
        visible={isScanning}
        onRequestClose={() => setIsScanning(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/60">
          <View className="mx-10 rounded-chef border border-chef-line bg-chef-charcoal p-6 items-center justify-center">
            <ActivityIndicator color={colors.saffron} size="large" />
            <Text className="mt-4 text-chef-base font-extrabold text-chef-cream text-center">
              Analyzing ingredients...
            </Text>
          </View>
        </View>
      </Modal>

      {/* Detected Ingredients Modal */}
      <Modal
        transparent={true}
        animationType="fade"
        visible={showDetectedModal}
        onRequestClose={() => setShowDetectedModal(false)}
      >
        <Pressable 
          className="flex-1 items-center justify-center bg-black/75 px-6"
          onPress={() => setShowDetectedModal(false)}
        >
          <Pressable 
            className="w-full max-w-sm rounded-chef border border-chef-line bg-chef-charcoal p-6"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="flex-row items-center justify-between border-b border-chef-line pb-4 mb-4">
              <Text className="text-chef-lg font-extrabold text-chef-cream">
                Detected Ingredients
              </Text>
              <Pressable 
                className="h-8 w-8 items-center justify-center rounded-full bg-chef-line active:opacity-80"
                onPress={() => setShowDetectedModal(false)}
              >
                <Text className="text-chef-base font-extrabold text-chef-cream">✕</Text>
              </Pressable>
            </View>

            <ScrollView className="max-h-60 mb-6">
              {detectedIngredients && detectedIngredients.length > 0 ? (
                detectedIngredients.map((ingredient, idx) => (
                  <View key={idx} className="flex-row items-center py-2">
                    <Text className="text-chef-saffron text-chef-lg mr-2">•</Text>
                    <Text className="text-chef-cream text-chef-base font-semibold capitalize">
                      {ingredient}
                    </Text>
                  </View>
                ))
              ) : (
                <Text className="text-chef-muted text-chef-sm italic">
                  No ingredients detected.
                </Text>
              )}
            </ScrollView>

            <Pressable
              className="w-full bg-chef-saffron rounded-chef py-3.5 items-center justify-center active:opacity-90"
              onPress={() => setShowDetectedModal(false)}
            >
              <Text className="text-chef-black font-extrabold text-chef-base">
                Close
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <CommentsBottomSheet
        visible={!!commentsRecipe}
        onClose={() => setCommentsRecipe(null)}
        recipeId={commentsRecipe?.id || ""}
        recipeTitle={commentsRecipe?.title || ""}
      />
    </View>
  );
}
