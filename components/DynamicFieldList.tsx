import { Plus, Trash2 } from "lucide-react-native";
import { Pressable, Text, TextInput, View } from "react-native";

import { colors } from "@/constants/theme";

type DynamicFieldListProps = {
  title: string;
  values: string[];
  placeholder: string;
  error?: string;
  multiline?: boolean;
  onChangeValues: (values: string[]) => void;
};

export function DynamicFieldList({ title, values, placeholder, error, multiline = false, onChangeValues }: DynamicFieldListProps) {
  const safeValues = Array.isArray(values) ? values.map((item) => String(item ?? "")) : [];

  function updateValue(index: number, value: string) {
    onChangeValues(safeValues.map((item, itemIndex) => (itemIndex === index ? value : item)));
  }

  function addValue() {
    onChangeValues([...safeValues, ""]);
  }

  function removeValue(index: number) {
    if (safeValues.length === 1) {
      onChangeValues([""]);
      return;
    }

    onChangeValues(safeValues.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-chef-sm font-semibold text-chef-cream">{title}</Text>
        <Pressable className="h-10 w-10 items-center justify-center rounded-full bg-chef-saffron" onPress={addValue}>
          <Plus stroke={colors.background} size={19} strokeWidth={2.5} />
        </Pressable>
      </View>

      <View className="gap-3">
        {safeValues.map((value, index) => (
          <View className="flex-row items-start" key={`${title}-${index}`}>
            <TextInput
              className={`flex-1 rounded-chef border bg-chef-panel px-4 text-chef-base text-chef-cream ${
                multiline ? "min-h-24 py-4" : "h-14 py-3"
              } ${error ? "border-chef-tomato" : "border-chef-line"}`}
              multiline={multiline}
              onChangeText={(nextValue) => updateValue(index, nextValue)}
              placeholder={`${placeholder} ${index + 1}`}
              placeholderTextColor={colors.textMuted}
              selectionColor={colors.saffron}
              textAlignVertical={multiline ? "top" : "center"}
              value={value}
            />
            <Pressable
              accessibilityRole="button"
              className="ml-3 h-14 w-12 items-center justify-center rounded-chef border border-chef-line bg-chef-panel"
              onPress={() => removeValue(index)}
            >
              <Trash2 stroke={colors.tomato} size={19} />
            </Pressable>
          </View>
        ))}
      </View>

      {error ? <Text className="text-chef-xs font-medium text-chef-tomato">{error}</Text> : null}
    </View>
  );
}
