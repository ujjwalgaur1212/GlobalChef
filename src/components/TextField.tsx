import { Text, TextInput, TextInputProps, View } from "react-native";

interface TextFieldProps extends TextInputProps {
  label: string;
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

function normalizeTextInputValue(value: unknown) {
  return value === undefined ? undefined : String(value ?? "");
}

export function TextField({
  label,
  className,
  editable,
  multiline,
  secureTextEntry,
  allowFontScaling,
  selectTextOnFocus,
  showSoftInputOnFocus,
  caretHidden,
  contextMenuHidden,
  autoCorrect,
  blurOnSubmit,
  disableFullscreenUI,
  enablesReturnKeyAutomatically,
  scrollEnabled,
  value,
  defaultValue,
  ...props
}: TextFieldProps) {
  return (
    <View className="gap-2">
      <Text className="text-care-sm font-semibold text-care-ink dark:text-white">{label}</Text>
      <TextInput
        className="min-h-[58px] rounded-[18px] border border-[#DDE8E1] bg-white px-4 text-care-base text-care-ink dark:border-[#2A3944] dark:bg-[#17212B] dark:text-white"
        placeholderTextColor="#8A96A3"
        {...props}
        editable={normalizeBooleanProp(editable)}
        multiline={normalizeBooleanProp(multiline)}
        secureTextEntry={normalizeBooleanProp(secureTextEntry)}
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
        defaultValue={normalizeTextInputValue(defaultValue)}
        value={normalizeTextInputValue(value)}
      />
    </View>
  );
}
