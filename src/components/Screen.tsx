import { PropsWithChildren } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { cn } from "../utils/cn";

interface ScreenProps extends PropsWithChildren {
  scroll?: boolean;
  className?: string;
  contentClassName?: string;
}

export function Screen({ children, scroll = true, className, contentClassName }: ScreenProps) {
  const normalizedScroll = scroll as unknown;
  const shouldScroll = normalizedScroll === true || normalizedScroll === "true";

  const content = shouldScroll ? (
    <ScrollView
      className={cn("flex-1", contentClassName)}
      contentContainerClassName="px-5 pb-8"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View className={cn("flex-1 px-5 pb-8", contentClassName)}>{children}</View>
  );

  return <SafeAreaView className={cn("flex-1 bg-[#F6FBF8] dark:bg-[#0F171D]", className)}>{content}</SafeAreaView>;
}
