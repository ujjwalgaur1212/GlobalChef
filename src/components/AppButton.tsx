import { ReactNode } from "react";
import { ActivityIndicator, Text, TouchableOpacity, TouchableOpacityProps, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";

import { cn } from "../utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "quiet";

interface AppButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: ButtonVariant;
  icon?: LucideIcon;
  rightAccessory?: ReactNode;
  loading?: boolean;
}

const variantClassNames: Record<ButtonVariant, string> = {
  primary: "bg-care-leaf",
  secondary: "bg-white border border-[#DDE8E1] dark:bg-[#1B2730] dark:border-[#2A3944]",
  ghost: "bg-transparent",
  danger: "bg-care-rose",
  quiet: "bg-[#EAF6EF] dark:bg-[#21352C]"
};

const textClassNames: Record<ButtonVariant, string> = {
  primary: "text-white",
  secondary: "text-care-ink dark:text-white",
  ghost: "text-care-leaf dark:text-[#8AD7A9]",
  danger: "text-white",
  quiet: "text-care-leaf dark:text-[#8AD7A9]"
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

export function AppButton({
  title,
  variant = "primary",
  icon: Icon,
  rightAccessory,
  loading,
  disabled,
  className,
  ...props
}: AppButtonProps) {
  const {
    accessibilityState,
    accessible,
    collapsable,
    focusable,
    hasTVPreferredFocus,
    isTVSelectable,
    needsOffscreenAlphaCompositing,
    rejectResponderTermination,
    removeClippedSubviews,
    renderToHardwareTextureAndroid,
    shouldRasterizeIOS,
    touchSoundDisabled,
    ...touchableProps
  } = props;
  const isLoading = !!loading;
  const isDisabled = !!disabled || isLoading;
  const normalizedAccessibilityState = {
    ...accessibilityState,
    disabled: !!accessibilityState?.disabled || !!isDisabled
  };

  return (
    <TouchableOpacity
      {...touchableProps}
      accessibilityRole="button"
      accessibilityState={normalizedAccessibilityState}
      activeOpacity={0.78}
      className={cn(
        "min-h-[60px] flex-row items-center justify-center rounded-[18px] px-5",
        variantClassNames[variant],
        isDisabled && "opacity-50",
        className
      )}
      accessible={normalizeBooleanProp(accessible)}
      disabled={!!isDisabled}
      collapsable={normalizeBooleanProp(collapsable)}
      focusable={normalizeBooleanProp(focusable)}
      hasTVPreferredFocus={normalizeBooleanProp(hasTVPreferredFocus)}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      isTVSelectable={normalizeBooleanProp(isTVSelectable)}
      needsOffscreenAlphaCompositing={normalizeBooleanProp(needsOffscreenAlphaCompositing)}
      rejectResponderTermination={normalizeBooleanProp(rejectResponderTermination)}
      removeClippedSubviews={normalizeBooleanProp(removeClippedSubviews)}
      renderToHardwareTextureAndroid={normalizeBooleanProp(renderToHardwareTextureAndroid)}
      shouldRasterizeIOS={normalizeBooleanProp(shouldRasterizeIOS)}
      touchSoundDisabled={normalizeBooleanProp(touchSoundDisabled)}
    >
      {isLoading ? (
        <ActivityIndicator color={variant === "secondary" || variant === "quiet" ? "#2F8C67" : "#FFFFFF"} />
      ) : (
        <View className="flex-row items-center justify-center gap-2">
          {Icon ? <Icon color={variant === "primary" || variant === "danger" ? "#FFFFFF" : "#2F8C67"} size={22} /> : null}
          <Text className={cn("text-care-base font-semibold", textClassNames[variant])}>{title}</Text>
          {rightAccessory}
        </View>
      )}
    </TouchableOpacity>
  );
}
