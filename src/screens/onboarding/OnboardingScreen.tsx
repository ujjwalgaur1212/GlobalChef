import { useState } from "react";
import { HeartPulse, ShieldCheck, UsersRound } from "lucide-react-native";
import { Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "../../components/AppButton";
import { ProgressDots } from "../../components/ProgressDots";
import { Screen } from "../../components/Screen";
import { useAuthStore } from "../../store/useAuthStore";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "Onboarding">;

const slides = [
  {
    title: "Never miss a dose",
    body: "Large reminders, voice support, and one-tap confirmation.",
    icon: HeartPulse,
    color: "#DFF7EA"
  },
  {
    title: "Family stays close",
    body: "Caregivers see missed doses, refills, and daily progress.",
    icon: UsersRound,
    color: "#DCEEFF"
  },
  {
    title: "Ready offline",
    body: "Reminders keep working even when the connection does not.",
    icon: ShieldCheck,
    color: "#FFF1D6"
  }
];

export function OnboardingScreen({ navigation }: Props) {
  const [index, setIndex] = useState(0);
  const setHasCompletedOnboarding = useAuthStore((state) => state.setHasCompletedOnboarding);
  const slide = slides[index];
  const Icon = slide.icon;

  function next() {
    if (index < slides.length - 1) {
      setIndex(index + 1);
      return;
    }

    setHasCompletedOnboarding(true);
    navigation.replace("Auth");
  }

  return (
    <Screen scroll={false}>
      <View className="flex-1 justify-between">
        <View className="pt-10">
          <Text className="text-care-sm font-bold uppercase text-care-leaf">CareDose</Text>
          <Text className="mt-4 max-w-[310px] text-care-2xl font-bold text-care-ink dark:text-white">{slide.title}</Text>
        </View>

        <View className="items-center">
          <View
            className="h-52 w-52 items-center justify-center rounded-[40px]"
            style={{ backgroundColor: slide.color }}
          >
            <Icon color="#2F8C67" size={92} strokeWidth={1.7} />
          </View>
          <Text className="mt-8 text-center text-care-lg text-care-muted dark:text-[#A7B0BA]">{slide.body}</Text>
        </View>

        <View className="gap-5">
          <ProgressDots activeIndex={index} total={slides.length} />
          <AppButton onPress={next} title={index === slides.length - 1 ? "Get Started" : "Continue"} />
        </View>
      </View>
    </Screen>
  );
}
