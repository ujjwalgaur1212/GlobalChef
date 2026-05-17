import { PropsWithChildren } from "react";
import { View, ViewProps } from "react-native";

import { cn } from "../utils/cn";

interface CardProps extends PropsWithChildren, ViewProps {
  padded?: boolean;
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

export function Card({
  children,
  className,
  padded = true,
  accessible,
  collapsable,
  focusable,
  needsOffscreenAlphaCompositing,
  renderToHardwareTextureAndroid,
  removeClippedSubviews,
  shouldRasterizeIOS,
  ...props
}: CardProps) {
  const normalizedPadded = padded as unknown;
  const shouldPad = normalizedPadded === true || normalizedPadded === "true";

  return (
    <View
      {...props}
      className={cn(
        "rounded-[20px] border border-[#E3EAE6] bg-white shadow-sm dark:border-[#263640] dark:bg-[#17212B]",
        shouldPad && "p-5",
        className
      )}
      accessible={normalizeBooleanProp(accessible)}
      collapsable={normalizeBooleanProp(collapsable)}
      focusable={normalizeBooleanProp(focusable)}
      needsOffscreenAlphaCompositing={normalizeBooleanProp(needsOffscreenAlphaCompositing)}
      renderToHardwareTextureAndroid={normalizeBooleanProp(renderToHardwareTextureAndroid)}
      removeClippedSubviews={normalizeBooleanProp(removeClippedSubviews)}
      shouldRasterizeIOS={normalizeBooleanProp(shouldRasterizeIOS)}
    >
      {children}
    </View>
  );
}
