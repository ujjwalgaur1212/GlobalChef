import { SlidersHorizontal, Search } from "lucide-react-native";
import { TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";

import { colors } from "@/constants/theme";

type SearchBarProps = {
  value: string;
  onChangeText: (value: string) => void;
};

export function SearchBar({ value, onChangeText }: SearchBarProps) {
  const { t } = useTranslation();
  const inputValue = String(value ?? "");

  return (
    <View className="h-14 flex-row items-center rounded-chef border border-chef-line bg-chef-panel px-4">
      <Search stroke={colors.textMuted} size={20} />
      <TextInput
        autoCapitalize="none"
        className="mx-3 flex-1 text-chef-base font-semibold text-chef-cream"
        onChangeText={onChangeText}
        placeholder={t("home.searchPlaceholder")}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.saffron}
        value={inputValue}
      />
      <SlidersHorizontal stroke={colors.saffron} size={20} />
    </View>
  );
}
