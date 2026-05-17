import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Gauge, ImagePlus, MapPin, Tag, Timer, Utensils } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, ImageBackground, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { DynamicFieldList } from "@/components/DynamicFieldList";
import { FormInput } from "@/components/FormInput";
import { colors } from "@/constants/theme";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { createRecipe, getRecipeErrorMessage } from "@/services/recipeService";
import type { RecipeDifficulty } from "@/types/recipe";

type UploadField =
  | "title"
  | "description"
  | "country"
  | "cuisine"
  | "cookTime"
  | "difficulty"
  | "calories"
  | "ingredients"
  | "steps"
  | "tags"
  | "image";
type UploadErrors = Partial<Record<UploadField, string>>;

const initialIngredients = [""];
const initialSteps = [""];
const initialTags = [""];
const difficultyOptions: RecipeDifficulty[] = ["Easy", "Medium", "Hard"];

export default function UploadTab() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [country, setCountry] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [difficulty, setDifficulty] = useState<RecipeDifficulty>("Easy");
  const [calories, setCalories] = useState("");
  const [ingredients, setIngredients] = useState(initialIngredients);
  const [steps, setSteps] = useState(initialSteps);
  const [tags, setTags] = useState(initialTags);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [errors, setErrors] = useState<UploadErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCompressingImage, setIsCompressingImage] = useState(false);

  async function compressImage(uri: string) {
    setIsCompressingImage(true);

    try {
      const compressedImage = await ImageManipulator.manipulateAsync(
        uri,
        [
          {
            resize: {
              width: 1400
            }
          }
        ],
        {
          compress: 0.76,
          format: ImageManipulator.SaveFormat.JPEG
        }
      );

      return compressedImage.uri;
    } catch {
      showToast("Could not compress the image. The original photo will be used.", "info");
      return uri;
    } finally {
      setIsCompressingImage(false);
    }
  }

  async function pickImage() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        const message = permission.canAskAgain
          ? "Allow photo library access to upload a recipe image."
          : "Photo access is disabled. Enable it in iOS Settings to upload recipe images.";

        setErrors((current) => ({ ...current, image: message }));
        showToast(message, "error");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const compressedUri = await compressImage(result.assets[0].uri);

        setImageUri(compressedUri);
        setErrors((current) => ({ ...current, image: undefined }));
      }
    } catch {
      const message = "Could not open your photo library. Rebuild the iOS app after updating permissions.";

      setErrors((current) => ({ ...current, image: message }));
      showToast(message, "error");
    }
  }

  function validateForm() {
    const cleanedIngredients = ingredients.map((item) => item.trim()).filter(Boolean);
    const cleanedSteps = steps.map((item) => item.trim()).filter(Boolean);
    const cleanedTags = tags.map((item) => item.trim().replace(/^#/, "")).filter(Boolean);
    const caloriesNumber = Number(calories);
    const nextErrors: UploadErrors = {};

    if (!title.trim()) {
      nextErrors.title = "Recipe title is required.";
    }

    if (!description.trim()) {
      nextErrors.description = "Description is required.";
    }

    if (!country.trim()) {
      nextErrors.country = "Country is required.";
    }

    if (!cuisine.trim()) {
      nextErrors.cuisine = "Cuisine type is required.";
    }

    if (!cookTime.trim()) {
      nextErrors.cookTime = "Cooking time is required.";
    }

    if (!difficulty) {
      nextErrors.difficulty = "Choose a difficulty.";
    }

    if (!calories.trim() || Number.isNaN(caloriesNumber) || caloriesNumber <= 0) {
      nextErrors.calories = "Enter calories as a positive number.";
    }

    if (cleanedIngredients.length === 0) {
      nextErrors.ingredients = "Add at least one ingredient.";
    }

    if (cleanedSteps.length === 0) {
      nextErrors.steps = "Add at least one step.";
    }

    if (cleanedTags.length === 0) {
      nextErrors.tags = "Add at least one tag.";
    }

    if (!imageUri) {
      nextErrors.image = "Recipe image is required.";
    }

    setErrors(nextErrors);

    return {
      isValid: Object.keys(nextErrors).length === 0,
      cleanedIngredients,
      cleanedSteps,
      cleanedTags,
      caloriesNumber
    };
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setCountry("");
    setCuisine("");
    setCookTime("");
    setDifficulty("Easy");
    setCalories("");
    setIngredients(initialIngredients);
    setSteps(initialSteps);
    setTags(initialTags);
    setImageUri(null);
    setErrors({});
    setFormError(null);
  }

  async function handleSubmit() {
    if (!user) {
      setFormError("You must be signed in to upload a recipe.");
      showToast("Sign in before uploading a recipe.", "error");
      return;
    }

    const validation = validateForm();

    if (!validation.isValid || !imageUri) {
      setFormError("Complete the required fields before uploading.");
      showToast("Complete the required fields before uploading.", "error");
      return;
    }

    setIsUploading(true);
    setFormError(null);

    try {
      await createRecipe({
        title,
        description,
        country,
        cuisine,
        cookTime,
        difficulty,
        calories: validation.caloriesNumber,
        ingredients: validation.cleanedIngredients,
        steps: validation.cleanedSteps,
        tags: validation.cleanedTags,
        imageUri,
        authorId: user.id,
        authorName: user.displayName
      });

      resetForm();
      showToast("Recipe uploaded to the GlobalChef feed.", "success");
      router.replace("/(tabs)");
    } catch (error) {
      const message = getRecipeErrorMessage(error);
      setFormError(message);
      showToast(message, "error");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <View className="flex-1 bg-chef-black">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={{ paddingBottom: 124 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View className="px-6 pb-6 pt-3">
              <Text className="text-chef-sm font-bold uppercase text-chef-saffron">Upload recipe</Text>
              <Text className="mt-2 text-[32px] font-extrabold leading-10 text-chef-cream">Share a dish with the world.</Text>
              <Text className="mt-3 text-chef-base leading-7 text-chef-muted">
                Add the core recipe details, upload a strong image, and publish it to the GlobalChef feed.
              </Text>
            </View>

            <View className="px-6">
              <Pressable className="overflow-hidden rounded-chef border border-chef-line bg-chef-panel" onPress={pickImage}>
                {imageUri ? (
                  <ImageBackground source={{ uri: imageUri }} className="h-60 justify-end" resizeMode="cover">
                    <View className="bg-chef-black/65 px-5 py-4">
                      <Text className="text-chef-base font-extrabold text-chef-cream">Change image</Text>
                      <Text className="mt-1 text-chef-sm text-chef-muted">Tap to choose another photo</Text>
                    </View>
                  </ImageBackground>
                ) : (
                  <View className="h-60 items-center justify-center px-8">
                    <View className="h-16 w-16 items-center justify-center rounded-chef bg-chef-saffron">
                      <ImagePlus stroke={colors.background} size={28} strokeWidth={2.5} />
                    </View>
                    <Text className="mt-5 text-center text-chef-lg font-extrabold text-chef-cream">Pick a recipe image</Text>
                    <Text className="mt-2 text-center text-chef-sm leading-6 text-chef-muted">Choose a gallery photo to preview before upload.</Text>
                  </View>
                )}
              </Pressable>
              {isCompressingImage ? (
                <View className="mt-3 flex-row items-center">
                  <ActivityIndicator color={colors.saffron} />
                  <Text className="ml-3 text-chef-sm font-semibold text-chef-muted">Optimizing image...</Text>
                </View>
              ) : null}
              {errors.image ? <Text className="mt-2 text-chef-xs font-medium text-chef-tomato">{errors.image}</Text> : null}
            </View>

            <View className="mt-6 gap-5 px-6">
              <FormInput error={errors.title} label="Recipe title" onChangeText={setTitle} placeholder="Kyoto Miso Ramen" value={title} />
              <FormInput
                error={errors.description}
                label="Description"
                multiline
                numberOfLines={4}
                onChangeText={setDescription}
                placeholder="A silky miso bowl with mushrooms, scallions, and a soft egg finish."
                textAlignVertical="top"
                value={description}
              />
              <FormInput
                error={errors.country}
                label="Country"
                leftIcon={<MapPin stroke={colors.textMuted} size={20} />}
                onChangeText={setCountry}
                placeholder="Japan"
                value={country}
              />
              <FormInput
                error={errors.cuisine}
                label="Cuisine type"
                leftIcon={<Utensils stroke={colors.textMuted} size={20} />}
                onChangeText={setCuisine}
                placeholder="Japanese"
                value={cuisine}
              />
              <View className="gap-3">
                <View className="flex-row items-center">
                  <Gauge stroke={colors.textMuted} size={20} />
                  <Text className="ml-2 text-chef-sm font-semibold text-chef-cream">Difficulty</Text>
                </View>
                <View className="flex-row gap-3">
                  {difficultyOptions.map((option) => {
                    const isSelected = option === difficulty;

                    return (
                      <Pressable
                        className={`h-12 flex-1 items-center justify-center rounded-chef border ${
                          isSelected ? "border-chef-saffron bg-chef-saffron" : "border-chef-line bg-chef-panel"
                        }`}
                        key={option}
                        onPress={() => setDifficulty(option)}
                      >
                        <Text className={`text-chef-sm font-extrabold ${isSelected ? "text-chef-black" : "text-chef-cream"}`}>{String(option)}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                {errors.difficulty ? <Text className="text-chef-xs font-medium text-chef-tomato">{errors.difficulty}</Text> : null}
              </View>
              <View className="flex-row gap-4">
                <FormInput
                  className="flex-1"
                  error={errors.cookTime}
                  label="Cooking time"
                  leftIcon={<Timer stroke={colors.textMuted} size={20} />}
                  onChangeText={setCookTime}
                  placeholder="35 min"
                  value={cookTime}
                />
                <FormInput
                  className="flex-1"
                  error={errors.calories}
                  keyboardType="number-pad"
                  label="Calories / nutrition"
                  onChangeText={setCalories}
                  placeholder="520"
                  value={calories}
                />
              </View>

              <DynamicFieldList
                error={errors.ingredients}
                onChangeValues={setIngredients}
                placeholder="Ingredient"
                title="Ingredients"
                values={ingredients}
              />

              <DynamicFieldList
                error={errors.steps}
                multiline
                onChangeValues={setSteps}
                placeholder="Step"
                title="Steps"
                values={steps}
              />

              <DynamicFieldList
                error={errors.tags}
                onChangeValues={setTags}
                placeholder="Tag"
                title="Tags"
                values={tags}
              />

              {formError ? (
                <View className="rounded-chef border border-chef-tomato/40 bg-chef-tomato/10 px-4 py-3">
                  <Text className="text-chef-sm font-semibold text-chef-tomato">{formError}</Text>
                </View>
              ) : null}

              <Button
                isLoading={isUploading || isCompressingImage}
                disabled={!!isCompressingImage}
                onPress={handleSubmit}
                title={isUploading ? "Uploading recipe" : "Publish recipe"}
              />

              {isUploading ? (
                <View className="flex-row items-center justify-center">
                  <ActivityIndicator color={colors.saffron} />
                  <Text className="ml-3 text-chef-sm font-semibold text-chef-muted">Uploading image and saving recipe...</Text>
                </View>
              ) : null}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
