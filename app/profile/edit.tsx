import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Redirect, useRouter } from "expo-router";
import { ArrowLeft, Camera, Globe2, UserRound } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { FormInput } from "@/components/FormInput";
import { colors } from "@/constants/theme";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { subscribeToUserProfile, updateChefProfile } from "@/services/userService";
import type { UserProfile } from "@/types/user";

type ProfileErrors = Partial<Record<"displayName" | "bio" | "country" | "photo", string>>;

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
  const router = useRouter();
  const { user, initializing } = useAuth();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState("");
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
          ? "Allow photo library access to update your chef photo."
          : "Photo access is disabled. Enable it in iOS Settings to update your chef photo.";

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
      const message = "Could not open your photo library.";

      setErrors((current) => ({ ...current, photo: message }));
      showToast(message, "error");
    }
  }

  function validateForm() {
    const nextErrors: ProfileErrors = {};

    if (!displayName.trim()) {
      nextErrors.displayName = "Display name is required.";
    }

    if (displayName.trim().length > 60) {
      nextErrors.displayName = "Display name must be 60 characters or fewer.";
    }

    if (bio.trim().length > 220) {
      nextErrors.bio = "Bio must be 220 characters or fewer.";
    }

    if (country.trim().length > 56) {
      nextErrors.country = "Country must be 56 characters or fewer.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSave() {
    if (!user) {
      return;
    }

    if (!validateForm()) {
      showToast("Check the highlighted profile fields.", "error");
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      await updateChefProfile({
        userId: user.id,
        displayName,
        bio,
        country,
        photoUri
      });
      showToast("Profile updated", "success");
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
  const initials = getInitials(displayName || user.displayName || "GlobalChef cook") || "GC";

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
                <Text className="text-chef-sm font-extrabold uppercase text-chef-saffron">Edit profile</Text>
              </View>

              <Text className="mt-6 text-[32px] font-extrabold leading-10 text-chef-cream">Tune your chef card.</Text>
              <Text className="mt-3 text-chef-base leading-7 text-chef-muted">
                Your public profile helps other cooks discover your recipes and follow your kitchen.
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
                  <Text className="ml-2 text-chef-sm font-extrabold text-chef-black">Change photo</Text>
                </View>
              </Pressable>
              {isCompressingPhoto ? (
                <View className="mt-3 flex-row items-center">
                  <ActivityIndicator color={colors.saffron} />
                  <Text className="ml-3 text-chef-sm font-semibold text-chef-muted">Optimizing photo...</Text>
                </View>
              ) : null}
              {errors.photo ? <Text className="mt-2 text-chef-xs font-medium text-chef-tomato">{errors.photo}</Text> : null}
            </View>

            <View className="mt-8 gap-5 px-6">
              <FormInput
                error={errors.displayName}
                label="Display name"
                leftIcon={<UserRound stroke={colors.textMuted} size={20} />}
                onChangeText={setDisplayName}
                placeholder="Aarav Patel"
                value={displayName}
              />
              <FormInput
                error={errors.country}
                label="Country"
                leftIcon={<Globe2 stroke={colors.textMuted} size={20} />}
                onChangeText={setCountry}
                placeholder="India"
                value={country}
              />
              <FormInput
                error={errors.bio}
                label="Bio"
                multiline
                numberOfLines={5}
                onChangeText={setBio}
                placeholder="Tell cooks what you love making."
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
                title={isSaving ? "Saving profile" : "Save profile"}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
