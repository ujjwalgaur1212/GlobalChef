import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  Modal,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  FlatList,
  Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  CalendarDays,
  Check,
  ChevronRight,
  Plus,
  RefreshCw,
  ShoppingBag,
  Settings,
  Trash2,
  Edit3,
  X,
  Flame,
  Clock,
  Sparkles,
  History,
  Info
} from "lucide-react-native";

import { colors } from "@/constants/theme";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { useRecipeInteractions } from "@/hooks/useRecipeInteractions";
import { MealPlannerService } from "@/services/mealPlannerService";
import type {
  UserPreferences,
  MealPlan,
  MealPlanItem,
  MealType,
  GroceryItem,
  MealGoal,
  MealDiet,
  MealsPerDayCount,
  MealAllergy,
  MealCuisine
} from "@/types/mealPlanner";
import type { Recipe } from "@/types/recipe";

const GOALS: MealGoal[] = ["Weight Loss", "Maintain Weight", "Muscle Gain", "Healthy Eating"];
const DIETS: MealDiet[] = ["Vegetarian", "Vegan", "Non-Vegetarian", "Pescatarian"];
const MEALS_COUNT: MealsPerDayCount[] = [3, 4, 5, 6];
const ALLERGIES: MealAllergy[] = ["Nuts", "Dairy", "Gluten", "Eggs", "Shellfish"];
const CUISINES: MealCuisine[] = ["Indian", "Italian", "American", "Mexican", "Chinese", "Any"];

