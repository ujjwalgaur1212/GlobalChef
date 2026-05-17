import { TouchableOpacity, TouchableOpacityProps } from "react-native";
import type { LucideIcon } from "lucide-react-native";

import { cn } from "../utils/cn";

interface IconButtonProps extends TouchableOpacityProps {
  icon: LucideIcon;
  label: string;
  tone?: "light" | "dark" | "danger";
}

function normalizeBooleanProp(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }

  return !!value;
}

export function IconButton({ icon: Icon, label, tone = "light", className, ...props }: IconButtonProps) {
  const iconColor = tone === "danger" ? "#F25F6B" : tone === "dark" ? "#FFFFFF" : "#17212B";
  const {
    accessibilityState,
    accessible,
    collapsable,
    disabled,
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
  const isDisabled = !!disabled;
  const normalizedAccessibilityState = {
    ...accessibilityState,
    disabled: !!accessibilityState?.disabled || !!isDisabled
  };

  return (
    <TouchableOpacity
      {...touchableProps}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={normalizedAccessibilityState}
      activeOpacity={0.78}
      className={cn(
        "h-12 w-12 items-center justify-center rounded-full",
        tone === "danger" ? "bg-[#FFE8E8]" : "bg-white dark:bg-[#1B2730]",
        className
      )}
      accessible={normalizeBooleanProp(accessible)}
      collapsable={normalizeBooleanProp(collapsable)}
      disabled={!!isDisabled}
      focusable={normalizeBooleanProp(focusable)}
      hasTVPreferredFocus={normalizeBooleanProp(hasTVPreferredFocus)}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      isTVSelectable={normalizeBooleanProp(isTVSelectable)}
      needsOffscreenAlphaCompositing={normalizeBooleanProp(needsOffscreenAlphaCompositing)}
      rejectResponderTermination={normalizeBooleanProp(rejectResponderTermination)}
      removeClippedSubviews={normalizeBooleanProp(removeClippedSubviews)}
      renderToHardwareTextureAndroid={normalizeBooleanProp(renderToHardwareTextureAndroid)}
      shouldRasterizeIOS={normalizeBooleanProp(shouldRasterizeIOS)}
      touchSoundDisabled={normalizeBooleanProp(touchSoundDisabled)}
    >
      <Icon color={iconColor} size={23} />
    </TouchableOpacity>
  );
}
