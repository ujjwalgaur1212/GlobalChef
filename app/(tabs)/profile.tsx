import { useRouter } from "expo-router";
import { Bookmark, LogOut, UserRound, UsersRound } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/Button";
import { ScreenContainer } from "@/components/ScreenContainer";
import { colors } from "@/constants/theme";
import { useAuth } from "@/hooks/useAuth";
import { getAuthErrorMessage } from "@/services/authService";
import { subscribeToUserProfile } from "@/services/userService";
import type { UserProfile } from "@/types/user";

export default function ProfileTab() {
  const router = useRouter();
  const { signOut, user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
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

  return (
    <ScreenContainer>
      <View className="flex-1 justify-center">
        <View className="mb-8 h-20 w-20 items-center justify-center rounded-chef bg-chef-panel">
          <UserRound stroke={colors.saffron} size={34} strokeWidth={2.4} />
        </View>
        <Text className="text-chef-xs font-bold uppercase text-chef-saffron">Chef profile</Text>
        <Text className="mt-3 text-[32px] font-extrabold leading-10 text-chef-cream">{String(user?.displayName ?? "")}</Text>
        <Text className="mt-2 text-chef-base text-chef-muted">{String(user?.email ?? "")}</Text>

        <View className="mt-8 flex-row gap-3">
          <View className="flex-1 rounded-chef border border-chef-line bg-chef-panel p-4">
            <UsersRound stroke={colors.saffron} size={21} />
            <Text className="mt-3 text-chef-2xl font-extrabold text-chef-cream">{String(profile?.followersCount ?? 0)}</Text>
            <Text className="mt-1 text-chef-xs font-extrabold uppercase text-chef-muted">Followers</Text>
          </View>
          <View className="flex-1 rounded-chef border border-chef-line bg-chef-panel p-4">
            <UserRound stroke={colors.saffron} size={21} />
            <Text className="mt-3 text-chef-2xl font-extrabold text-chef-cream">{String(profile?.followingCount ?? 0)}</Text>
            <Text className="mt-1 text-chef-xs font-extrabold uppercase text-chef-muted">Following</Text>
          </View>
        </View>

        <Button
          className="mt-6"
          leftIcon={<Bookmark stroke={colors.saffron} size={19} style={{ marginRight: 8 }} />}
          onPress={() => router.push("/profile/saved-recipes")}
          title="Saved recipes"
          variant="secondary"
        />

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
          title="Sign out"
          variant="secondary"
        />
      </View>
    </ScreenContainer>
  );
}
