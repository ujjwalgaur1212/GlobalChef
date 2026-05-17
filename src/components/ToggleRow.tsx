import { ReactNode } from "react";
import { Switch, Text, View } from "react-native";

interface ToggleRowProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

function normalizeBooleanProp(value: unknown) {
  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }

  return !!value;
}

export function ToggleRow({ title, subtitle, icon, value, onValueChange }: ToggleRowProps) {
  const switchValue = normalizeBooleanProp(value);

  return (
    <View className="flex-row items-center justify-between gap-4 py-3">
      <View className="flex-1 flex-row items-center gap-3">
        {icon}
        <View className="flex-1">
          <Text className="text-care-base font-semibold text-care-ink dark:text-white">{title}</Text>
          {subtitle ? <Text className="mt-1 text-care-sm text-care-muted dark:text-[#A7B0BA]">{subtitle}</Text> : null}
        </View>
      </View>
      <Switch
        accessibilityLabel={title}
        onValueChange={onValueChange}
        thumbColor="#FFFFFF"
        trackColor={{ false: "#D5DED9", true: "#67C391" }}
        value={!!switchValue}
      />
    </View>
  );
}
