import { Link, router } from "expo-router";
import { LockKeyhole, Mail } from "lucide-react-native";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
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
      eyebrow="Welcome back"
      title="Sign in and start cooking across borders."
      subtitle="Keep your chef profile ready for the recipe and community flows coming next."
      footer={
        <View className="flex-row items-center justify-center">
          <Text className="text-chef-sm text-chef-muted">New to GlobalChef? </Text>
          <Link href="/(auth)/signup" asChild>
            <Pressable>
              <Text className="text-chef-sm font-bold text-chef-saffron">Create account</Text>
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

        <Controller
          control={control}
          name="password"
          rules={{
            required: "Password is required.",
            minLength: {
              value: PASSWORD_MIN_LENGTH,
              message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`
            }
          }}
          render={({ field: { onBlur, onChange, value } }) => (
            <FormInput
              autoCapitalize="none"
              autoComplete="password"
              error={errors.password?.message}
              label="Password"
              leftIcon={<LockKeyhole stroke={colors.textMuted} size={20} />}
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="Enter your password"
              secureTextEntry
              textContentType="password"
              value={value}
            />
          )}
        />

        <View className="items-end">
          <Link href="/(auth)/forgot-password" asChild>
            <Pressable>
              <Text className="text-chef-sm font-bold text-chef-saffron">Forgot password?</Text>
            </Pressable>
          </Link>
        </View>

        {formError ? (
          <View className="rounded-chef border border-chef-tomato/40 bg-chef-tomato/10 px-4 py-3">
            <Text className="text-chef-sm font-semibold text-chef-tomato">{formError}</Text>
          </View>
        ) : null}

        <Button isLoading={isSubmitting} onPress={handleSubmit(onSubmit)} title="Sign in" />
      </View>
    </AuthScreenShell>
  );
}
