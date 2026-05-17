import { CommonActions, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BellRing, Globe2, LogOut, Moon, ShieldCheck, Sun, Volume2 } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";

import { AppButton } from "../../components/AppButton";
import { Card } from "../../components/Card";
import { Screen } from "../../components/Screen";
import { SectionHeader } from "../../components/SectionHeader";
import { ToggleRow } from "../../components/ToggleRow";
import { supportedLocales } from "../../constants/theme";
import { useAuthStore } from "../../store/useAuthStore";
import { ColorMode, useSettingsStore } from "../../store/useSettingsStore";
import type { RootStackParamList } from "../../types/navigation";
import { cn } from "../../utils/cn";

const colorModes: Array<{ label: string; value: ColorMode }> = [
  { label: "System", value: "system" },
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" }
];

export function ProfileSettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const colorMode = useSettingsStore((state) => state.colorMode);
  const locale = useSettingsStore((state) => state.locale);
  const voiceRemindersEnabled = useSettingsStore((state) => state.voiceRemindersEnabled);
  const familyAlertsEnabled = useSettingsStore((state) => state.familyAlertsEnabled);
  const emergencyContact = useSettingsStore((state) => state.emergencyContact);
  const setColorMode = useSettingsStore((state) => state.setColorMode);
  const setLocale = useSettingsStore((state) => state.setLocale);
  const setVoiceRemindersEnabled = useSettingsStore((state) => state.setVoiceRemindersEnabled);
  const setFamilyAlertsEnabled = useSettingsStore((state) => state.setFamilyAlertsEnabled);

  async function signOut() {
    await logout();
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "Auth" }] }));
  }

  return (
    <Screen>
      <View className="pt-4">
        <Text className="text-care-sm font-bold uppercase text-care-leaf">Profile</Text>
        <Text className="mt-2 text-care-2xl font-bold text-care-ink dark:text-white">{user?.displayName || "CareDose User"}</Text>
        <Text className="mt-2 text-care-base text-care-muted dark:text-[#A7B0BA]">{user?.email || "Demo account"}</Text>
      </View>

      <SectionHeader title="Safety" />
      <Card className="gap-4">
        <View className="flex-row items-center gap-4">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-[#EAF6EF] dark:bg-[#21352C]">
            <ShieldCheck color="#2F8C67" size={30} />
          </View>
          <View className="flex-1">
            <Text className="text-care-lg font-bold text-care-ink dark:text-white">{emergencyContact.name}</Text>
            <Text className="mt-1 text-care-base text-care-muted dark:text-[#A7B0BA]">{emergencyContact.phone}</Text>
          </View>
        </View>
      </Card>

      <SectionHeader title="Reminders" />
      <Card>
        <ToggleRow
          icon={<Volume2 color="#4D88FF" size={24} />}
          onValueChange={setVoiceRemindersEnabled}
          title="Voice reminders"
          value={!!voiceRemindersEnabled}
        />
        <ToggleRow
          icon={<BellRing color="#2F8C67" size={24} />}
          onValueChange={setFamilyAlertsEnabled}
          title="Family missed-dose alerts"
          value={!!familyAlertsEnabled}
        />
      </Card>

      <SectionHeader title="Appearance" />
      <Card>
        <View className="flex-row items-center gap-3">
          <Sun color="#FFB545" size={24} />
          <View className="flex-1 flex-row rounded-[18px] bg-[#EEF5F1] p-1 dark:bg-[#111B22]">
            {colorModes.map((mode) => (
              <TouchableOpacity
                className={cn(
                  "min-h-[48px] flex-1 items-center justify-center rounded-[15px]",
                  colorMode === mode.value && "bg-white dark:bg-[#263640]"
                )}
                key={mode.value}
                onPress={() => setColorMode(mode.value)}
              >
                <Text className="text-care-sm font-bold text-care-ink dark:text-white">{mode.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Moon color="#4D88FF" size={24} />
        </View>
      </Card>

      <SectionHeader title="Language" />
      <Card className="gap-3">
        <View className="flex-row items-center gap-3">
          <Globe2 color="#2F8C67" size={24} />
          <Text className="text-care-base font-semibold text-care-ink dark:text-white">App language</Text>
        </View>
        <View className="flex-row flex-wrap gap-3">
          {supportedLocales.map((item) => (
            <TouchableOpacity
              className={cn(
                "min-h-[48px] rounded-full border px-4 py-3",
                locale === item.value ? "border-care-leaf bg-[#EAF6EF]" : "border-[#DDE8E1] dark:border-[#2A3944]"
              )}
              key={item.value}
              onPress={() => setLocale(item.value)}
            >
              <Text className="text-care-sm font-bold text-care-ink dark:text-white">{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      <AppButton className="mt-6" icon={LogOut} onPress={signOut} title="Sign Out" variant="secondary" />
    </Screen>
  );
}
