import { useEffect, useRef } from "react";
import { Animated, View } from "react-native";

export function RecipeSkeletonList() {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 700,
          useNativeDriver: true
        })
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [opacity]);

  return (
    <View className="gap-5 px-6">
      {[0, 1, 2].map((item) => (
        <Animated.View className="overflow-hidden rounded-chef border border-chef-line bg-chef-panel" key={item} style={{ opacity }}>
          <View className="h-56 bg-chef-charcoal" />
          <View className="gap-3 px-4 py-4">
            <View className="h-5 w-2/3 rounded-full bg-chef-line" />
            <View className="h-4 w-1/2 rounded-full bg-chef-line" />
            <View className="mt-2 flex-row justify-between">
              <View className="h-4 w-20 rounded-full bg-chef-line" />
              <View className="h-4 w-20 rounded-full bg-chef-line" />
              <View className="h-4 w-16 rounded-full bg-chef-line" />
            </View>
          </View>
        </Animated.View>
      ))}
    </View>
  );
}
