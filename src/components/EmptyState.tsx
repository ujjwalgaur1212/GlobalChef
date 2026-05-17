import { Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body: string;
}

export function EmptyState({ icon: Icon, title, body }: EmptyStateProps) {
  return (
    <View className="items-center gap-3 rounded-[20px] border border-dashed border-[#CAD8D0] p-8 dark:border-[#33444E]">
      <View className="h-14 w-14 items-center justify-center rounded-full bg-[#EAF6EF] dark:bg-[#21352C]">
        <Icon color="#2F8C67" size={28} />
      </View>
      <Text className="text-center text-care-lg font-semibold text-care-ink dark:text-white">{title}</Text>
      <Text className="text-center text-care-base text-care-muted dark:text-[#A7B0BA]">{body}</Text>
    </View>
  );
}
