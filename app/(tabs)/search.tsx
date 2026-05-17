import { useRouter } from "expo-router";
import { Flame, SlidersHorizontal, Timer } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { RecipeCard } from "@/components/RecipeCard";
import { RecipeSkeletonList } from "@/components/RecipeSkeleton";
import { SearchBar } from "@/components/SearchBar";
import { colors } from "@/constants/theme";
import { useAuth } from "@/hooks/useAuth";
import { useRecipeInteractions } from "@/hooks/useRecipeInteractions";
import { useToast } from "@/hooks/useToast";
import { getRecipeErrorMessage, subscribeToRecipeSearch } from "@/services/recipeService";
import type { Recipe, RecipeDifficulty, RecipeSearchSort } from "@/types/recipe";

const difficultyOptions: Array<"All" | RecipeDifficulty> = ["All", "Easy", "Medium", "Hard"];
const sortOptions: Array<{ label: string; value: RecipeSearchSort }> = [
  { label: "Newest", value: "newest" },
  { label: "Most liked", value: "mostLiked" },
  { label: "Most commented", value: "mostCommented" }
];

function parseCookTimeMinutes(cookTime: string) {
  const match = cookTime.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export default function SearchTab() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { likedRecipeIds, savedRecipeIds, likeRecipeById, toggleSavedRecipeById } = useRecipeInteractions(user?.id);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState<"All" | RecipeDifficulty>("All");
  const [maxCookTime, setMaxCookTime] = useState("");
  const [minCalories, setMinCalories] = useState("");
  const [maxCalories, setMaxCalories] = useState("");
  const [sort, setSort] = useState<RecipeSearchSort>("newest");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingLikeIds, setPendingLikeIds] = useState<Set<string>>(new Set());
  const [pendingSaveIds, setPendingSaveIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setIsLoading(true);

    const unsubscribe = subscribeToRecipeSearch(
      sort,
      (nextRecipes) => {
        setRecipes(nextRecipes);
        setError(null);
        setIsLoading(false);
      },
      (recipeError) => {
        const message = getRecipeErrorMessage(recipeError);
        setError(message);
        setIsLoading(false);
        showToast(message, "error");
      }
    );

    return unsubscribe;
  }, [showToast, sort]);

  const filteredRecipes = useMemo(() => {
    const normalizedQuery = normalize(query);
    const maxCookMinutes = Number(maxCookTime);
    const minCaloriesNumber = Number(minCalories);
    const maxCaloriesNumber = Number(maxCalories);
    const hasMaxCookTime = maxCookTime.trim().length > 0 && !Number.isNaN(maxCookMinutes);
    const hasMinCalories = minCalories.trim().length > 0 && !Number.isNaN(minCaloriesNumber);
    const hasMaxCalories = maxCalories.trim().length > 0 && !Number.isNaN(maxCaloriesNumber);

    return recipes.filter((recipe) => {
      const searchableText = [
        recipe.title,
        recipe.country,
        ...recipe.ingredients,
        ...recipe.tags
      ]
        .join(" ")
        .toLowerCase();
      const matchesSearch = !normalizedQuery || searchableText.includes(normalizedQuery);
      const matchesDifficulty = difficulty === "All" || recipe.difficulty === difficulty;
      const matchesCookTime = !hasMaxCookTime || parseCookTimeMinutes(recipe.cookTime) <= maxCookMinutes;
      const matchesMinCalories = !hasMinCalories || recipe.calories >= minCaloriesNumber;
      const matchesMaxCalories = !hasMaxCalories || recipe.calories <= maxCaloriesNumber;

      return matchesSearch && matchesDifficulty && matchesCookTime && matchesMinCalories && matchesMaxCalories;
    });
  }, [difficulty, maxCalories, maxCookTime, minCalories, query, recipes]);

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

  return (
    <View className="flex-1 bg-chef-black">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <FlatList
          contentContainerStyle={{ paddingBottom: 112 }}
          data={filteredRecipes}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            isLoading ? (
              <RecipeSkeletonList />
            ) : (
              <View className="mx-6 rounded-chef border border-chef-line bg-chef-panel px-5 py-8">
                <View className="mx-auto mb-4 h-14 w-14 items-center justify-center rounded-full bg-chef-saffron/15">
                  {error ? <SlidersHorizontal stroke={colors.tomato} size={24} /> : <SlidersHorizontal stroke={colors.saffron} size={24} />}
                </View>
                <Text className="text-center text-chef-lg font-extrabold text-chef-cream">
                  {error ? "Search is unavailable" : "No recipes found"}
                </Text>
                <Text className="mt-2 text-center text-chef-sm text-chef-muted">
                  {error || "Try a broader search, fewer filters, or a different sort."}
                </Text>
              </View>
            )
          }
          ListHeaderComponent={
            <>
              <View className="px-6 pb-5 pt-3">
                <Text className="text-chef-sm font-bold uppercase text-chef-saffron">Search recipes</Text>
                <Text className="mt-2 text-[32px] font-extrabold leading-10 text-chef-cream">Find your next dish.</Text>
                <Text className="mt-2 text-chef-base leading-7 text-chef-muted">
                  Search by title, ingredients, country, or tags.
                </Text>
              </View>

              <View className="px-6">
                <SearchBar onChangeText={setQuery} value={query} />

                <View className="mt-5">
                  <Text className="mb-3 text-chef-sm font-extrabold uppercase text-chef-muted">Difficulty</Text>
                  <View className="flex-row gap-2">
                    {difficultyOptions.map((option) => {
                      const isSelected = option === difficulty;

                      return (
                        <Pressable
                          className={`h-11 flex-1 items-center justify-center rounded-chef border ${
                            isSelected ? "border-chef-saffron bg-chef-saffron" : "border-chef-line bg-chef-panel"
                          }`}
                          key={option}
                          onPress={() => setDifficulty(option)}
                        >
                          <Text className={`text-chef-xs font-extrabold ${isSelected ? "text-chef-black" : "text-chef-cream"}`}>{String(option)}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View className="mt-5 flex-row gap-3">
                  <View className="flex-1 rounded-chef border border-chef-line bg-chef-panel px-4 py-3">
                    <View className="mb-2 flex-row items-center">
                      <Timer stroke={colors.textMuted} size={17} />
                      <Text className="ml-2 text-chef-xs font-extrabold uppercase text-chef-muted">Max minutes</Text>
                    </View>
                    <TextInput
                      className="text-chef-base font-bold text-chef-cream"
                      keyboardType="number-pad"
                      onChangeText={setMaxCookTime}
                      placeholder="45"
                      placeholderTextColor={colors.textMuted}
                      selectionColor={colors.saffron}
                      value={maxCookTime}
                    />
                  </View>
                  <View className="flex-1 rounded-chef border border-chef-line bg-chef-panel px-4 py-3">
                    <View className="mb-2 flex-row items-center">
                      <Flame stroke={colors.textMuted} size={17} />
                      <Text className="ml-2 text-chef-xs font-extrabold uppercase text-chef-muted">Calories</Text>
                    </View>
                    <View className="flex-row items-center">
                      <TextInput
                        className="flex-1 text-chef-base font-bold text-chef-cream"
                        keyboardType="number-pad"
                        onChangeText={setMinCalories}
                        placeholder="Min"
                        placeholderTextColor={colors.textMuted}
                        selectionColor={colors.saffron}
                        value={minCalories}
                      />
                      <Text className="mx-2 text-chef-muted">-</Text>
                      <TextInput
                        className="flex-1 text-chef-base font-bold text-chef-cream"
                        keyboardType="number-pad"
                        onChangeText={setMaxCalories}
                        placeholder="Max"
                        placeholderTextColor={colors.textMuted}
                        selectionColor={colors.saffron}
                        value={maxCalories}
                      />
                    </View>
                  </View>
                </View>

                <View className="mt-5">
                  <Text className="mb-3 text-chef-sm font-extrabold uppercase text-chef-muted">Sort</Text>
                  <View className="flex-row gap-2">
                    {sortOptions.map((option) => {
                      const isSelected = option.value === sort;

                      return (
                        <Pressable
                          className={`h-11 flex-1 items-center justify-center rounded-chef border px-2 ${
                            isSelected ? "border-chef-saffron bg-chef-saffron" : "border-chef-line bg-chef-panel"
                          }`}
                          key={option.value}
                          onPress={() => setSort(option.value)}
                        >
                          <Text className={`text-center text-chef-xs font-extrabold ${isSelected ? "text-chef-black" : "text-chef-cream"}`}>
                            {option.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View className="my-5 flex-row items-center justify-between">
                  <Text className="text-chef-xl font-extrabold text-chef-cream">Results</Text>
                  <View className="flex-row items-center">
                    {isLoading ? <ActivityIndicator color={colors.saffron} size="small" /> : null}
                    <Text className="ml-2 text-chef-sm font-extrabold text-chef-saffron">{String(filteredRecipes.length)}</Text>
                  </View>
                </View>
              </View>
            </>
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
