import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { ChefHat, Flame, Heart, Search as SearchIcon, Sparkles, Trash2, UserPlus } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, FlatList, Image, ImageBackground, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { RecipeSkeletonList } from "@/components/RecipeSkeleton";
import { SearchBar } from "@/components/SearchBar";
import { colors } from "@/constants/theme";
import { useAuth } from "@/hooks/useAuth";
import { useFollow } from "@/hooks/useFollow";
import { useRecipeInteractions } from "@/hooks/useRecipeInteractions";
import { useToast } from "@/hooks/useToast";
import { getRecipeDiscoveryPage, getRecipeErrorMessage, type RecipePageCursor } from "@/services/recipeService";
import { getChefDiscoveryPage, type UserProfilePageCursor } from "@/services/userService";
import type { Recipe, RecipeSearchSort } from "@/types/recipe";
import type { UserProfile } from "@/types/user";

const SEARCH_HISTORY_KEY = "globalchef.searchHistory.v1";
const PAGE_SIZE = 18;

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function mergeRecipes(...recipeGroups: Recipe[][]) {
  const recipesById = new Map<string, Recipe>();

  recipeGroups.flat().forEach((recipe) => {
    recipesById.set(recipe.id, recipe);
  });

  return Array.from(recipesById.values());
}

function recipeMatchesQuery(recipe: Recipe, query: string) {
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) {
    return true;
  }

  return [
    recipe.title,
    recipe.cuisine,
    recipe.country,
    recipe.authorName,
    ...recipe.ingredients,
    ...recipe.tags
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery);
}

function chefMatchesQuery(chef: UserProfile, query: string) {
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) {
    return true;
  }

  return [chef.displayName, chef.username, chef.country].join(" ").toLowerCase().includes(normalizedQuery);
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

type DiscoveryRailProps = {
  title: string;
  recipes: Recipe[];
  onOpenRecipe: (recipeId: string) => void;
};

