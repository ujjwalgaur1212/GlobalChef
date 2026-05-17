import { useState } from "react";
import { Mail, LockKeyhole, LogIn } from "lucide-react-native";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "../../components/AppButton";
import { Card } from "../../components/Card";
import { Screen } from "../../components/Screen";
import { TextField } from "../../components/TextField";
import { useAuthStore } from "../../store/useAuthStore";
import type { AuthStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);
  const [email, setEmail] = useState("maya@caredose.app");
  const [password, setPassword] = useState("care1234");

  async function submit() {
    try {
      await login(email, password);
      navigation.getParent()?.reset({ index: 0, routes: [{ name: "MainTabs" }] });
    } catch (error) {
      Alert.alert("Login failed", error instanceof Error ? error.message : "Please try again.");
    }
  }

  return (
    <Screen>
      <View className="pt-8">
        <Text className="text-care-sm font-bold uppercase text-care-leaf">Welcome back</Text>
        <Text className="mt-3 text-care-2xl font-bold text-care-ink dark:text-white">Sign in to CareDose</Text>
        <Text className="mt-3 text-care-base text-care-muted dark:text-[#A7B0BA]">Your medication plan and family alerts are ready.</Text>
      </View>

      <Card className="mt-8 gap-5">
        <View className="flex-row items-center gap-3">
          <Mail color="#2F8C67" size={24} />
          <Text className="text-care-lg font-semibold text-care-ink dark:text-white">Account</Text>
        </View>
        <TextField
          autoCapitalize="none"
          keyboardType="email-address"
          label="Email"
          onChangeText={setEmail}
          value={email}
        />
        <TextField
          label="Password"
          onChangeText={setPassword}
          secureTextEntry
          value={password}
        />
        <AppButton icon={LogIn} loading={isLoading} onPress={submit} title="Sign In" />
      </Card>

      <TouchableOpacity className="mt-7 min-h-[48px] items-center justify-center" onPress={() => navigation.navigate("SignUp")}>
        <Text className="text-care-base font-semibold text-care-leaf">Create a family account</Text>
      </TouchableOpacity>

      <View className="mt-8 flex-row items-center justify-center gap-2">
        <LockKeyhole color="#8A96A3" size={18} />
        <Text className="text-care-sm text-care-muted dark:text-[#A7B0BA]">Firebase-ready secure authentication</Text>
      </View>
    </Screen>
  );
}
