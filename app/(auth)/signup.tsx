import { Link, router } from "expo-router";
import { LockKeyhole, Mail, UserRound } from "lucide-react-native";
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
import type { SignupFormValues } from "@/types/auth";

export default function SignupScreen() {
  const { signUp } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const { t } = useTranslation();
  const {
    control,
    getValues,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<SignupFormValues>({
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
      confirmPassword: ""
    }
  });

  async function onSubmit(values: SignupFormValues) {
    setFormError(null);

    try {
      await signUp(values);
      router.replace("/(tabs)");
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    }
  }

  return (
    <AuthScreenShell
      eyebrow={t("auth.signup.signupEyebrow")}
      title={t("auth.signup.signupTitle")}
      subtitle={t("auth.signup.subtitle")}
      footer={
        <View className="flex-row items-center justify-center">
          <Text className="text-chef-sm text-chef-muted">{t("auth.signup.haveAccountText")} </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text className="text-chef-sm font-bold text-chef-saffron">{t("auth.signup.signinBtn")}</Text>
            </Pressable>
          </Link>
        </View>
      }
    >
      <View className="gap-5">
        <Controller
          control={control}
          name="displayName"
          rules={{
            required: t("auth.validation.displayNameRequired"),
            minLength: {
              value: 2,
              message: t("auth.validation.displayNameMinLength")
            }
          }}
          render={({ field: { onBlur, onChange, value } }) => (
            <FormInput
              autoCapitalize="words"
              autoComplete="name"
              error={errors.displayName?.message}
              label={t("auth.signup.nameLabel")}
              leftIcon={<UserRound stroke={colors.textMuted} size={20} />}
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="Aarav Patel"
              textContentType="name"
              value={value}
            />
          )}
        />

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
              autoComplete="new-password"
              error={errors.password?.message}
              label={t("auth.login.passwordLabel")}
              leftIcon={<LockKeyhole stroke={colors.textMuted} size={20} />}
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder={t("auth.validation.createPasswordPlaceholder")}
              secureTextEntry
              textContentType="newPassword"
              value={value}
            />
          )}
        />

        <Controller
          control={control}
          name="confirmPassword"
          rules={{
            required: t("auth.validation.confirmPasswordRequired"),
            validate: (value) => value === getValues("password") || t("auth.validation.passwordsNotMatch")
          }}
          render={({ field: { onBlur, onChange, value } }) => (
            <FormInput
              autoCapitalize="none"
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
              label={t("auth.validation.confirmPasswordLabel")}
              leftIcon={<LockKeyhole stroke={colors.textMuted} size={20} />}
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder={t("auth.validation.confirmPasswordPlaceholder")}
              secureTextEntry
              textContentType="newPassword"
              value={value}
            />
          )}
        />

        {formError ? (
          <View className="rounded-chef border border-chef-tomato/40 bg-chef-tomato/10 px-4 py-3">
            <Text className="text-chef-sm font-semibold text-chef-tomato">{formError}</Text>
          </View>
        ) : null}

        <Button isLoading={isSubmitting} onPress={handleSubmit(onSubmit)} title={t("auth.signup.signupBtn")} />
      </View>
    </AuthScreenShell>
  );
}
