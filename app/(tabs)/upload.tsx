import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { ImagePlus, MapPin, Utensils } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, ImageBackground, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { DynamicFieldList } from "@/components/DynamicFieldList";
import { FormInput } from "@/components/FormInput";
import { colors } from "@/constants/theme";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { createRecipe, getRecipeErrorMessage } from "@/services/recipeService";

type UploadField =
  | "title"
  | "description"
  | "country"
  | "cuisine"
  | "ingredients"
  | "steps"
  | "tags"
  | "image";
type UploadErrors = Partial<Record<UploadField, string>>;

const initialIngredients = [""];
const initialSteps = [""];
const initialTags = [""];

export default function UploadTab() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [country, setCountry] = useState("");
  const [cuisine, setCuisine] = useState("");
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
          ? t("upload.errors.imagePermission")
          : t("upload.errors.imagePermissionDisabled");

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
      const message = t("upload.errors.imageSelectError");

      setErrors((current) => ({ ...current, image: message }));
      showToast(message, "error");
    }
  }

  function validateForm() {
    const cleanedIngredients = ingredients.map((item) => item.trim()).filter(Boolean);
    const cleanedSteps = steps.map((item) => item.trim()).filter(Boolean);
    const cleanedTags = tags.map((item) => item.trim().replace(/^#/, "")).filter(Boolean);
    const nextErrors: UploadErrors = {};

    if (!title.trim()) {
      nextErrors.title = t("upload.errors.title");
    }

    if (!description.trim()) {
      nextErrors.description = t("upload.errors.description");
    }

    if (!country.trim()) {
      nextErrors.country = t("upload.errors.country");
    }

    if (!cuisine.trim()) {
      nextErrors.cuisine = t("upload.errors.cuisine");
    }

    if (cleanedIngredients.length === 0) {
      nextErrors.ingredients = t("upload.errors.ingredients");
    }

    if (cleanedSteps.length === 0) {
      nextErrors.steps = t("upload.errors.steps");
    }

    if (cleanedTags.length === 0) {
      nextErrors.tags = t("upload.errors.tags");
    }

    if (!imageUri) {
      nextErrors.image = t("upload.errors.image");
    }

    setErrors(nextErrors);

    return {
      isValid: Object.keys(nextErrors).length === 0,
      cleanedIngredients,
      cleanedSteps,
      cleanedTags
    };
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setCountry("");
    setCuisine("");
    setIngredients(initialIngredients);
    setSteps(initialSteps);
    setTags(initialTags);
    setImageUri(null);
    setErrors({});
    setFormError(null);
  }

  async function handleSubmit() {
    if (!user) {
      setFormError(t("upload.errors.notSignedIn"));
      showToast(t("upload.errors.signInBefore"), "error");
      return;
    }

    const validation = validateForm();

    if (!validation.isValid || !imageUri) {
      setFormError(t("upload.errors.fillFields"));
      showToast(t("upload.errors.fillFields"), "error");
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
        ingredients: validation.cleanedIngredients,
        steps: validation.cleanedSteps,
        tags: validation.cleanedTags,
        imageUri,
        authorId: user.id,
        authorName: user.displayName
      });

      resetForm();
      showToast(t("upload.success"), "success");
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
              <Text className="text-chef-sm font-bold uppercase text-chef-saffron">{t("upload.title")}</Text>
              <Text className="mt-2 text-[32px] font-extrabold leading-10 text-chef-cream">{t("upload.headerTitle")}</Text>
              <Text className="mt-3 text-chef-base leading-7 text-chef-muted">
                {t("upload.subtitle")}
              </Text>
            </View>

            <View className="px-6">
              <Pressable className="overflow-hidden rounded-chef border border-chef-line bg-chef-panel" onPress={pickImage}>
                {imageUri ? (
                  <ImageBackground source={{ uri: imageUri }} className="h-60 justify-end" resizeMode="cover">
                    <View className="bg-chef-black/65 px-5 py-4">
                      <Text className="text-chef-base font-extrabold text-chef-cream">{t("upload.changeImage")}</Text>
                      <Text className="mt-1 text-chef-sm text-chef-muted">{t("upload.tapChoosePhoto")}</Text>
                    </View>
                  </ImageBackground>
                ) : (
                  <View className="h-60 items-center justify-center px-8">
                    <View className="h-16 w-16 items-center justify-center rounded-chef bg-chef-saffron">
                      <ImagePlus stroke={colors.background} size={28} strokeWidth={2.5} />
                    </View>
                    <Text className="mt-5 text-center text-chef-lg font-extrabold text-chef-cream">{t("upload.pickImage")}</Text>
                    <Text className="mt-2 text-center text-chef-sm leading-6 text-chef-muted">{t("upload.choosePhotoPreview")}</Text>
                  </View>
                )}
              </Pressable>
              {isCompressingImage ? (
                <View className="mt-3 flex-row items-center">
                  <ActivityIndicator color={colors.saffron} />
                  <Text className="ml-3 text-chef-sm font-semibold text-chef-muted">{t("upload.optimizingImage")}</Text>
                </View>
              ) : null}
              {errors.image ? <Text className="mt-2 text-chef-xs font-medium text-chef-tomato">{errors.image}</Text> : null}
            </View>

            <View className="mt-6 gap-5 px-6">
              <FormInput error={errors.title} label={t("upload.titleLabel")} onChangeText={setTitle} placeholder={t("upload.titlePlaceholder")} value={title} />
              <FormInput
                error={errors.description}
                label={t("upload.descLabel")}
                multiline
                numberOfLines={4}
                onChangeText={setDescription}
                placeholder={t("upload.descPlaceholder")}
                textAlignVertical="top"
                value={description}
              />
              <FormInput
                error={errors.country}
                label={t("upload.countryLabel")}
                leftIcon={<MapPin stroke={colors.textMuted} size={20} />}
                onChangeText={setCountry}
                placeholder={t("upload.countryPlaceholder")}
                value={country}
              />
              <FormInput
                error={errors.cuisine}
                label={t("upload.cuisineLabel")}
                leftIcon={<Utensils stroke={colors.textMuted} size={20} />}
                onChangeText={setCuisine}
                placeholder={t("upload.cuisinePlaceholder")}
                value={cuisine}
              />


              <DynamicFieldList
                error={errors.ingredients}
                onChangeValues={setIngredients}
                placeholder={t("upload.ingredientPlaceholder")}
                title={t("upload.ingredientsTitle")}
                values={ingredients}
              />

              <DynamicFieldList
                error={errors.steps}
                multiline
                onChangeValues={setSteps}
                placeholder={t("upload.stepPlaceholder")}
                title={t("upload.stepsTitle")}
                values={steps}
              />

              <DynamicFieldList
                error={errors.tags}
                onChangeValues={setTags}
                placeholder={t("upload.tagPlaceholder")}
                title={t("upload.tagsTitle")}
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
                title={isUploading ? t("upload.uploadingRecipe") : t("upload.publishRecipe")}
              />

              {isUploading ? (
                <View className="flex-row items-center justify-center">
                  <ActivityIndicator color={colors.saffron} />
                  <Text className="ml-3 text-chef-sm font-semibold text-chef-muted">{t("upload.savingRecipe")}</Text>
                </View>
              ) : null}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
