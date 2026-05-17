import { useEffect, useRef } from "react";
import { Animated, View } from "react-native";

function SkeletonBlock({ className = "" }: { className?: string }) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.82,
          duration: 720,
          useNativeDriver: true
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 720,
          useNativeDriver: true
        })
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View className={`bg-chef-line ${className}`} style={{ opacity }} />;
}

export function RecipeDetailSkeleton() {
  return (
    <View className="flex-1 bg-chef-black">
      <SkeletonBlock className="h-80 w-full" />
      <View className="px-6 py-6">
        <SkeletonBlock className="h-8 w-3/4 rounded-full" />
        <SkeletonBlock className="mt-4 h-5 w-1/2 rounded-full" />
        <View className="mt-6 flex-row gap-3">
          <SkeletonBlock className="h-20 flex-1 rounded-chef" />
          <SkeletonBlock className="h-20 flex-1 rounded-chef" />
          <SkeletonBlock className="h-20 flex-1 rounded-chef" />
        </View>
        <SkeletonBlock className="mt-8 h-6 w-40 rounded-full" />
        <SkeletonBlock className="mt-4 h-24 rounded-chef" />
        <SkeletonBlock className="mt-8 h-6 w-36 rounded-full" />
        <SkeletonBlock className="mt-4 h-32 rounded-chef" />
      </View>
    </View>
  );
}
