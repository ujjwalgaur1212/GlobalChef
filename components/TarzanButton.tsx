import { useEffect } from "react";
import { ChefHat } from "lucide-react-native";
import { Platform, Pressable, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming
} from "react-native-reanimated";

import { colors } from "@/constants/theme";

type TarzanButtonProps = {
  onPress: () => void;
};

export function TarzanButton({ onPress }: TarzanButtonProps) {
  const pulseScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.36);
  const pressScale = useSharedValue(1);

  useEffect(() => {
    // Idle pulse animation: scale grows and shrinks slightly
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 1500 }),
        withTiming(1, { duration: 1500 })
      ),
      -1,
      true
    );

    // Glow intensity animation: shadow opacity pulses
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.68, { duration: 1500 }),
        withTiming(0.36, { duration: 1500 })
      ),
      -1,
      true
    );
  }, []);

  const isAndroid = Platform.OS === "android";

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseScale.value * pressScale.value }],
      shadowOpacity: glowOpacity.value,
      elevation: isAndroid ? glowOpacity.value * 16 : 0
    };
  });

  return (
    <View
      className="items-center justify-center"
      style={{
        width: 70,
        height: 68,
        top: Platform.OS === "ios" ? -18 : -22
      }}
    >
      <Pressable
        onPressIn={() => {
          pressScale.value = withSpring(0.92, { damping: 10, stiffness: 100 });
        }}
        onPressOut={() => {
          pressScale.value = withSpring(1, { damping: 10, stiffness: 100 });
        }}
        onPress={() => {
          console.log("Chef button pressed");
          onPress();
        }}
        style={{
          width: 68,
          height: 68,
          borderRadius: 34
        }}
      >
        <Animated.View
          style={[
            {
              width: 68,
              height: 68,
              borderRadius: 34,
              backgroundColor: "#000",
              ...Platform.select({
                ios: {
                  shadowColor: colors.saffron,
                  shadowOffset: { width: 0, height: 6 },
                  shadowRadius: 10,
                }
              }),
            },
            animatedStyle
          ]}
        >
          <LinearGradient
            colors={["#FF8C00", colors.saffron]} // Orange to Saffron/Gold
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 34,
              justifyContent: "center",
              alignItems: "center",
              borderWidth: 3,
              borderColor: colors.background, // Premium cutout outline
            }}
          >
            <ChefHat stroke={colors.cream} size={30} strokeWidth={2.4} />
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </View>
  );
}
