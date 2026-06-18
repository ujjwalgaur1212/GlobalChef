import { Link, router } from "expo-router";
import { LockKeyhole, Mail } from "lucide-react-native";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

import { AuthScreenShell } from "@/components/AuthScreenShell";
import { Button } from "@/components/Button";
import { FormInput } from "@/components/FormInput";
import { colors } from "@/constants/theme";
import { EMAIL_REGEX, PASSWORD_MIN_LENGTH } from "@/constants/validation";
import { useAuth } from "@/hooks/useAuth";
import { getAuthErrorMessage } from "@/services/authService";
import type { LoginFormValues } from "@/types/auth";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const { t } = useTranslation();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginFormValues>({
    defaultValues: {
      email: "",
      password: ""
    }
  });

  async function onSubmit(values: LoginFormValues) {
    setFormError(null);

    try {
      await signIn(values);
      router.replace("/(tabs)");
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    }
  }

  return (
    <AuthScreenShell
      eyebrow={t("auth.login.title")}
      title={t("auth.login.loginHeaderTitle")}
      subtitle={t("auth.login.subtitle")}
      footer={
        <View className="flex-row items-center justify-center">
          <Text className="text-chef-sm text-chef-muted">{t("auth.login.noAccountText")} </Text>
          <Link href="/(auth)/signup" asChild>
            <Pressable>
              <Text className="text-chef-sm font-bold text-chef-saffron">{t("auth.login.signupBtn")}</Text>
            </Pressable>
          </Link>
        </View>
      }
    >
      <View className="gap-5">
        <Controller
          control={control}
          name="email"
          rules={{
            required: t("auth.validation.emailRequired"),
            pattern: {
              value: EMAIL_REGEX,
              message: t("auth.validation.emailInvalid")
            }
          }}
          render={({ field: { onBlur, onChange, value } }) => (
            <FormInput
              autoCapitalize="none"
              autoComplete="email"
              error={errors.email?.message}
              keyboardType="email-address"
              label={t("auth.login.emailLabel")}
              leftIcon={<Mail stroke={colors.textMuted} size={20} />}
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder={t("auth.validation.emailPlaceholder")}
              textContentType="emailAddress"
              value={value}
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          rules={{
            required: t("auth.validation.passwordRequired"),
            minLength: {
              value: PASSWORD_MIN_LENGTH,
              message: t("auth.validation.passwordMinLength", { count: PASSWORD_MIN_LENGTH })
            }
          }}
          render={({ field: { onBlur, onChange, value } }) => (
            <FormInput
              autoCapitalize="none"
              autoComplete="password"
              error={errors.password?.message}
              label={t("auth.login.passwordLabel")}
              leftIcon={<LockKeyhole stroke={colors.textMuted} size={20} />}
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder={t("auth.validation.passwordPlaceholder")}
              secureTextEntry
              textContentType="password"
              value={value}
            />
          )}
        />

        <View className="items-end">
          <Link href="/(auth)/forgot-password" asChild>
            <Pressable>
              <Text className="text-chef-sm font-bold text-chef-saffron">{t("auth.login.forgotPasswordBtn")}</Text>
            </Pressable>
          </Link>
        </View>

        {formError ? (
          <View className="rounded-chef border border-chef-tomato/40 bg-chef-tomato/10 px-4 py-3">
            <Text className="text-chef-sm font-semibold text-chef-tomato">{formError}</Text>
          </View>
        ) : null}

        <Button isLoading={isSubmitting} onPress={handleSubmit(onSubmit)} title={t("auth.login.loginBtn")} />
      </View>
    </AuthScreenShell>
  );
}
