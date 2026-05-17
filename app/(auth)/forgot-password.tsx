import { Link } from "expo-router";
import { Mail } from "lucide-react-native";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Pressable, Text, View } from "react-native";

import { AuthScreenShell } from "@/components/AuthScreenShell";
import { Button } from "@/components/Button";
import { FormInput } from "@/components/FormInput";
import { colors } from "@/constants/theme";
import { EMAIL_REGEX } from "@/constants/validation";
import { useAuth } from "@/hooks/useAuth";
import { getAuthErrorMessage } from "@/services/authService";
import type { ForgotPasswordFormValues } from "@/types/auth";

export default function ForgotPasswordScreen() {
  const { sendPasswordReset } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<ForgotPasswordFormValues>({
    defaultValues: {
      email: ""
    }
  });

  async function onSubmit(values: ForgotPasswordFormValues) {
    setFormError(null);
    setSuccessMessage(null);

    try {
      await sendPasswordReset(values);
      setSuccessMessage("Password reset email sent. Check your inbox for the next step.");
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    }
  }

  return (
    <AuthScreenShell
      eyebrow="Account recovery"
      title="Reset your password."
      subtitle="Enter the email connected to your GlobalChef account and Firebase will send a reset link."
      footer={
        <View className="flex-row items-center justify-center">
          <Text className="text-chef-sm text-chef-muted">Remembered it? </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text className="text-chef-sm font-bold text-chef-saffron">Back to sign in</Text>
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
            required: "Email is required.",
            pattern: {
              value: EMAIL_REGEX,
              message: "Enter a valid email address."
            }
          }}
          render={({ field: { onBlur, onChange, value } }) => (
            <FormInput
              autoCapitalize="none"
              autoComplete="email"
              error={errors.email?.message}
              keyboardType="email-address"
              label="Email"
              leftIcon={<Mail stroke={colors.textMuted} size={20} />}
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="you@example.com"
              textContentType="emailAddress"
              value={value}
            />
          )}
        />

        {formError ? (
          <View className="rounded-chef border border-chef-tomato/40 bg-chef-tomato/10 px-4 py-3">
            <Text className="text-chef-sm font-semibold text-chef-tomato">{formError}</Text>
          </View>
        ) : null}

        {successMessage ? (
          <View className="rounded-chef border border-chef-herb/40 bg-chef-herb/10 px-4 py-3">
            <Text className="text-chef-sm font-semibold text-chef-herb">{successMessage}</Text>
          </View>
        ) : null}

        <Button isLoading={isSubmitting} onPress={handleSubmit(onSubmit)} title="Send reset link" />
      </View>
    </AuthScreenShell>
  );
}
