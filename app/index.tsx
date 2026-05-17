import { Redirect } from "expo-router";

import { LoadingScreen } from "@/components/LoadingScreen";
import { useAuth } from "@/hooks/useAuth";

export default function IndexRoute() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return <LoadingScreen />;
  }

  return <Redirect href={user ? "/(tabs)" : "/(auth)/login"} />;
}
