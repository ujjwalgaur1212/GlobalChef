import { Text, View } from "react-native";

type IngredientListProps = {
  ingredients: string[];
};

export function IngredientList({ ingredients }: IngredientListProps) {
  const safeIngredients = Array.isArray(ingredients) ? ingredients.map((ingredient) => String(ingredient ?? "")) : [];

  if (safeIngredients.length === 0) {
    return (
      <View className="rounded-chef border border-chef-line bg-chef-panel p-5">
        <Text className="text-chef-sm font-semibold text-chef-muted">No ingredients were added for this recipe.</Text>
      </View>
    );
  }

  return (
    <View className="rounded-chef border border-chef-line bg-chef-panel p-4">
      {safeIngredients.map((ingredient, index) => (
        <View
          className={`flex-row items-start ${index === safeIngredients.length - 1 ? "" : "mb-3 border-b border-chef-line pb-3"}`}
          key={`${ingredient}-${index}`}
        >
          <View className="mr-3 mt-1 h-2 w-2 rounded-full bg-chef-saffron" />
          <Text className="flex-1 text-chef-base font-semibold capitalize text-chef-cream">{ingredient || "Ingredient"}</Text>
        </View>
      ))}
    </View>
  );
}
