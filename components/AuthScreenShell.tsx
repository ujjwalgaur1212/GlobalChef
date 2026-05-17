import { LinearGradient } from "expo-linear-gradient";
import { ChefHat } from "lucide-react-native";
import { type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, gradients } from "@/constants/theme";

type AuthScreenShellProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthScreenShell({ eyebrow, title, subtitle, children, footer }: AuthScreenShellProps) {
  return (
    <LinearGradient colors={gradients.auth} style={{ flex: 1 }}>
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View className="flex-1 justify-between px-6 pb-8 pt-5">
              <View>
                <View className="mb-10 flex-row items-center justify-between">
                  <View>
                    <Text className="text-chef-xs font-bold uppercase text-chef-saffron">{eyebrow}</Text>
                    <Text className="mt-1 text-chef-2xl font-extrabold text-chef-cream">GlobalChef</Text>
                  </View>
                  <View className="h-14 w-14 items-center justify-center rounded-chef bg-chef-panel">
                    <ChefHat stroke={colors.saffron} size={27} strokeWidth={2.4} />
                  </View>
                </View>

                <View className="mb-8">
                  <Text className="text-[30px] font-extrabold leading-9 text-chef-cream">{title}</Text>
                  <Text className="mt-3 text-chef-base text-chef-muted">{subtitle}</Text>
                </View>

                {children}
              </View>

              {footer ? <View className="mt-8">{footer}</View> : null}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}
