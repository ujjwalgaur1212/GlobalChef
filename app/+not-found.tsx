import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";

import { Button } from "@/components/Button";
import { TabPlaceholder } from "@/components/TabPlaceholder";
import { colors } from "@/constants/theme";

export default function NotFoundScreen() {
  return (
    <TabPlaceholder
      description="That screen does not exist in GlobalChef yet."
      eyebrow="404"
      icon={<ArrowLeft stroke={colors.saffron} size={30} />}
      title="Lost in the kitchen"
      action={<Button onPress={() => router.replace("/")} title="Back to GlobalChef" />}
    />
  );
}
