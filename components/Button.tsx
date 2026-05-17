import { useRef, type ReactNode } from "react";
import { ActivityIndicator, Animated, Pressable, Text, type PressableProps } from "react-native";

import { colors } from "@/constants/theme";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = PressableProps & {
  title: string;
  isLoading?: boolean;
  variant?: ButtonVariant;
  leftIcon?: ReactNode;
  className?: string;
};

const buttonClassNames: Record<ButtonVariant, string> = {
  primary: "bg-chef-saffron",
  secondary: "border border-chef-line bg-chef-panel",
  ghost: "bg-transparent"
};

const textClassNames: Record<ButtonVariant, string> = {
  primary: "text-chef-black",
  secondary: "text-chef-cream",
  ghost: "text-chef-saffron"
};

function normalizeBooleanProp(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }

  return !!value;
}

export function Button({ title, isLoading = false, variant = "primary", leftIcon, className = "", disabled, ...props }: ButtonProps) {
  const {
    accessibilityState,
    accessible,
    android_disableSound,
    collapsable,
    focusable,
    needsOffscreenAlphaCompositing,
    removeClippedSubviews,
    renderToHardwareTextureAndroid,
    shouldRasterizeIOS,
    testOnly_pressed,
    ...pressableProps
  } = props;
  const scale = useRef(new Animated.Value(1)).current;
  const loading = !!isLoading;
  const isDisabled = !!disabled || loading;
  const normalizedAccessibilityState = {
    ...accessibilityState,
    disabled: !!accessibilityState?.disabled || !!isDisabled
  };

  function animate(toValue: number) {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      speed: 28,
      bounciness: 6
    }).start();
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        {...pressableProps}
        accessibilityRole="button"
        className={`h-14 flex-row items-center justify-center rounded-chef px-5 ${buttonClassNames[variant]} ${
          isDisabled ? "opacity-60" : "opacity-100"
        } ${className}`}
        accessibilityState={normalizedAccessibilityState}
        accessible={normalizeBooleanProp(accessible)}
        android_disableSound={normalizeBooleanProp(android_disableSound)}
        collapsable={normalizeBooleanProp(collapsable)}
        disabled={!!isDisabled}
        focusable={normalizeBooleanProp(focusable)}
        needsOffscreenAlphaCompositing={normalizeBooleanProp(needsOffscreenAlphaCompositing)}
        onPressIn={() => animate(0.98)}
        onPressOut={() => animate(1)}
        removeClippedSubviews={normalizeBooleanProp(removeClippedSubviews)}
        renderToHardwareTextureAndroid={normalizeBooleanProp(renderToHardwareTextureAndroid)}
        shouldRasterizeIOS={normalizeBooleanProp(shouldRasterizeIOS)}
        testOnly_pressed={normalizeBooleanProp(testOnly_pressed)}
      >
        {loading ? (
          <ActivityIndicator color={variant === "primary" ? colors.background : colors.saffron} />
        ) : (
          <>
            {leftIcon ? <>{leftIcon}</> : null}
            <Text className={`text-center text-chef-base font-bold ${textClassNames[variant]}`}>{title}</Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}
