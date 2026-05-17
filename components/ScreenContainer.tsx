import { View, type ViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ScreenContainerProps = ViewProps & {
  contentClassName?: string;
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

export function ScreenContainer({
  children,
  className = "",
  contentClassName = "",
  accessible,
  collapsable,
  focusable,
  needsOffscreenAlphaCompositing,
  renderToHardwareTextureAndroid,
  removeClippedSubviews,
  shouldRasterizeIOS,
  ...props
}: ScreenContainerProps) {
  return (
    <View
      {...props}
      className={`flex-1 bg-chef-black ${className}`}
      accessible={normalizeBooleanProp(accessible)}
      collapsable={normalizeBooleanProp(collapsable)}
      focusable={normalizeBooleanProp(focusable)}
      needsOffscreenAlphaCompositing={normalizeBooleanProp(needsOffscreenAlphaCompositing)}
      renderToHardwareTextureAndroid={normalizeBooleanProp(renderToHardwareTextureAndroid)}
      removeClippedSubviews={normalizeBooleanProp(removeClippedSubviews)}
      shouldRasterizeIOS={normalizeBooleanProp(shouldRasterizeIOS)}
    >
      <SafeAreaView className={`flex-1 px-6 py-6 ${contentClassName}`}>{children}</SafeAreaView>
    </View>
  );
}
