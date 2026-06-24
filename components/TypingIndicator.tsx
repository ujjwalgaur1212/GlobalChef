import { useEffect, useRef } from "react";
import { Animated, View } from "react-native";
import { colors } from "@/constants/theme";

export function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true
          })
        ])
      );
    };

    const anim1 = animateDot(dot1, 0);
    const anim2 = animateDot(dot2, 150);
    const anim3 = animateDot(dot3, 300);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [dot1, dot2, dot3]);

  const getStyle = (dot: Animated.Value) => ({
    transform: [
      {
        translateY: dot.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -6]
        })
      }
    ]
  });

  return (
    <View className="flex-row items-center gap-1.5 px-4 py-3 bg-chef-panel rounded-chef self-start ml-2 border border-chef-line">
      <Animated.View style={getStyle(dot1)} className="h-2.5 w-2.5 rounded-full bg-chef-saffron" />
      <Animated.View style={getStyle(dot2)} className="h-2.5 w-2.5 rounded-full bg-chef-saffron" />
      <Animated.View style={getStyle(dot3)} className="h-2.5 w-2.5 rounded-full bg-chef-saffron" />
    </View>
  );
}
