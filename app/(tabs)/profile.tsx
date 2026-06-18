import { useRouter } from "expo-router";
import { Bookmark, ChefHat, Folder, Globe2, LogOut, Pencil, Plus, Settings, Trash2, UserRound, UsersRound } from "lucide-react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Alert, Image, ImageBackground, Modal, Pressable, ScrollView, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { FormInput } from "@/components/FormInput";
import { ScreenContainer } from "@/components/ScreenContainer";
import { colors } from "@/constants/theme";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { getAuthErrorMessage } from "@/services/authService";
import {
  createCollection,
  deleteCollection,
  getCollectionErrorMessage,
  getUserCollections,
  updateCollection
} from "@/services/collectionService";
import { subscribeToUserProfile } from "@/services/userService";
import type { RecipeCollection } from "@/types/collection";
import type { UserProfile } from "@/types/user";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part.trim().slice(0, 1))
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function ProfileTab() {
  const { t } = useTranslation();
  const router = useRouter();
  const { signOut, user } = useAuth();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [collections, setCollections] = useState<RecipeCollection[]>([]);
  const [isLoadingCollections, setIsLoadingCollections] = useState(false);
  const [isSavingCollection, setIsSavingCollection] = useState(false);
  const [editingCollection, setEditingCollection] = useState<RecipeCollection | null>(null);
  const [isCollectionModalVisible, setIsCollectionModalVisible] = useState(false);
  const [collectionName, setCollectionName] = useState("");
  const [collectionDescription, setCollectionDescription] = useState("");
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }

    return subscribeToUserProfile(
      user.id,
      setProfile,
      (profileError) => {
        setError(profileError.message);
      }
    );
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    if (!user) {
      setCollections([]);
      setIsLoadingCollections(false);
      return () => {
        isMounted = false;
      };
    }

    setIsLoadingCollections(true);
    getUserCollections(user.id)
      .then((nextCollections) => {
        if (isMounted) {
          setCollections(nextCollections);
        }
      })
      .catch((collectionError) => {
        if (isMounted) {
          showToast(getCollectionErrorMessage(collectionError), "error");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingCollections(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [showToast, user]);

  async function refreshCollections() {
    if (!user) {
      return;
    }

    const nextCollections = await getUserCollections(user.id);
    setCollections(nextCollections);
  }

  function openCreateCollection() {
    setEditingCollection(null);
    setCollectionName("");
    setCollectionDescription("");
    setIsCollectionModalVisible(true);
  }

  function openEditCollection(recipeCollection: RecipeCollection) {
    setEditingCollection(recipeCollection);
    setCollectionName(recipeCollection.name);
    setCollectionDescription(recipeCollection.description);
    setIsCollectionModalVisible(true);
  }

  async function handleSaveCollection() {
    if (!user || isSavingCollection) {
      return;
    }

    setIsSavingCollection(true);

    try {
        if (editingCollection) {
          await updateCollection({
            collectionId: editingCollection.id,
            ownerId: user.id,
            name: collectionName,
            description: collectionDescription
          });
          showToast(t("profile.collectionUpdated"), "success");
        } else {
          await createCollection({
            ownerId: user.id,
            name: collectionName,
            description: collectionDescription
          });
          showToast(t("profile.collectionCreated"), "success");
        }

      setIsCollectionModalVisible(false);
      await refreshCollections();
    } catch (collectionError) {
      showToast(getCollectionErrorMessage(collectionError), "error");
    } finally {
      setIsSavingCollection(false);
    }
  }

  function confirmDeleteCollection(recipeCollection: RecipeCollection) {
    Alert.alert(t("profile.deleteCollectionTitle"), t("profile.deleteCollectionConfirm", { name: recipeCollection.name }), [
      { text: t("profile.cancelBtn"), style: "cancel" },
      {
        text: t("profile.deleteBtn"),
        style: "destructive",
        onPress: async () => {
          if (!user) {
            return;
          }

          try {
            await deleteCollection(recipeCollection.id, user.id);
            showToast(t("profile.collectionDeleted"), "success");
            await refreshCollections();
          } catch (collectionError) {
            showToast(getCollectionErrorMessage(collectionError), "error");
          }
        }
      }
    ]);
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    setError(null);

    try {
      await signOut();
    } catch (signOutError) {
      setError(getAuthErrorMessage(signOutError));
    } finally {
      setIsSigningOut(false);
    }
  }

  const displayName = profile?.displayName || user?.displayName || "GlobalChef cook";
  const initials = getInitials(displayName) || "GC";

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="mb-7 h-24 w-24 overflow-hidden rounded-chef border border-chef-line bg-chef-panel">
          {profile?.photoURL || user?.photoURL ? (
            <Image className="h-full w-full" resizeMode="cover" source={{ uri: String(profile?.photoURL || user?.photoURL) }} />
          ) : (
            <View className="h-full w-full items-center justify-center bg-chef-saffron/15">
              <Text className="text-chef-2xl font-extrabold text-chef-saffron">{initials}</Text>
            </View>
          )}
        </View>
        <Text className="text-chef-xs font-bold uppercase text-chef-saffron">{t("profile.headerTitle")}</Text>
        <Text className="mt-3 text-[32px] font-extrabold leading-10 text-chef-cream">{displayName}</Text>
        <Text className="mt-2 text-chef-base text-chef-muted">{String(user?.email ?? "")}</Text>
        {profile?.country ? (
          <View className="mt-4 flex-row items-center self-start rounded-full bg-chef-panel px-4 py-2">
            <Globe2 stroke={colors.saffron} size={16} />
            <Text className="ml-2 text-chef-sm font-extrabold text-chef-cream">{profile.country}</Text>
          </View>
        ) : null}
        <Text className="mt-4 text-chef-base leading-7 text-chef-muted">{profile?.bio || t("profile.bioPlaceholder")}</Text>

        <View className="mt-8 flex-row gap-3">
          <View className="flex-1 rounded-chef border border-chef-line bg-chef-panel p-4">
            <UsersRound stroke={colors.saffron} size={21} />
            <Text className="mt-3 text-chef-2xl font-extrabold text-chef-cream">{String(profile?.followersCount ?? 0)}</Text>
            <Text className="mt-1 text-chef-xs font-extrabold uppercase text-chef-muted">{t("profile.followers")}</Text>
          </View>
          <View className="flex-1 rounded-chef border border-chef-line bg-chef-panel p-4">
            <UserRound stroke={colors.saffron} size={21} />
            <Text className="mt-3 text-chef-2xl font-extrabold text-chef-cream">{String(profile?.followingCount ?? 0)}</Text>
            <Text className="mt-1 text-chef-xs font-extrabold uppercase text-chef-muted">{t("profile.following")}</Text>
          </View>
          <View className="flex-1 rounded-chef border border-chef-line bg-chef-panel p-4">
            <ChefHat stroke={colors.saffron} size={21} />
            <Text className="mt-3 text-chef-2xl font-extrabold text-chef-cream">{String(profile?.recipeCount ?? 0)}</Text>
            <Text className="mt-1 text-chef-xs font-extrabold uppercase text-chef-muted">{t("profile.recipes")}</Text>
          </View>
        </View>

        <Button
          className="mt-6"
          leftIcon={<Pencil stroke={colors.saffron} size={19} style={{ marginRight: 8 }} />}
          onPress={() => router.push("/profile/edit")}
          title={t("profile.editBtn")}
          variant="secondary"
        />

        <Button
          className="mt-4"
          leftIcon={<ChefHat stroke={colors.saffron} size={19} style={{ marginRight: 8 }} />}
          onPress={() =>
            router.push({
              pathname: "/chef/[id]",
              params: { id: String(user?.id ?? "") }
            })
          }
          title={t("profile.viewPublicBtn")}
          variant="secondary"
        />

        <Button
          className="mt-4"
          leftIcon={<Bookmark stroke={colors.saffron} size={19} style={{ marginRight: 8 }} />}
          onPress={() => router.push("/profile/saved-recipes")}
          title={t("profile.savedRecipesBtn")}
          variant="secondary"
        />

        <Button
          className="mt-4"
          leftIcon={<Settings stroke={colors.saffron} size={19} style={{ marginRight: 8 }} />}
          onPress={() => router.push("/profile/settings")}
          title={t("profile.settingsBtn")}
          variant="secondary"
        />

        <View className="mt-8">
          <View className="mb-4 flex-row items-center justify-between">
            <View>
              <Text className="text-chef-xs font-extrabold uppercase text-chef-saffron">{t("profile.collectionsTitle")}</Text>
              <Text className="mt-1 text-chef-xl font-extrabold text-chef-cream">{t("profile.collectionsSubtitle")}</Text>
            </View>
            <Pressable className="h-11 w-11 items-center justify-center rounded-full bg-chef-saffron" onPress={openCreateCollection}>
              <Plus stroke={colors.background} size={22} strokeWidth={2.5} />
            </Pressable>
          </View>

          {isLoadingCollections ? (
            <View className="items-center rounded-chef border border-chef-line bg-chef-panel py-8">
              <ActivityIndicator color={colors.saffron} />
            </View>
          ) : collections.length === 0 ? (
            <View className="rounded-chef border border-chef-line bg-chef-panel px-5 py-8">
              <View className="mx-auto mb-4 h-14 w-14 items-center justify-center rounded-full bg-chef-saffron/15">
                <Folder stroke={colors.saffron} size={24} />
              </View>
              <Text className="text-center text-chef-lg font-extrabold text-chef-cream">{t("profile.noCollections")}</Text>
              <Text className="mt-2 text-center text-chef-sm text-chef-muted">{t("profile.noCollectionsSubtitle")}</Text>
            </View>
          ) : (
            <View className="gap-4">
              {collections.map((recipeCollection) => (
                <Pressable
                  className="overflow-hidden rounded-chef border border-chef-line bg-chef-panel"
                  key={recipeCollection.id}
                  onPress={() =>
                    router.push({
                      pathname: "/collection/[id]",
                      params: { id: recipeCollection.id }
                    })
                  }
                >
                  <ImageBackground
                    className="h-32 justify-end bg-chef-saffron/10"
                    resizeMode="cover"
                    source={recipeCollection.coverImageUrl ? { uri: recipeCollection.coverImageUrl } : undefined}
                  >
                    <View className="flex-1 justify-between bg-chef-black/45 p-4">
                      <View className="flex-row justify-end gap-2">
                        <Pressable
                          className="h-9 w-9 items-center justify-center rounded-full bg-chef-black/75"
                          onPress={(event) => {
                            event.stopPropagation();
                            openEditCollection(recipeCollection);
                          }}
                        >
                          <Pencil stroke={colors.saffron} size={16} />
                        </Pressable>
                        <Pressable
                          className="h-9 w-9 items-center justify-center rounded-full bg-chef-black/75"
                          onPress={(event) => {
                            event.stopPropagation();
                            confirmDeleteCollection(recipeCollection);
                          }}
                        >
                          <Trash2 stroke={colors.tomato} size={16} />
                        </Pressable>
                      </View>
                      <View>
                        <Text className="text-chef-lg font-extrabold text-chef-cream" numberOfLines={1}>
                          {recipeCollection.name}
                        </Text>
                        <Text className="mt-1 text-chef-sm font-bold text-chef-muted">
                          {t("profile.recipesCount", { count: recipeCollection.recipeCount })}
                        </Text>
                      </View>
                    </View>
                  </ImageBackground>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {error ? (
          <View className="mt-8 rounded-chef border border-chef-tomato/40 bg-chef-tomato/10 px-4 py-3">
            <Text className="text-chef-sm font-semibold text-chef-tomato">{error}</Text>
          </View>
        ) : null}

        <Button
          className="mt-4"
          isLoading={isSigningOut}
          leftIcon={<LogOut stroke={colors.cream} size={19} style={{ marginRight: 8 }} />}
          onPress={handleSignOut}
          title={t("profile.signOutBtn")}
          variant="secondary"
        />
        <View className="h-8" />
      </ScrollView>

      <Modal animationType="slide" transparent visible={isCollectionModalVisible} onRequestClose={() => setIsCollectionModalVisible(false)}>
        <View className="flex-1 justify-end bg-chef-black/70">
          <View className="rounded-t-[28px] border border-chef-line bg-chef-black px-6 pb-8 pt-5">
            <View className="mb-5 h-1 w-12 self-center rounded-full bg-chef-line" />
            <Text className="text-chef-xl font-extrabold text-chef-cream">{editingCollection ? t("profile.editCollection") : t("profile.createCollection")}</Text>
            <FormInput className="mt-5" label={t("profile.collectionNameLabel")} onChangeText={setCollectionName} placeholder={t("profile.collectionNamePlaceholder")} value={collectionName} />
            <FormInput
              className="mt-4"
              label={t("profile.collectionDescLabel")}
              multiline
              onChangeText={setCollectionDescription}
              placeholder={t("profile.collectionDescPlaceholder")}
              value={collectionDescription}
            />
            <Button className="mt-6" isLoading={isSavingCollection} onPress={handleSaveCollection} title={editingCollection ? t("profile.saveChangesBtn") : t("profile.createBtn")} />
            <Button className="mt-3" onPress={() => setIsCollectionModalVisible(false)} title={t("profile.cancelBtn")} variant="ghost" />
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