export default function MealPlannerScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { likedRecipeIds, savedRecipeIds } = useRecipeInteractions(user?.id);

  // States
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [activePlan, setActivePlan] = useState<MealPlan | null>(null);
  const [activePlanItems, setActivePlanItems] = useState<MealPlanItem[]>([]);
  const [previousPlans, setPreviousPlans] = useState<MealPlan[]>([]);
  const [cookedRecipeIds, setCookedRecipeIds] = useState<Set<string>>(new Set());
  const [recommendedRecipes, setRecommendedRecipes] = useState<Recipe[]>([]);

  // UI Load & Modals States
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegeneratingMealId, setIsRegeneratingMealId] = useState<string | null>(null);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);

  // Preference Form local state
  const [formGoal, setFormGoal] = useState<MealGoal>("Healthy Eating");
  const [formDiet, setFormDiet] = useState<MealDiet>("Non-Vegetarian");
  const [formMealsPerDay, setFormMealsPerDay] = useState<MealsPerDayCount>(3);
  const [formAllergies, setFormAllergies] = useState<MealAllergy[]>([]);
  const [formCuisines, setFormCuisines] = useState<MealCuisine[]>(["Any"]);

  // Navigation states
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [isEditingPreferences, setIsEditingPreferences] = useState<boolean>(false);
  
  // Dialog / Modal triggers
  const [showGroceryModal, setShowGroceryModal] = useState(false);
  const [groceryList, setGroceryList] = useState<GroceryItem[]>([]);
  const [isGroceryLoading, setIsGroceryLoading] = useState(false);
  const [checkedGroceryItems, setCheckedGroceryItems] = useState<Set<string>>(new Set());

  const [selectedPlanItem, setSelectedPlanItem] = useState<MealPlanItem | null>(null);
  const [showPlanListModal, setShowPlanListModal] = useState(false);
  const [planToRename, setPlanToRename] = useState<MealPlan | null>(null);
  const [renameText, setRenameText] = useState("");

  const [showDurationModal, setShowDurationModal] = useState(false);

  // Load preferences, active plan, previous plans and recommendation data
  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      // 1. Fetch user preferences
      const prefs = await MealPlannerService.getUserPreferences(user.id);
      if (prefs) {
        setPreferences(prefs);
        setFormGoal(prefs.goal);
        setFormDiet(prefs.diet);
        setFormMealsPerDay(prefs.mealsPerDay);
        setFormAllergies(prefs.allergies ?? []);
        setFormCuisines(prefs.cuisines ?? ["Any"]);
      } else {
        // Force preference creation on first visit
        setIsEditingPreferences(true);
      }

      // 2. Fetch history list
      const history = await MealPlannerService.getUserMealPlans(user.id);
      setPreviousPlans(history);

      // Check if there's a cached active plan in AsyncStorage to restore on reload, else use the latest plan
      const savedActivePlanId = await AsyncStorage.getItem(`@active_meal_plan_id_${user.id}`);
      let targetPlan: MealPlan | null = null;
      if (savedActivePlanId) {
        targetPlan = history.find((p) => p.id === savedActivePlanId) || null;
      }
      if (!targetPlan && history.length > 0) {
        targetPlan = history[0];
      }

      if (targetPlan) {
        setActivePlan(targetPlan);
        const items = await MealPlannerService.getMealPlanItems(targetPlan.id);
        setActivePlanItems(items);
        await AsyncStorage.setItem(`@active_meal_plan_id_${user.id}`, targetPlan.id);
      } else {
        setActivePlan(null);
        setActivePlanItems([]);
      }

      // 3. Fetch cooked recipe IDs from local AsyncStorage
      const allKeys = await AsyncStorage.getAllKeys();
      const cookedKeys = allKeys.filter((key) => key.startsWith("@cooked_"));
      const cookedIdsSet = new Set<string>();
      for (const key of cookedKeys) {
        const val = await AsyncStorage.getItem(key);
        if (val === "true") {
          cookedIdsSet.add(key.replace("@cooked_", ""));
        }
      }
      setCookedRecipeIds(cookedIdsSet);

      // 4. Fetch recommendations
      if (prefs) {
        const recs = await MealPlannerService.getAIRecommendations(
          user.id,
          likedRecipeIds,
          savedRecipeIds,
          cookedIdsSet,
          prefs
        );
        setRecommendedRecipes(recs);
      }
    } catch (e) {
      console.error("Failed to load Meal Planner data:", e);
      showToast(t("mealPlanner.loadError", "Failed to load meal planner configurations."), "error");
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, likedRecipeIds, savedRecipeIds, showToast, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Pull to refresh action
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  // Preference Form multi-select helpers
  const toggleAllergy = (allergy: MealAllergy) => {
    setFormAllergies((current) =>
      current.includes(allergy)
        ? current.filter((item) => item !== allergy)
        : [...current, allergy]
    );
  };

  const toggleCuisine = (cuisine: MealCuisine) => {
    if (cuisine === "Any") {
      setFormCuisines(["Any"]);
      return;
    }
    setFormCuisines((current) => {
      const next = current.filter((c) => c !== "Any");
      if (next.includes(cuisine)) {
        const filtered = next.filter((item) => item !== cuisine);
        return filtered.length === 0 ? ["Any"] : filtered;
      } else {
        return [...next, cuisine];
      }
    });
  };

  // Save Preferences to Firestore
  const handleSavePreferences = async () => {
    if (!user?.id) return;
    setIsSavingPrefs(true);
    try {
      const updatedPrefs: UserPreferences = {
        userId: user.id,
        goal: formGoal,
        diet: formDiet,
        mealsPerDay: formMealsPerDay,
        allergies: formAllergies,
        cuisines: formCuisines
      };
      await MealPlannerService.saveUserPreferences(updatedPrefs);
      setPreferences(updatedPrefs);
      setIsEditingPreferences(false);
      showToast(t("mealPlanner.prefsSaved", "Preferences saved successfully!"), "success");

      // Reload recommendations based on new preferences
      const recs = await MealPlannerService.getAIRecommendations(
        user.id,
        likedRecipeIds,
        savedRecipeIds,
        cookedRecipeIds,
        updatedPrefs
      );
      setRecommendedRecipes(recs);
    } catch (error) {
      console.error(error);
      showToast(t("mealPlanner.prefsError", "Failed to save preferences."), "error");
    } finally {
      setIsSavingPrefs(false);
    }
  };

  // Create a new Meal Plan
  const handleGenerateMealPlan = async (days: number) => {
    if (!user?.id || !preferences) return;
    setShowDurationModal(false);
    setIsGenerating(true);
    setSelectedDay(1);
    try {
      const result = await MealPlannerService.generateMealPlan(
        user.id,
        preferences,
        days
      );
      
      const newPlan: MealPlan = {
        id: result.planId,
        userId: user.id,
        planName: `${preferences.goal} Plan - ${days} Day${days > 1 ? "s" : ""}`,
        daysCount: days,
        createdAt: new Date()
      };

      setActivePlan(newPlan);
      setActivePlanItems(result.items);
      await AsyncStorage.setItem(`@active_meal_plan_id_${user.id}`, result.planId);
      
      // Update history list
      const history = await MealPlannerService.getUserMealPlans(user.id);
      setPreviousPlans(history);

      showToast(t("mealPlanner.planGenerated", "Your personalized meal plan is ready!"), "success");
    } catch (error) {
      console.error(error);
      showToast(t("mealPlanner.generationError", "Error generating meal plan. Check your connection."), "error");
    } finally {
      setIsGenerating(false);
    }
  };

  // Load a plan from history
  const handleSelectPlan = async (plan: MealPlan) => {
    if (!user?.id) return;
    setIsLoading(true);
    setShowPlanListModal(false);
    try {
      const items = await MealPlannerService.getMealPlanItems(plan.id);
      setActivePlan(plan);
      setActivePlanItems(items);
      setSelectedDay(1);
      await AsyncStorage.setItem(`@active_meal_plan_id_${user.id}`, plan.id);
      showToast(t("mealPlanner.planLoaded", "Loaded saved plan successfully."), "success");
    } catch (error) {
      console.error(error);
      showToast(t("mealPlanner.planLoadError", "Failed to load meal plan."), "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Delete plan
  const handleDeletePlan = async (planId: string) => {
    Alert.alert(
      t("mealPlanner.deleteTitle", "Delete Meal Plan"),
      t("mealPlanner.deleteMessage", "Are you sure you want to delete this meal plan permanently?"),
      [
        { text: t("common.cancel", "Cancel"), style: "cancel" },
        {
          text: t("common.delete", "Delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await MealPlannerService.deleteMealPlan(planId);
              showToast(t("mealPlanner.planDeleted", "Meal plan deleted."), "success");

              // Clear active screen states if deleting the current plan
              if (activePlan?.id === planId) {
                setActivePlan(null);
                setActivePlanItems([]);
                if (user?.id) {
                  await AsyncStorage.removeItem(`@active_meal_plan_id_${user.id}`);
                }
              }

              // Refresh list
              if (user?.id) {
                const history = await MealPlannerService.getUserMealPlans(user.id);
                setPreviousPlans(history);
              }
            } catch (error) {
              console.error(error);
              showToast(t("mealPlanner.deleteError", "Could not delete plan."), "error");
            }
          }
        }
      ]
    );
  };

  // Rename plan
  const handleRenamePlan = async () => {
    if (!planToRename || !renameText.trim()) return;
    try {
      await MealPlannerService.renameMealPlan(planToRename.id, renameText.trim());
      showToast(t("mealPlanner.planRenamed", "Plan renamed successfully."), "success");
      
      // Update local states
      if (activePlan?.id === planToRename.id) {
        setActivePlan((prev) => prev ? { ...prev, planName: renameText.trim() } : null);
      }
      setPlanToRename(null);
      setRenameText("");

      if (user?.id) {
        const history = await MealPlannerService.getUserMealPlans(user.id);
        setPreviousPlans(history);
      }
    } catch (error) {
      console.error(error);
      showToast(t("mealPlanner.renameError", "Failed to rename plan."), "error");
    }
  };

  // Swap out a single meal item in the current plan
  const handleRegenerateMeal = async (item: MealPlanItem) => {
    if (!activePlan || !preferences) return;
    setIsRegeneratingMealId(item.id);
    try {
      const newItem = await MealPlannerService.regenerateSingleMeal(
        activePlan.id,
        item,
        preferences
      );
      
      // Update plan items state
      setActivePlanItems((current) =>
        current.map((pItem) => (pItem.id === item.id ? newItem : pItem))
      );

      showToast(t("mealPlanner.mealSwapped", "Meal updated successfully!"), "success");
    } catch (error) {
      console.error(error);
      showToast(t("mealPlanner.swapError", "Failed to swap meal. Try again."), "error");
    } finally {
      setIsRegeneratingMealId(null);
    }
  };

  // Open / fetch Grocery List
  const handleOpenGroceryList = async () => {
    if (activePlanItems.length === 0) return;
    setShowGroceryModal(true);
    setIsGroceryLoading(true);
    setCheckedGroceryItems(new Set());
    try {
      // Gather all ingredients from the items in our plan
      const rawIngredients = activePlanItems.reduce<string[]>((acc, item) => {
        return [...acc, ...item.ingredients];
      }, []);
      
      const consolidated = await MealPlannerService.generateGroceryList(rawIngredients);
      setGroceryList(consolidated);
    } catch (error) {
      console.error(error);
      showToast(t("mealPlanner.groceryError", "Could not compile grocery list."), "error");
    } finally {
      setIsGroceryLoading(false);
    }
  };

  // Toggle grocery list checkmarks
  const toggleGroceryCheck = (itemName: string) => {
    setCheckedGroceryItems((current) => {
      const next = new Set(current);
      if (next.has(itemName)) {
        next.delete(itemName);
      } else {
        next.add(itemName);
      }
      return next;
    });
  };

  // Active meals filtered by the currently selected Day
  const currentDayMeals = useMemo(() => {
    return activePlanItems.filter((item) => item.dayNumber === selectedDay);
  }, [activePlanItems, selectedDay]);

  // Sum up estimated calories for the selected Day
  const currentDayTotalCalories = useMemo(() => {
    return currentDayMeals.reduce((sum, item) => sum + (item.calories || 0), 0);
  }, [currentDayMeals]);

  // Tap handler to open a plan card
  const handleMealCardPress = (item: MealPlanItem) => {
    if (item.recipeId) {
      // Navigate to the native recipe details page
      router.push({
        pathname: "/recipe/[id]",
        params: { id: item.recipeId }
      });
    } else {
      // Open synthetic detail modal
      setSelectedPlanItem(item);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-chef-black px-4">
      {/* Top Navbar */}
      <View className="mb-4 flex-row items-center justify-between border-b border-chef-line pb-3 pt-2">
        <View className="flex-row items-center gap-2">
          <CalendarDays color={colors.saffron} size={28} />
          <Text className="text-chef-xl font-extrabold text-chef-cream">Meal Planner</Text>
        </View>
        
        {preferences && (
          <View className="flex-row items-center gap-3">
            <Pressable
              onPress={() => setShowPlanListModal(true)}
              className="rounded-full bg-chef-charcoal p-2.5 active:bg-chef-panel"
            >
              <History color={colors.text} size={20} />
            </Pressable>
            <Pressable
              onPress={() => setIsEditingPreferences(true)}
              className="rounded-full bg-chef-charcoal p-2.5 active:bg-chef-panel"
            >
              <Settings color={colors.text} size={20} />
            </Pressable>
          </View>
        )}
      </View>

      {/* Main View state switcher */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.saffron} />
          <Text className="mt-4 text-chef-sm font-semibold text-chef-muted">Retrieving your preferences...</Text>
        </View>
      ) : isEditingPreferences ? (
        /* Preferences Form view */
        <ScrollView
          showsVerticalScrollIndicator={false}
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <View className="mb-6 rounded-chef bg-chef-charcoal p-5 border border-chef-line">
            <View className="mb-4 flex-row items-center gap-2">
              <Sparkles color={colors.saffron} size={18} strokeWidth={2.5} />
              <Text className="text-chef-lg font-extrabold text-chef-cream">Diet & Wellness Profile</Text>
            </View>
            <Text className="text-chef-xs text-chef-muted leading-5">
              Customize your profile so HiChef can generate a hyper-personalized plan that matches your calories, diet type, and keeps allergen items out of your kitchen.
            </Text>
          </View>

          {/* Goal Selector */}
          <Text className="mb-3 text-chef-base font-extrabold text-chef-cream">Primary Fitness Goal</Text>
          <View className="mb-4 flex-row flex-wrap justify-between">
            {GOALS.map((goal) => {
              const selected = formGoal === goal;
              return (
                <Pressable
                  key={goal}
                  onPress={() => setFormGoal(goal)}
                  className={`rounded-chef border px-4 py-3 w-[48%] mb-3 items-center justify-center ${
                    selected ? "bg-chef-saffron/15 border-chef-saffron" : "bg-chef-charcoal border-chef-line"
                  }`}
                >
                  <Text className={`text-chef-sm font-bold text-center ${selected ? "text-chef-saffron" : "text-chef-cream"}`}>
                    {goal}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Diet Selector */}
          <Text className="mb-3 text-chef-base font-extrabold text-chef-cream">Diet Type</Text>
          <View className="mb-4 flex-row flex-wrap justify-between">
            {DIETS.map((diet) => {
              const selected = formDiet === diet;
              return (
                <Pressable
                  key={diet}
                  onPress={() => setFormDiet(diet)}
                  className={`rounded-chef border px-4 py-3 w-[48%] mb-3 items-center justify-center ${
                    selected ? "bg-chef-saffron/15 border-chef-saffron" : "bg-chef-charcoal border-chef-line"
                  }`}
                >
                  <Text className={`text-chef-sm font-bold text-center ${selected ? "text-chef-saffron" : "text-chef-cream"}`}>
                    {diet}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Meals Per Day */}
          <Text className="mb-3 text-chef-base font-extrabold text-chef-cream">Meals Per Day</Text>
          <View className="mb-5 flex-row -mx-1">
            {MEALS_COUNT.map((count) => {
              const selected = formMealsPerDay === count;
              return (
                <Pressable
                  key={count}
                  onPress={() => setFormMealsPerDay(count)}
                  className={`flex-1 mx-1 rounded-chef border py-3 items-center justify-center ${
                    selected ? "bg-chef-saffron/15 border-chef-saffron" : "bg-chef-charcoal border-chef-line"
                  }`}
                >
                  <Text className={`text-chef-sm font-extrabold ${selected ? "text-chef-saffron" : "text-chef-cream"}`}>
                    {count}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Allergies Multi-select */}
          <Text className="mb-3 text-chef-base font-extrabold text-chef-cream">Allergies / Avoidances</Text>
          <View className="mb-4 flex-row flex-wrap">
            {ALLERGIES.map((allergy) => {
              const selected = formAllergies.includes(allergy);
              return (
                <Pressable
                  key={allergy}
                  onPress={() => toggleAllergy(allergy)}
                  className={`rounded-full border px-4 py-2 mr-2 mb-2.5 flex-row items-center ${
                    selected ? "bg-chef-tomato/15 border-chef-tomato" : "bg-chef-charcoal border-chef-line"
                  }`}
                >
                  {selected && <Check color={colors.tomato} size={14} strokeWidth={3} className="mr-1.5" />}
                  <Text className={`text-chef-xs font-bold ${selected ? "text-chef-tomato" : "text-chef-cream"}`}>
                    {allergy}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Cuisine Preferences Multi-select */}
          <Text className="mb-3 text-chef-base font-extrabold text-chef-cream">Cuisine Preferences</Text>
          <View className="mb-5 flex-row flex-wrap">
            {CUISINES.map((cuisine) => {
              const selected = formCuisines.includes(cuisine);
              return (
                <Pressable
                  key={cuisine}
                  onPress={() => toggleCuisine(cuisine)}
                  className={`rounded-full border px-4 py-2 mr-2 mb-2.5 flex-row items-center ${
                    selected ? "bg-chef-saffron/15 border-chef-saffron" : "bg-chef-charcoal border-chef-line"
                  }`}
                >
                  {selected && <Check color={colors.saffron} size={14} strokeWidth={3} className="mr-1.5" />}
                  <Text className={`text-chef-xs font-bold ${selected ? "text-chef-saffron" : "text-chef-cream"}`}>
                    {cuisine}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Actions */}
          <View className="flex-row items-center -mx-1.5">
            {preferences && (
              <TouchableOpacity
                onPress={() => setIsEditingPreferences(false)}
                className="flex-1 mx-1.5 rounded-chef border border-chef-line bg-chef-charcoal py-4 items-center justify-center"
              >
                <Text className="text-chef-sm font-extrabold text-chef-cream">Cancel</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleSavePreferences}
              disabled={isSavingPrefs}
              className="flex-[2] mx-1.5 rounded-chef bg-chef-saffron py-4 items-center justify-center flex-row active:opacity-85"
            >
              {isSavingPrefs ? (
                <ActivityIndicator color={colors.background} size="small" />
              ) : (
                <>
                  <Check color={colors.background} size={16} strokeWidth={3} className="mr-1.5" />
                  <Text className="text-chef-sm font-extrabold text-chef-black">Save & Continue</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        /* Planner Dashboard Panel */
        <View className="flex-1">
          {/* Generation Loader Overlay */}
          {isGenerating && (
            <View className="absolute bottom-0 left-0 right-0 top-0 z-50 items-center justify-center bg-chef-black/90">
              <ActivityIndicator color={colors.saffron} size="large" />
              <Text className="mt-4 text-chef-base font-extrabold text-chef-cream">Generating Meal Plan...</Text>
              <Text className="mt-1 text-center text-chef-xs text-chef-muted max-w-[80%] leading-5">
                AI is compiling balanced meals based on your goal, diet, and ingredient stock.
              </Text>
            </View>
          )}

          {activePlan ? (
            /* Meal Plan contents */
            <FlatList
              data={currentDayMeals}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.saffron} />
              }
              contentContainerStyle={{ paddingBottom: 120 }}
              ListHeaderComponent={
                <View className="mb-4">
                  {/* Plan Information Banner */}
                  <View className="mb-4 rounded-chef bg-chef-charcoal border border-chef-line p-4 flex-row items-center justify-between">
                    <View className="flex-1 pr-3">
                      <Text className="text-chef-xs text-chef-muted font-bold uppercase tracking-wider">Active Meal Plan</Text>
                      <Text className="text-chef-base font-extrabold text-chef-cream" numberOfLines={1}>
                        {activePlan.planName}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={handleOpenGroceryList}
                      className="rounded-chef bg-chef-saffron px-3.5 py-2.5 flex-row items-center gap-1.5 active:opacity-85"
                    >
                      <ShoppingBag color={colors.background} size={16} strokeWidth={2.5} />
                      <Text className="text-chef-xs font-extrabold text-chef-black">Groceries</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Day Picker Segment Tabs */}
                  {activePlan.daysCount > 1 && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      className="mb-4 flex-row"
                    >
                      {Array.from({ length: activePlan.daysCount }).map((_, index) => {
                        const dayNum = index + 1;
                        const isSelected = selectedDay === dayNum;
                        return (
                          <Pressable
                            key={dayNum}
                            onPress={() => setSelectedDay(dayNum)}
                            className={`mr-2.5 rounded-full border px-5 py-2.5 items-center justify-center ${
                              isSelected ? "bg-chef-saffron/15 border-chef-saffron" : "bg-chef-charcoal border-chef-line"
                            }`}
                          >
                            <Text className={`text-chef-xs font-extrabold ${isSelected ? "text-chef-saffron" : "text-chef-muted"}`}>
                              {dayNum === 1 ? "Today" : `Day ${dayNum}`}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  )}

                  {/* Estimated Day Calories Meta row */}
                  <View className="mb-2 flex-row items-center justify-between px-1">
                    <Text className="text-chef-xs text-chef-muted font-bold uppercase">
                      {selectedDay === 1 ? "Today's Menu" : `Day ${selectedDay} Menu`}
                    </Text>
                    <View className="flex-row items-center gap-1">
                      <Flame color={colors.saffron} size={15} />
                      <Text className="text-chef-xs font-bold text-chef-cream">
                        Est: {currentDayTotalCalories} kcal
                      </Text>
                    </View>
                  </View>
                </View>
              }
              renderItem={({ item }) => {
                const isRegenerating = isRegeneratingMealId === item.id;
                return (
                  <View className="mb-4 overflow-hidden rounded-chef border border-chef-line bg-chef-charcoal">
                    <Pressable onPress={() => handleMealCardPress(item)} className="active:opacity-95">
                      <View className="relative h-44 w-full bg-chef-panel">
                        {item.recipeImageUrl ? (
                          <Image
                            source={{ uri: item.recipeImageUrl }}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <View className="flex-1 items-center justify-center">
                            <ActivityIndicator color={colors.saffron} />
                          </View>
                        )}
                        {/* Overlay Gradient */}
                        <View className="absolute bottom-0 left-0 right-0 top-0 bg-gradient-to-t from-chef-black/90 via-chef-black/30 to-transparent" />

                        {/* Floating Meal Type Badge */}
                        <View className="absolute left-3 top-3 rounded-chef bg-chef-saffron px-2.5 py-1">
                          <Text className="text-[11px] font-extrabold uppercase text-chef-black">{item.mealType}</Text>
                        </View>

                        {/* Floating Swap/Regenerate Icon */}
                        <TouchableOpacity
                          disabled={isRegenerating}
                          onPress={() => handleRegenerateMeal(item)}
                          className="absolute right-3 top-3 rounded-full bg-chef-black/60 p-2 border border-chef-line/60 active:bg-chef-black"
                        >
                          {isRegenerating ? (
                            <ActivityIndicator size="small" color={colors.saffron} />
                          ) : (
                            <RefreshCw color={colors.saffron} size={15} strokeWidth={2.5} />
                          )}
                        </TouchableOpacity>

                        {/* Bottom Recipe Details Overlay */}
                        <View className="absolute bottom-3 left-3 right-3">
                          <Text className="text-chef-base font-extrabold text-chef-cream" numberOfLines={1}>
                            {item.recipeTitle}
                          </Text>
                          <View className="mt-1 flex-row items-center gap-3">
                            <View className="flex-row items-center gap-1">
                              <Flame color={colors.saffron} size={13} />
                              <Text className="text-[12px] text-chef-muted font-bold">{item.calories} kcal</Text>
                            </View>
                            <View className="flex-row items-center gap-1">
                              <Clock color={colors.textMuted} size={13} />
                              <Text className="text-[12px] text-chef-muted font-bold">{item.prepTime} mins</Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    </Pressable>
                  </View>
                );
              }}
              ListFooterComponent={
                /* Recommendation Section */
                recommendedRecipes.length > 0 ? (
                  <View className="mt-6">
                    <View className="mb-3 flex-row items-center justify-between">
                      <Text className="text-chef-base font-extrabold text-chef-cream">Recommended For You</Text>
                      <Sparkles color={colors.saffron} size={16} />
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {recommendedRecipes.map((recipe) => (
                        <Pressable
                          key={recipe.id}
                          onPress={() => {
                            router.push({
                              pathname: "/recipe/[id]",
                              params: { id: recipe.id }
                            });
                          }}
                          className="mr-3 w-40 overflow-hidden rounded-chef border border-chef-line bg-chef-charcoal pb-2 active:opacity-90"
                        >
                          <Image
                            source={{ uri: recipe.imageUrl }}
                            className="h-24 w-full object-cover"
                          />
                          <View className="p-2">
                            <Text className="text-chef-xs font-bold text-chef-cream" numberOfLines={1}>
                              {recipe.title}
                            </Text>
                            <Text className="mt-0.5 text-[10px] text-chef-muted">
                              {recipe.cuisine} • {recipe.likesCount || recipe.likes || 0} likes
                            </Text>
                          </View>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                ) : null
              }
            />
          ) : (
            /* Empty State: Create a Plan */
            <ScrollView
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.saffron} />
              }
              contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center", paddingBottom: 40 }}
            >
              <View className="items-center justify-center p-8 bg-chef-charcoal border border-chef-line rounded-chef max-w-sm">
                <CalendarDays color={colors.saffron} size={54} strokeWidth={1.5} />
                <Text className="mt-5 text-chef-lg font-extrabold text-chef-cream text-center">No Active Meal Plan</Text>
                
                {preferences ? (
                  <>
                    <Text className="mt-2 text-center text-chef-xs text-chef-muted leading-5">
                      Ready to build your menu? Tell us the duration and our AI will draft a complete meal calendar customized for <Text className="font-extrabold text-chef-saffron">{preferences.goal}</Text> and <Text className="font-extrabold text-chef-saffron">{preferences.diet}</Text>.
                    </Text>
                    
                    <TouchableOpacity
                      onPress={() => setShowDurationModal(true)}
                      className="mt-6 w-full rounded-chef bg-chef-saffron py-3.5 items-center justify-center flex-row gap-2 active:opacity-90"
                    >
                      <Plus color={colors.background} size={18} strokeWidth={3} />
                      <Text className="text-chef-sm font-extrabold text-chef-black">Create Meal Plan</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text className="mt-2 text-center text-chef-xs text-chef-muted leading-5">
                      Configure your diet profile to begin generating personalized nutritional structures.
                    </Text>
                    <TouchableOpacity
                      onPress={() => setIsEditingPreferences(true)}
                      className="mt-6 w-full rounded-chef bg-chef-saffron py-3.5 items-center justify-center flex-row gap-2 active:opacity-90"
                    >
                      <Settings color={colors.background} size={18} strokeWidth={3} />
                      <Text className="text-chef-sm font-extrabold text-chef-black">Setup Profile</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </ScrollView>
          )}

          {/* Floating actions footer (when plan is loaded) */}
          {activePlan && (
            <View className="absolute bottom-5 left-0 right-0 flex-row items-center -mx-1.5 px-0.5">
              <TouchableOpacity
                onPress={() => setShowDurationModal(true)}
                className="flex-1 mx-1.5 rounded-chef bg-chef-charcoal border border-chef-line py-4 items-center justify-center flex-row active:bg-chef-panel shadow-lg"
              >
                <Plus color={colors.saffron} size={16} strokeWidth={3} className="mr-1.5" />
                <Text className="text-chef-xs font-extrabold text-chef-cream">New Plan</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => handleGenerateMealPlan(activePlan.daysCount)}
                className="flex-1 mx-1.5 rounded-chef bg-chef-saffron py-4 items-center justify-center flex-row active:opacity-90 shadow-lg"
              >
                <RefreshCw color={colors.background} size={16} strokeWidth={3} className="mr-1.5" />
                <Text className="text-chef-xs font-extrabold text-chef-black">Regen All</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* MODAL 1: Choose Duration (1/3/7 Days) */}
      <Modal
        visible={showDurationModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDurationModal(false)}
      >
        <View className="flex-1 items-center justify-center bg-chef-black/80 px-6">
          <View className="w-full max-w-sm rounded-chef bg-chef-charcoal border border-chef-line p-5">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-chef-lg font-extrabold text-chef-cream">Plan Duration</Text>
              <Pressable onPress={() => setShowDurationModal(false)}>
                <X color={colors.textMuted} size={20} />
              </Pressable>
            </View>
            <Text className="mb-4 text-chef-xs text-chef-muted leading-5">
              Select the number of days for your personalized plan.
            </Text>
            
            <View className="mt-1">
              {[
                { label: "Today (1 Day)", days: 1 },
                { label: "3 Days Plan", days: 3 },
                { label: "7 Days Plan", days: 7 }
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.days}
                  onPress={() => handleGenerateMealPlan(opt.days)}
                  className="w-full rounded-chef bg-chef-panel border border-chef-line/60 py-3.5 mb-3 items-center justify-center flex-row active:bg-chef-line"
                >
                  <Text className="text-chef-sm font-bold text-chef-cream">{opt.label}</Text>
                  <ChevronRight color={colors.saffron} size={15} className="ml-1.5" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: Grocery List Consumed Sheet */}
      <Modal
        visible={showGroceryModal}
        animationType="slide"
        onRequestClose={() => setShowGroceryModal(false)}
      >
        <SafeAreaView className="flex-1 bg-chef-black px-4">
          <View className="mb-4 flex-row items-center justify-between border-b border-chef-line pb-3 pt-2">
            <View className="flex-row items-center gap-2">
              <ShoppingBag color={colors.saffron} size={22} />
              <Text className="text-chef-lg font-extrabold text-chef-cream">Merged Grocery List</Text>
            </View>
            <Pressable
              onPress={() => setShowGroceryModal(false)}
              className="rounded-full bg-chef-charcoal p-1.5"
            >
              <X color={colors.text} size={18} />
            </Pressable>
          </View>

          {isGroceryLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color={colors.saffron} size="large" />
              <Text className="mt-4 text-chef-xs text-chef-muted font-bold uppercase">Consolidating ingredients...</Text>
            </View>
          ) : groceryList.length === 0 ? (
            <View className="flex-1 items-center justify-center">
              <Text className="text-chef-sm text-chef-muted">No items in the grocery list.</Text>
            </View>
          ) : (
            <FlatList
              data={groceryList}
              keyExtractor={(item, index) => `${item.ingredient}_${index}`}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isChecked = checkedGroceryItems.has(item.ingredient);
                return (
                  <Pressable
                    onPress={() => toggleGroceryCheck(item.ingredient)}
                    className="mb-2.5 flex-row items-center justify-between rounded-chef bg-chef-charcoal border border-chef-line p-3.5 active:bg-chef-panel"
                  >
                    <View className="flex-row items-center">
                      <View className={`h-5 w-5 rounded items-center justify-center border mr-3 ${
                        isChecked ? "bg-chef-saffron border-chef-saffron" : "border-chef-line"
                      }`}>
                        {isChecked && <Check color={colors.background} size={13} strokeWidth={3} />}
                      </View>
                      <Text className={`text-chef-sm font-bold ${isChecked ? "text-chef-muted line-through" : "text-chef-cream"}`}>
                        {item.ingredient}
                      </Text>
                    </View>
                    <Text className={`text-chef-xs font-extrabold px-2 py-0.5 rounded bg-chef-panel ${isChecked ? "text-chef-muted" : "text-chef-saffron"}`}>
                      {item.quantity}
                    </Text>
                  </Pressable>
                );
              }}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* MODAL 3: Custom AI Recipe Details View (for recipeId = null) */}
      <Modal
        visible={selectedPlanItem !== null}
        animationType="slide"
        onRequestClose={() => setSelectedPlanItem(null)}
      >
        {selectedPlanItem && (
          <SafeAreaView className="flex-1 bg-chef-black">
            <View className="mb-2 flex-row items-center justify-between border-b border-chef-line px-4 pb-3 pt-2">
              <View className="rounded-chef bg-chef-saffron px-2.5 py-1">
                <Text className="text-[10px] font-extrabold uppercase text-chef-black">{selectedPlanItem.mealType}</Text>
              </View>
              <Pressable
                onPress={() => setSelectedPlanItem(null)}
                className="rounded-full bg-chef-charcoal p-1.5"
              >
                <X color={colors.text} size={18} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-4 pb-10">
              <Image
                source={{ uri: selectedPlanItem.recipeImageUrl }}
                className="h-56 w-full rounded-chef object-cover border border-chef-line mb-4"
              />
              <Text className="text-chef-xl font-extrabold text-chef-cream mb-2">
                {selectedPlanItem.recipeTitle}
              </Text>

              {/* Stats Row */}
              <View className="mb-4 flex-row items-center">
                <View className="flex-row items-center mr-5">
                  <Flame color={colors.saffron} size={16} className="mr-1.5" />
                  <Text className="text-chef-sm text-chef-cream font-bold">{selectedPlanItem.calories} kcal</Text>
                </View>
                <View className="flex-row items-center">
                  <Clock color={colors.textMuted} size={16} className="mr-1.5" />
                  <Text className="text-chef-sm text-chef-cream font-bold">{selectedPlanItem.prepTime} minutes</Text>
                </View>
              </View>

              <View className="mb-4 rounded-chef bg-chef-charcoal p-4 border border-chef-line flex-row">
                <Info color={colors.saffron} size={16} className="mr-2" />
                <Text className="flex-1 text-chef-xs text-chef-muted leading-5">
                  This custom recipe was created by HiChef's AI meal planning generator specifically matching your goal (<Text className="text-chef-cream font-bold">{preferences?.goal}</Text>) and diet preferences (<Text className="text-chef-cream font-bold">{preferences?.diet}</Text>).
                </Text>
              </View>

              {/* Ingredients list */}
              <Text className="mb-3 text-chef-lg font-extrabold text-chef-cream">Ingredients</Text>
              <View className="mb-5 bg-chef-charcoal rounded-chef p-4 border border-chef-line">
                {selectedPlanItem.ingredients.map((ing, idx) => (
                  <View key={idx} className="mb-2.5 flex-row items-center">
                    <View className="h-1.5 w-1.5 rounded-full bg-chef-saffron mr-2.5" />
                    <Text className="text-chef-sm text-chef-cream font-semibold">{ing}</Text>
                  </View>
                ))}
              </View>

              {/* Steps list */}
              <Text className="mb-3 text-chef-lg font-extrabold text-chef-cream">Instructions</Text>
              <View className="bg-chef-charcoal rounded-chef p-4 border border-chef-line mb-8">
                {selectedPlanItem.steps.map((step, idx) => (
                  <View key={idx} className="mb-4">
                    <Text className="text-chef-xs text-chef-saffron font-extrabold uppercase">Step {idx + 1}</Text>
                    <Text className="mt-1 text-chef-sm text-chef-cream font-semibold leading-6">{step}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>

      {/* MODAL 4: Meal Plans History List */}
      <Modal
        visible={showPlanListModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPlanListModal(false)}
      >
        <View className="flex-1 justify-end bg-chef-black/60">
          <View className="max-h-[80%] w-full rounded-t-[24px] bg-chef-charcoal border-t border-chef-line p-5">
            <View className="mb-4 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <History color={colors.saffron} size={20} className="mr-2" />
                <Text className="text-chef-lg font-extrabold text-chef-cream">Plan History</Text>
              </View>
              <Pressable
                onPress={() => setShowPlanListModal(false)}
                className="rounded-full bg-chef-panel p-1.5"
              >
                <X color={colors.text} size={18} />
              </Pressable>
            </View>

            {previousPlans.length === 0 ? (
              <View className="py-12 items-center">
                <Text className="text-chef-sm text-chef-muted">No previously saved plans.</Text>
              </View>
            ) : (
              <FlatList
                data={previousPlans}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 30 }}
                renderItem={({ item }) => {
                  const isActive = activePlan?.id === item.id;
                  return (
                    <View className="mb-3 flex-row items-center justify-between rounded-chef bg-chef-panel border border-chef-line/60 p-4">
                      <Pressable
                        onPress={() => handleSelectPlan(item)}
                        className="flex-1 pr-3"
                      >
                        <Text className={`text-chef-sm font-extrabold ${isActive ? "text-chef-saffron" : "text-chef-cream"}`} numberOfLines={1}>
                          {item.planName}
                        </Text>
                        <Text className="mt-1 text-[11px] text-chef-muted">
                          {item.daysCount} Day(s) • {new Date(item.createdAt).toLocaleDateString()}
                        </Text>
                      </Pressable>
                      
                      <View className="flex-row items-center">
                        <TouchableOpacity
                          onPress={() => {
                            setPlanToRename(item);
                            setRenameText(item.planName);
                          }}
                          className="rounded-full p-2 bg-chef-charcoal border border-chef-line/40 mr-2"
                        >
                          <Edit3 color={colors.text} size={14} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeletePlan(item.id)}
                          className="rounded-full p-2 bg-chef-charcoal border border-chef-line/40"
                        >
                          <Trash2 color={colors.tomato} size={14} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* RENAME DIALOG */}
      {planToRename && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setPlanToRename(null)}
        >
          <View className="flex-1 items-center justify-center bg-chef-black/85 px-6">
            <View className="w-full max-w-sm rounded-chef bg-chef-charcoal border border-chef-line p-5">
              <Text className="mb-3 text-chef-base font-extrabold text-chef-cream">Rename Meal Plan</Text>
              
              <TextInput
                value={renameText}
                onChangeText={setRenameText}
                placeholder="Enter new plan name..."
                placeholderTextColor={colors.textMuted}
                className="mb-5 rounded-chef bg-chef-panel border border-chef-line p-3.5 text-chef-sm font-bold text-chef-cream"
              />

              <View className="flex-row items-center -mx-1.5">
                <TouchableOpacity
                  onPress={() => setPlanToRename(null)}
                  className="flex-1 mx-1.5 rounded-chef border border-chef-line py-3 items-center justify-center"
                >
                  <Text className="text-chef-xs font-bold text-chef-cream">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleRenamePlan}
                  className="flex-1 mx-1.5 rounded-chef bg-chef-saffron py-3 items-center justify-center"
                >
                  <Text className="text-chef-xs font-bold text-chef-black">Rename</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}
