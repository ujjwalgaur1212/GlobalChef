import { useRouter } from "expo-router";
import { ArrowLeft, Check, Globe2 } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { colors } from "@/constants/theme";
import { LANGUAGE_KEY } from "@/services/i18n";

export default function SettingsScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();

  const currentLanguage = i18n.language || "en";

  const languages = [
    { code: "en", label: t("settings.english") },
    { code: "es", label: t("settings.spanish") },
    { code: "fr", label: t("settings.french") },
    { code: "hi", label: t("settings.hindi") }
  ];

  async function selectLanguage(code: string) {
    try {
      await i18n.changeLanguage(code);
      await AsyncStorage.setItem(LANGUAGE_KEY, code);
    } catch (error) {
      // Ignore
    }
  }

  return (
    <View className="flex-1 bg-chef-black">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
          <View className="px-6 pb-6 pt-3">
            <View className="flex-row items-center justify-between">
              <Pressable className="h-11 w-11 items-center justify-center rounded-full bg-chef-panel" onPress={() => router.back()}>
                <ArrowLeft stroke={colors.cream} size={22} strokeWidth={2.4} />
              </Pressable>
              <Text className="text-chef-sm font-extrabold uppercase text-chef-saffron">{t("settings.title")}</Text>
            </View>

            <Text className="mt-6 text-[32px] font-extrabold leading-10 text-chef-cream">{t("settings.language")}</Text>
            <Text className="mt-3 text-chef-base leading-7 text-chef-muted">
              {t("settings.selectLanguage")}
            </Text>
          </View>

          <View className="px-6 gap-3">
            {languages.map((lang) => {
              const isSelected = currentLanguage.startsWith(lang.code);

              return (
                <Pressable
                  className={`flex-row items-center justify-between rounded-chef border p-4 ${
                    isSelected ? "border-chef-saffron bg-chef-saffron/10" : "border-chef-line bg-chef-panel"
                  }`}
                  key={lang.code}
                  onPress={() => selectLanguage(lang.code)}
                >
                  <View className="flex-row items-center">
                    <Globe2 stroke={isSelected ? colors.saffron : colors.textMuted} size={20} />
                    <Text className="ml-3 text-chef-base font-extrabold text-chef-cream">
                      {lang.label}
                    </Text>
                  </View>
                  {isSelected ? (
                    <View className="h-6 w-6 items-center justify-center rounded-full bg-chef-saffron">
                      <Check stroke={colors.background} size={15} strokeWidth={3} />
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