function DiscoveryRail({ title, recipes, onOpenRecipe }: DiscoveryRailProps) {
  if (recipes.length === 0) {
    return null;
  }

  return (
    <View className="mt-7">
      <View className="mb-4 flex-row items-center justify-between px-6">
        <Text className="text-chef-xl font-extrabold text-chef-cream">{title}</Text>
        <Sparkles stroke={colors.saffron} size={19} />
      </View>
      <ScrollView contentContainerStyle={{ paddingLeft: 24, paddingRight: 8 }} horizontal showsHorizontalScrollIndicator={false}>
        {recipes.slice(0, 8).map((recipe) => (
          <Pressable className="mr-4 w-60 overflow-hidden rounded-chef border border-chef-line bg-chef-panel" key={recipe.id} onPress={() => onOpenRecipe(recipe.id)}>
            <ImageBackground className="h-36 justify-end" resizeMode="cover" source={{ uri: recipe.imageUrl }}>
              <View className="bg-chef-black/75 p-3">
                <Text className="text-chef-base font-extrabold text-chef-cream" numberOfLines={1}>
                  {recipe.title}
                </Text>
                <View className="mt-2 flex-row items-center justify-between">
                  <Text className="text-chef-xs font-bold text-chef-muted" numberOfLines={1}>
                    {recipe.country}
                  </Text>
                  <View className="flex-row items-center">
                    <Heart stroke={colors.saffron} size={14} />
                    <Text className="ml-1 text-chef-xs font-bold text-chef-saffron">{String(recipe.likesCount)}</Text>
                  </View>
                </View>
              </View>
            </ImageBackground>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

type RecipeResultCardProps = {
  recipe: Recipe;
  isLiked: boolean;
  isLikeLoading: boolean;
  isSaved: boolean;
  isSaveLoading: boolean;
  onLike: (recipeId: string) => void;
  onOpen: (recipeId: string) => void;
  onSave: (recipeId: string) => void;
  onOpenChef?: (chefId: string) => void;
};

function RecipeResultCard({ recipe, isLiked, isLikeLoading, isSaved, isSaveLoading, onLike, onOpen, onSave, onOpenChef }: RecipeResultCardProps) {
  return (
    <Pressable className="flex-row rounded-chef border border-chef-line bg-chef-panel p-3" onPress={() => onOpen(recipe.id)}>
      <Image className="h-28 w-28 rounded-chef" resizeMode="cover" source={{ uri: recipe.imageUrl }} />
      <View className="ml-4 flex-1">
        <Text className="text-chef-lg font-extrabold text-chef-cream" numberOfLines={2}>
          {recipe.title}
        </Text>
        <Pressable
          onPress={(event) => {
            event.stopPropagation();
            if (recipe.authorId && onOpenChef) {
              onOpenChef(recipe.authorId);
            }
          }}
          className="active:opacity-75"
        >
          <Text className="mt-1 text-chef-sm font-semibold text-chef-muted" numberOfLines={1}>
            {recipe.authorName || "HiChef cook"}
          </Text>
        </Pressable>
        <Text className="mt-1 text-chef-xs font-extrabold uppercase text-chef-saffron" numberOfLines={1}>
          {recipe.country} / {recipe.cuisine}
        </Text>
        <View className="mt-3 flex-row items-center justify-between">
          <Pressable
            className="flex-row items-center rounded-full bg-chef-saffron/15 px-3 py-2"
            disabled={!!isLikeLoading}
            onPress={(event) => {
              event.stopPropagation();
              onLike(recipe.id);
            }}
          >
            {isLikeLoading ? <ActivityIndicator color={colors.saffron} size="small" /> : <Heart fill={isLiked ? colors.saffron : "transparent"} stroke={colors.saffron} size={15} />}
            <Text className="ml-2 text-chef-xs font-extrabold text-chef-saffron">{String(recipe.likesCount)}</Text>
          </Pressable>
          <Pressable
            className="rounded-full bg-chef-black px-3 py-2"
            disabled={!!isSaveLoading}
            onPress={(event) => {
              event.stopPropagation();
              onSave(recipe.id);
            }}
          >
            {isSaveLoading ? (
              <ActivityIndicator color={colors.saffron} size="small" />
            ) : (
              <Text className={`text-chef-xs font-extrabold ${isSaved ? "text-chef-saffron" : "text-chef-muted"}`}>{isSaved ? "Saved" : "Save"}</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

type ChefResultCardProps = {
  chef: UserProfile;
  currentUserId: string;
  onOpenChef: (chefId: string) => void;
};

function ChefResultCard({ chef, currentUserId, onOpenChef }: ChefResultCardProps) {
  const { showToast } = useToast();
  const { isFollowing, isLoading, toggleFollow } = useFollow(currentUserId, chef.id);
  const isOwnProfile = chef.id === currentUserId;
  const initials = getInitials(chef.displayName || "HiChef cook") || "HC";

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
    <Pressable className="flex-row items-center rounded-chef border border-chef-line bg-chef-panel p-4" onPress={() => onOpenChef(chef.id)}>
      <View className="h-16 w-16 overflow-hidden rounded-chef bg-chef-saffron/15">
        {chef.photoURL ? (
          <Image className="h-full w-full" resizeMode="cover" source={{ uri: chef.photoURL }} />
        ) : (
          <View className="h-full w-full items-center justify-center">
            <Text className="text-chef-lg font-extrabold text-chef-saffron">{initials}</Text>
          </View>
        )}
      </View>
      <View className="ml-4 flex-1">
        <Text className="text-chef-base font-extrabold text-chef-cream" numberOfLines={1}>
          {chef.displayName}
        </Text>
        <Text className="mt-1 text-chef-xs font-bold text-chef-muted" numberOfLines={1}>
          @{chef.username}
        </Text>
        <Text className="mt-1 text-chef-xs font-extrabold uppercase text-chef-saffron" numberOfLines={1}>
          {chef.country || "HiChef"}
        </Text>
      </View>
      {!isOwnProfile ? (
        <Pressable
          className={`h-10 min-w-24 flex-row items-center justify-center rounded-chef px-3 ${isFollowing ? "bg-chef-black" : "bg-chef-saffron"}`}
          disabled={!!isLoading}
          onPress={(event) => {
            event.stopPropagation();
            handleFollow();
          }}
        >
          {isLoading ? (
            <ActivityIndicator color={isFollowing ? colors.saffron : colors.background} size="small" />
          ) : (
            <>
              <UserPlus stroke={isFollowing ? colors.saffron : colors.background} size={15} />
              <Text className={`ml-2 text-chef-xs font-extrabold ${isFollowing ? "text-chef-saffron" : "text-chef-black"}`}>
                {isFollowing ? "Following" : "Follow"}
              </Text>
            </>
          )}
        </Pressable>
      ) : null}
    </Pressable>
  );
}

export default function SearchTab() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { likedRecipeIds, savedRecipeIds, toggleLikedRecipeById, toggleSavedRecipeById } = useRecipeInteractions(user?.id);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [sort, setSort] = useState<RecipeSearchSort>("newest");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [chefs, setChefs] = useState<UserProfile[]>([]);
  const [newestRecipes, setNewestRecipes] = useState<Recipe[]>([]);
  const [mostLikedRecipes, setMostLikedRecipes] = useState<Recipe[]>([]);
  const [trendingRecipes, setTrendingRecipes] = useState<Recipe[]>([]);
  const [recipeCursor, setRecipeCursor] = useState<RecipePageCursor>(null);
  const [chefCursor, setChefCursor] = useState<UserProfilePageCursor>(null);
  const [hasMoreRecipes, setHasMoreRecipes] = useState(true);
  const [hasMoreChefs, setHasMoreChefs] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [pendingLikeIds, setPendingLikeIds] = useState<Set<string>>(new Set());
  const [pendingSaveIds, setPendingSaveIds] = useState<Set<string>>(new Set());
  const historyLoadedRef = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(SEARCH_HISTORY_KEY)
      .then((storedHistory) => {
        if (storedHistory) {
          const parsedHistory = JSON.parse(storedHistory);
          setSearchHistory(Array.isArray(parsedHistory) ? parsedHistory.slice(0, 8).map(String) : []);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        historyLoadedRef.current = true;
      });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 280);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!historyLoadedRef.current || !debouncedQuery) {
      return;
    }

    setSearchHistory((currentHistory) => {
      const nextHistory = [debouncedQuery, ...currentHistory.filter((item) => normalize(item) !== normalize(debouncedQuery))].slice(0, 8);
      AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(nextHistory)).catch(() => undefined);
      return nextHistory;
    });
  }, [debouncedQuery]);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialDiscovery() {
      setIsLoading(true);

      try {
        const [newestPage, likedPage, trendingPage, chefPage] = await Promise.all([
          getRecipeDiscoveryPage("newest", PAGE_SIZE),
          getRecipeDiscoveryPage("mostLiked", PAGE_SIZE),
          getRecipeDiscoveryPage("mostCommented", PAGE_SIZE),
          getChefDiscoveryPage(PAGE_SIZE)
        ]);

        if (!isMounted) {
          return;
        }

        setNewestRecipes(newestPage.recipes);
        setMostLikedRecipes(likedPage.recipes);
        setTrendingRecipes(trendingPage.recipes);
        setChefs(chefPage.chefs);
        setChefCursor(chefPage.cursor);
        setHasMoreChefs(chefPage.chefs.length === PAGE_SIZE);
        setRecipes(sort === "mostLiked" ? likedPage.recipes : sort === "mostCommented" ? trendingPage.recipes : newestPage.recipes);
        setRecipeCursor(sort === "mostLiked" ? likedPage.cursor : sort === "mostCommented" ? trendingPage.cursor : newestPage.cursor);
        setHasMoreRecipes((sort === "mostLiked" ? likedPage.recipes : sort === "mostCommented" ? trendingPage.recipes : newestPage.recipes).length === PAGE_SIZE);
      } catch (loadError) {
        showToast(getRecipeErrorMessage(loadError), "error");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadInitialDiscovery();

    return () => {
      isMounted = false;
    };
  }, [showToast, sort]);

  const allLoadedRecipes = useMemo(() => mergeRecipes(recipes, newestRecipes, mostLikedRecipes, trendingRecipes), [mostLikedRecipes, newestRecipes, recipes, trendingRecipes]);
  const filteredRecipes = useMemo(
    () => (debouncedQuery ? allLoadedRecipes.filter((recipe) => recipeMatchesQuery(recipe, debouncedQuery)) : recipes),
    [allLoadedRecipes, debouncedQuery, recipes]
  );
  const filteredChefs = useMemo(
    () => (debouncedQuery ? chefs.filter((chef) => chef.id !== user?.id && chefMatchesQuery(chef, debouncedQuery)) : chefs.filter((chef) => chef.id !== user?.id).slice(0, 6)),
    [chefs, debouncedQuery, user?.id]
  );
  const recommendedRecipes = useMemo(() => {
    const likedOrSavedIds = new Set([...Array.from(likedRecipeIds), ...Array.from(savedRecipeIds)]);
    const preferredRecipes = allLoadedRecipes.filter((recipe) => likedOrSavedIds.has(recipe.id));
    const preferredTerms = new Set(preferredRecipes.flatMap((recipe) => [recipe.cuisine, recipe.country].map(normalize)).filter(Boolean));

    if (preferredTerms.size === 0) {
      return mostLikedRecipes.slice(0, 8);
    }

    return allLoadedRecipes.filter((recipe) => preferredTerms.has(normalize(recipe.cuisine)) || preferredTerms.has(normalize(recipe.country))).slice(0, 8);
  }, [allLoadedRecipes, likedRecipeIds, mostLikedRecipes, savedRecipeIds]);

  async function loadMore() {
    if (isLoadingMore || isLoading) {
      return;
    }

    setIsLoadingMore(true);

    try {
      if (hasMoreRecipes) {
        const nextRecipePage = await getRecipeDiscoveryPage(sort, PAGE_SIZE, recipeCursor);
        setRecipes((currentRecipes) => mergeRecipes(currentRecipes, nextRecipePage.recipes));
        setRecipeCursor(nextRecipePage.cursor);
        setHasMoreRecipes(nextRecipePage.recipes.length === PAGE_SIZE);
      }

      if (hasMoreChefs && debouncedQuery) {
        const nextChefPage = await getChefDiscoveryPage(PAGE_SIZE, chefCursor);
        setChefs((currentChefs) => {
          const chefsById = new Map(currentChefs.map((chef) => [chef.id, chef]));
          nextChefPage.chefs.forEach((chef) => chefsById.set(chef.id, chef));
          return Array.from(chefsById.values());
        });
        setChefCursor(nextChefPage.cursor);
        setHasMoreChefs(nextChefPage.chefs.length === PAGE_SIZE);
      }
    } catch (loadError) {
      showToast(getRecipeErrorMessage(loadError), "error");
    } finally {
      setIsLoadingMore(false);
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
      showToast(likeError instanceof Error ? likeError.message : "Could not update this recipe.", "error");
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

  function openChef(chefId: string) {
    router.push({
      pathname: "/chef/[id]",
      params: { id: chefId }
    });
  }

  function clearHistory() {
    setSearchHistory([]);
    AsyncStorage.removeItem(SEARCH_HISTORY_KEY).catch(() => undefined);
  }

  const hasQuery = debouncedQuery.length > 0;
  const hasResults = filteredRecipes.length > 0 || filteredChefs.length > 0;

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
            ) : hasQuery && !hasResults ? (
              <View className="mx-6 rounded-chef border border-chef-line bg-chef-panel px-5 py-8">
                <View className="mx-auto mb-4 h-14 w-14 items-center justify-center rounded-full bg-chef-saffron/15">
                  <SearchIcon stroke={colors.saffron} size={24} />
                </View>
                <Text className="text-center text-chef-lg font-extrabold text-chef-cream">{t("search.noResults")}</Text>
                <Text className="mt-2 text-center text-chef-sm leading-6 text-chef-muted">
                  {t("search.noResultsSubtitle")}
                </Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            isLoadingMore ? (
              <View className="py-6">
                <ActivityIndicator color={colors.saffron} />
              </View>
            ) : null
          }
          ListHeaderComponent={
            <>
              <View className="px-6 pb-5 pt-3">
                <Text className="text-chef-sm font-bold uppercase text-chef-saffron">{t("search.headerTitle")}</Text>
                <Text className="mt-2 text-[32px] font-extrabold leading-10 text-chef-cream">{t("search.headerSubtitle")}</Text>
                <Text className="mt-2 text-chef-base leading-7 text-chef-muted">
                  {t("search.subtitle")}
                </Text>
              </View>

              <View className="px-6">
                <SearchBar onChangeText={setQuery} value={query} />

                {searchHistory.length > 0 ? (
                  <View className="mt-4">
                    <View className="mb-3 flex-row items-center justify-between">
                      <Text className="text-chef-sm font-extrabold uppercase text-chef-muted">{t("search.recentSearches")}</Text>
                      <Pressable className="flex-row items-center" onPress={clearHistory}>
                        <Trash2 stroke={colors.tomato} size={14} />
                        <Text className="ml-1 text-chef-xs font-extrabold text-chef-tomato">{t("search.clearBtn")}</Text>
                      </Pressable>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {searchHistory.map((item) => (
                        <Pressable className="mr-2 rounded-full border border-chef-line bg-chef-panel px-4 py-2" key={item} onPress={() => setQuery(item)}>
                          <Text className="text-chef-xs font-extrabold text-chef-saffron">{item}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                ) : null}

                <View className="mt-5">
                  <Text className="mb-3 text-chef-sm font-extrabold uppercase text-chef-muted">{t("search.sortResults")}</Text>
                  <View className="flex-row gap-2">
                    {[
                      { label: t("search.sortNewest"), value: "newest" },
                      { label: t("search.sortMostLiked"), value: "mostLiked" },
                      { label: t("search.sortDiscussed"), value: "mostCommented" }
                    ].map((option) => {
                      const isSelected = option.value === sort;

                      return (
                        <Pressable
                          className={`h-11 flex-1 items-center justify-center rounded-chef border px-2 ${
                            isSelected ? "border-chef-saffron bg-chef-saffron" : "border-chef-line bg-chef-panel"
                          }`}
                          key={option.value}
                          onPress={() => setSort(option.value as RecipeSearchSort)}
                        >
                          <Text className={`text-center text-chef-xs font-extrabold ${isSelected ? "text-chef-black" : "text-chef-cream"}`}>{option.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>

              {!hasQuery ? (
                <>
                  {isLoading ? (
                    <View className="mt-6">
                      <RecipeSkeletonList />
                    </View>
                  ) : (
                    <>
                      <DiscoveryRail onOpenRecipe={openRecipe} recipes={trendingRecipes} title={t("search.trendingRecipes")} />
                      <DiscoveryRail onOpenRecipe={openRecipe} recipes={mostLikedRecipes} title={t("search.mostLikedRecipes")} />
                      <DiscoveryRail onOpenRecipe={openRecipe} recipes={newestRecipes} title={t("search.newestRecipes")} />
                      <DiscoveryRail onOpenRecipe={openRecipe} recipes={recommendedRecipes} title={t("search.recommendedRecipes")} />
                    </>
                  )}
                </>
              ) : null}

              {filteredChefs.length > 0 ? (
                <View className="mt-7 px-6">
                  <View className="mb-4 flex-row items-center justify-between">
                    <Text className="text-chef-xl font-extrabold text-chef-cream">{t("search.chefResults")}</Text>
                    <ChefHat stroke={colors.saffron} size={20} />
                  </View>
                  <View className="gap-3">
                    {filteredChefs.slice(0, hasQuery ? 12 : 4).map((chef) => (
                      <ChefResultCard chef={chef} currentUserId={String(user?.id ?? "")} key={chef.id} onOpenChef={openChef} />
                    ))}
                  </View>
                </View>
              ) : hasQuery && !isLoading ? (
                <View className="mx-6 mt-7 rounded-chef border border-chef-line bg-chef-panel px-5 py-6">
                  <Text className="text-chef-base font-extrabold text-chef-cream">{t("search.noChefMatches")}</Text>
                  <Text className="mt-2 text-chef-sm leading-6 text-chef-muted">{t("search.noChefMatchesSubtitle")}</Text>
                </View>
              ) : null}

              <View className="mb-4 mt-7 flex-row items-center justify-between px-6">
                <View>
                  <Text className="text-chef-xl font-extrabold text-chef-cream">{hasQuery ? t("search.recipeResults") : t("search.browseRecipes")}</Text>
                  <Text className="mt-1 text-chef-sm font-semibold text-chef-muted">
                    {hasQuery ? t("search.matchingDishes", { count: filteredRecipes.length }) : t("search.scrollDiscoveries")}
                  </Text>
                </View>
                <View className="flex-row items-center rounded-full bg-chef-saffron/15 px-3 py-2">
                  <Flame stroke={colors.saffron} size={15} />
                  <Text className="ml-1 text-chef-xs font-extrabold text-chef-saffron">{sort === "mostLiked" ? t("search.sortMostLiked") : sort === "mostCommented" ? t("search.sortDiscussed") : t("search.sortNewest")}</Text>
                </View>
              </View>
            </>
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.55}
          renderItem={({ item }) => (
            <View className="px-6">
              <RecipeResultCard
                isLiked={likedRecipeIds.has(item.id)}
                isLikeLoading={pendingLikeIds.has(item.id)}
                isSaved={savedRecipeIds.has(item.id)}
                isSaveLoading={pendingSaveIds.has(item.id)}
                onLike={handleLike}
                onOpen={openRecipe}
                onSave={handleSave}
                recipe={item}
                onOpenChef={openChef}
              />
            </View>
          )}
          ItemSeparatorComponent={() => <View className="h-4" />}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </View>
  );
}
