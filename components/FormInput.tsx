import { useState, type ReactNode } from "react";
import { Pressable, Text, TextInput, View, type TextInputProps } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";

import { colors } from "@/constants/theme";

type FormInputProps = TextInputProps & {
  label: string;
  error?: string;
  leftIcon?: ReactNode;
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

function normalizeTextInputValue(value: unknown) {
  return value === undefined ? undefined : String(value ?? "");
}

export function FormInput({
  label,
  error,
  leftIcon,
  secureTextEntry,
  editable,
  multiline,
  selectTextOnFocus,
  showSoftInputOnFocus,
  allowFontScaling,
  caretHidden,
  contextMenuHidden,
  autoCorrect,
  blurOnSubmit,
  disableFullscreenUI,
  enablesReturnKeyAutomatically,
  scrollEnabled,
  value,
  defaultValue,
  className = "",
  ...props
}: FormInputProps) {
  const hasSecureEntry = normalizeBooleanProp(secureTextEntry) === true;
  const [isSecure, setIsSecure] = useState(hasSecureEntry);

  return (
    <View className={`gap-2 ${className}`}>
      <Text className="text-chef-sm font-semibold text-chef-cream">{label}</Text>
      <View
        className={`min-h-14 flex-row items-center rounded-chef border bg-chef-panel px-4 ${
          error ? "border-chef-tomato" : "border-chef-line"
        }`}
      >
        {leftIcon ? <View className="mr-3">{leftIcon}</View> : null}
        <TextInput
          className="flex-1 py-4 text-chef-base text-chef-cream"
          placeholderTextColor={colors.textMuted}
          {...props}
          editable={normalizeBooleanProp(editable)}
          multiline={normalizeBooleanProp(multiline)}
          allowFontScaling={normalizeBooleanProp(allowFontScaling)}
          selectTextOnFocus={normalizeBooleanProp(selectTextOnFocus)}
          showSoftInputOnFocus={normalizeBooleanProp(showSoftInputOnFocus)}
          caretHidden={normalizeBooleanProp(caretHidden)}
          contextMenuHidden={normalizeBooleanProp(contextMenuHidden)}
          autoCorrect={normalizeBooleanProp(autoCorrect)}
          blurOnSubmit={normalizeBooleanProp(blurOnSubmit)}
          disableFullscreenUI={normalizeBooleanProp(disableFullscreenUI)}
          enablesReturnKeyAutomatically={normalizeBooleanProp(enablesReturnKeyAutomatically)}
          scrollEnabled={normalizeBooleanProp(scrollEnabled)}
          secureTextEntry={hasSecureEntry ? !!isSecure : false}
          selectionColor={colors.saffron}
          defaultValue={normalizeTextInputValue(defaultValue)}
          value={normalizeTextInputValue(value)}
        />
        {hasSecureEntry ? (
          <Pressable
            accessibilityLabel={isSecure ? "Show password" : "Hide password"}
            accessibilityRole="button"
            className="ml-3 h-10 w-10 items-center justify-center rounded-full"
            onPress={() => setIsSecure((current) => !current)}
          >
            {isSecure ? <EyeOff stroke={colors.textMuted} size={20} /> : <Eye stroke={colors.textMuted} size={20} />}
          </Pressable>
        ) : null}
      </View>
      {error ? <Text className="text-chef-xs font-medium text-chef-tomato">{error}</Text> : null}
    </View>
  );
}
