import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Redirect, useRouter } from "expo-router";
import { ArrowLeft, Camera, Globe2, UserRound } from "lucide-react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { FormInput } from "@/components/FormInput";
import { colors } from "@/constants/theme";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { subscribeToUserProfile, updateChefProfile } from "@/services/userService";
import type { UserProfile } from "@/types/user";

type ProfileErrors = Partial<Record<"displayName" | "bio" | "country" | "photo" | "username", string>>;

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part.trim().slice(0, 1))
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, initializing } = useAuth();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    return subscribeToUserProfile(
      user.id,
      (nextProfile) => {
        setProfile(nextProfile);
        setDisplayName((current) => current || nextProfile?.displayName || user.displayName || "");
        setUsername((current) => current || nextProfile?.username || "");
        setBio((current) => current || nextProfile?.bio || "");
        setCountry((current) => current || nextProfile?.country || "");
      },
      (profileError) => {
        setFormError(profileError.message);
      }
    );
  }, [user]);

  async function compressPhoto(uri: string) {
    setIsCompressingPhoto(true);

    try {
      const compressedImage = await ImageManipulator.manipulateAsync(
        uri,
        [
          {
            resize: {
              width: 900
            }
          }
        ],
        {
          compress: 0.78,
          format: ImageManipulator.SaveFormat.JPEG
        }
      );

      return compressedImage.uri;
    } catch {
      showToast("Could not optimize the photo. The original image will be used.", "info");
      return uri;
    } finally {
      setIsCompressingPhoto(false);
    }
  }

  async function pickPhoto() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        const message = permission.canAskAgain
          ? t("editProfile.photoPermission")
          : t("editProfile.photoPermissionDisabled");

        setErrors((current) => ({ ...current, photo: message }));
        showToast(message, "error");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.86
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const compressedUri = await compressPhoto(result.assets[0].uri);

        setPhotoUri(compressedUri);
        setErrors((current) => ({ ...current, photo: undefined }));
      }
    } catch {
      const message = t("editProfile.photoSelectError");

      setErrors((current) => ({ ...current, photo: message }));
      showToast(message, "error");
    }
  }

  function validateForm() {
    const nextErrors: ProfileErrors = {};

    if (!displayName.trim()) {
      nextErrors.displayName = t("editProfile.displayNameRequired");
    }

    if (displayName.trim().length > 60) {
      nextErrors.displayName = t("editProfile.displayNameTooLong");
    }

    if (!username.trim()) {
      nextErrors.username = t("editProfile.usernameRequired", "Username is required.");
    } else if (!/^[a-zA-Z0-9_]{3,30}$/.test(username.trim())) {
      nextErrors.username = t("editProfile.usernameInvalid", "Username must be 3-30 characters (alphanumeric and underscores).");
    }

    if (bio.trim().length > 220) {
      nextErrors.bio = t("editProfile.bioTooLong");
    }

    if (country.trim().length > 56) {
      nextErrors.country = t("editProfile.countryTooLong");
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSave() {
    if (!user) {
      return;
    }

    if (!validateForm()) {
      showToast(t("editProfile.checkFields"), "error");
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      await updateChefProfile({
        userId: user.id,
        displayName,
        username: username.trim().toLowerCase(),
        bio,
        country,
        photoUri
      });
      showToast(t("editProfile.success"), "success");
      router.back();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Could not update profile.";

      setFormError(message);
      showToast(message, "error");
    } finally {
      setIsSaving(false);
    }
  }

  if (initializing) {
    return (
      <View className="flex-1 items-center justify-center bg-chef-black">
        <ActivityIndicator color={colors.saffron} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  const previewUri = photoUri || profile?.photoURL || user.photoURL || null;
  const initials = getInitials(displayName || user.displayName || "HiChef cook") || "HC";

  return (
    <View className="flex-1 bg-chef-black">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
          <ScrollView contentContainerStyle={{ paddingBottom: 48 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View className="px-6 pb-6 pt-3">
              <View className="flex-row items-center justify-between">
                <Pressable className="h-11 w-11 items-center justify-center rounded-full bg-chef-panel" onPress={() => router.back()}>
                  <ArrowLeft stroke={colors.cream} size={22} strokeWidth={2.4} />
                </Pressable>
                <Text className="text-chef-sm font-extrabold uppercase text-chef-saffron">{t("editProfile.title")}</Text>
              </View>

              <Text className="mt-6 text-[32px] font-extrabold leading-10 text-chef-cream">{t("editProfile.headerTitle")}</Text>
              <Text className="mt-3 text-chef-base leading-7 text-chef-muted">
                {t("editProfile.subtitle")}
              </Text>
            </View>

            <View className="items-center px-6">
              <Pressable className="items-center" onPress={pickPhoto}>
                <View className="h-32 w-32 overflow-hidden rounded-chef border border-chef-line bg-chef-panel">
                  {previewUri ? (
                    <Image className="h-full w-full" resizeMode="cover" source={{ uri: previewUri }} />
                  ) : (
                    <View className="h-full w-full items-center justify-center bg-chef-saffron/15">
                      <Text className="text-[36px] font-extrabold text-chef-saffron">{initials}</Text>
                    </View>
                  )}
                </View>
                <View className="mt-4 flex-row items-center rounded-chef bg-chef-saffron px-4 py-3">
                  <Camera stroke={colors.background} size={18} />
                  <Text className="ml-2 text-chef-sm font-extrabold text-chef-black">{t("editProfile.changePhoto")}</Text>
                </View>
              </Pressable>
              {isCompressingPhoto ? (
                <View className="mt-3 flex-row items-center">
                  <ActivityIndicator color={colors.saffron} />
                  <Text className="ml-3 text-chef-sm font-semibold text-chef-muted">{t("editProfile.optimizingPhoto")}</Text>
                </View>
              ) : null}
              {errors.photo ? <Text className="mt-2 text-chef-xs font-medium text-chef-tomato">{errors.photo}</Text> : null}
            </View>

            <View className="mt-8 gap-5 px-6">
              <FormInput
                error={errors.displayName}
                label={t("editProfile.displayNameLabel")}
                leftIcon={<UserRound stroke={colors.textMuted} size={20} />}
                onChangeText={setDisplayName}
                placeholder={t("editProfile.displayNamePlaceholder")}
                value={displayName}
              />
              <FormInput
                error={errors.username}
                label={t("editProfile.usernameLabel", "Username")}
                leftIcon={<UserRound stroke={colors.textMuted} size={20} />}
                onChangeText={(text) => setUsername(text.trim().toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                placeholder={t("editProfile.usernamePlaceholder", "username")}
                value={username}
              />
              <FormInput
                error={errors.country}
                label={t("editProfile.countryLabel")}
                leftIcon={<Globe2 stroke={colors.textMuted} size={20} />}
                onChangeText={setCountry}
                placeholder={t("editProfile.countryPlaceholder")}
                value={country}
              />
              <FormInput
                error={errors.bio}
                label={t("editProfile.bioLabel")}
                multiline
                numberOfLines={5}
                onChangeText={setBio}
                placeholder={t("editProfile.bioPlaceholder")}
                textAlignVertical="top"
                value={bio}
              />

              {formError ? (
                <View className="rounded-chef border border-chef-tomato/40 bg-chef-tomato/10 px-4 py-3">
                  <Text className="text-chef-sm font-semibold text-chef-tomato">{formError}</Text>
                </View>
              ) : null}

              <Button
                disabled={!!isCompressingPhoto}
                isLoading={isSaving || isCompressingPhoto}
                onPress={handleSave}
                title={isSaving ? t("editProfile.savingProfile") : t("editProfile.saveProfile")}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
