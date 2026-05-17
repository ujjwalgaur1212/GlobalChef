import { Text, View } from "react-native";

type StepListProps = {
  steps: string[];
};

export function StepList({ steps }: StepListProps) {
  const safeSteps = Array.isArray(steps) ? steps.map((step) => String(step ?? "")) : [];

  if (safeSteps.length === 0) {
    return (
      <View className="rounded-chef border border-chef-line bg-chef-panel p-5">
        <Text className="text-chef-sm font-semibold text-chef-muted">No cooking steps were added for this recipe.</Text>
      </View>
    );
  }

  return (
    <View className="gap-3">
      {safeSteps.map((step, index) => (
        <View className="rounded-chef border border-chef-line bg-chef-panel p-4" key={`${step}-${index}`}>
          <View className="mb-3 h-8 w-8 items-center justify-center rounded-full bg-chef-saffron">
            <Text className="text-chef-sm font-extrabold text-chef-black">{String(index + 1)}</Text>
          </View>
          <Text className="text-chef-base font-semibold leading-6 text-chef-cream">{step || "Cooking step"}</Text>
        </View>
      ))}
    </View>
  );
}
