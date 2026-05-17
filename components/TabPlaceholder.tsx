import { type ReactNode } from "react";
import { Text, View } from "react-native";

import { ScreenContainer } from "@/components/ScreenContainer";

type TabPlaceholderProps = {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
};

export function TabPlaceholder({ icon, eyebrow, title, description, action }: TabPlaceholderProps) {
  return (
    <ScreenContainer>
      <View className="flex-1 justify-center">
        <View className="mb-6 h-16 w-16 items-center justify-center rounded-chef bg-chef-panel">{icon}</View>
        <Text className="text-chef-xs font-bold uppercase text-chef-saffron">{eyebrow}</Text>
        <Text className="mt-3 text-[32px] font-extrabold leading-10 text-chef-cream">{title}</Text>
        <Text className="mt-4 text-chef-base leading-7 text-chef-muted">{description}</Text>
        {action ? <View className="mt-8">{action}</View> : null}
      </View>
    </ScreenContainer>
  );
}
