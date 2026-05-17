import { Text, View } from "react-native";

interface SectionHeaderProps {
  title: string;
  action?: string;
}

export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <View className="mb-3 mt-6 flex-row items-center justify-between">
      <Text className="text-care-lg font-semibold text-care-ink dark:text-white">{title}</Text>
      {action ? <Text className="text-care-sm font-semibold text-care-leaf dark:text-[#8AD7A9]">{action}</Text> : null}
    </View>
  );
}
