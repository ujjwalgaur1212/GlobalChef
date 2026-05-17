import { useRef } from "react";
import { Animated, Pressable, ScrollView, Text } from "react-native";

type CategoryChipsProps = {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
};

type ChipProps = {
  category: string;
  isSelected: boolean;
  onPress: () => void;
};

function Chip({ category, isSelected, onPress }: ChipProps) {
  const scale = useRef(new Animated.Value(1)).current;

  function animate(toValue: number) {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      speed: 30,
      bounciness: 8
    }).start();
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        className={`mr-3 rounded-full border px-5 py-3 ${isSelected ? "border-chef-saffron bg-chef-saffron" : "border-chef-line bg-chef-panel"
          }`}
        onPress={onPress}
        onPressIn={() => animate(0.96)}
        onPressOut={() => animate(1)}
      >
        <Text className={`text-chef-sm font-extrabold ${isSelected ? "text-chef-black" : "text-chef-muted"}`}>{category}</Text>
      </Pressable>
    </Animated.View>
  );
}

export function CategoryChips({ categories, selectedCategory, onSelectCategory }: CategoryChipsProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {categories.map((category) => (
        <Chip
          category={category}
          isSelected={selectedCategory === category}
          key={category}
          onPress={() => onSelectCategory(category)}
        />
      ))}
    </ScrollView>
  );
}
