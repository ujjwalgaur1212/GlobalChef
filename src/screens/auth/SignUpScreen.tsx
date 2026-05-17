import { useState } from "react";
import { UserPlus } from "lucide-react-native";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "../../components/AppButton";
import { Card } from "../../components/Card";
import { Screen } from "../../components/Screen";
import { TextField } from "../../components/TextField";
import { useAuthStore } from "../../store/useAuthStore";
import type { AuthStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<AuthStackParamList, "SignUp">;

export function SignUpScreen({ navigation }: Props) {
  const signUp = useAuthStore((state) => state.signUp);
  const isLoading = useAuthStore((state) => state.isLoading);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function submit() {
    try {
      await signUp(name || "CareDose User", email, password);
      navigation.getParent()?.reset({ index: 0, routes: [{ name: "MainTabs" }] });
    } catch (error) {
      Alert.alert("Signup failed", error instanceof Error ? error.message : "Please try again.");
    }
  }

  return (
    <Screen>
      <View className="pt-8">
        <Text className="text-care-sm font-bold uppercase text-care-leaf">New care circle</Text>
        <Text className="mt-3 text-care-2xl font-bold text-care-ink dark:text-white">Create your account</Text>
      </View>

      <Card className="mt-8 gap-5">
        <TextField label="Full name" onChangeText={setName} value={name} />
        <TextField autoCapitalize="none" keyboardType="email-address" label="Email" onChangeText={setEmail} value={email} />
        <TextField label="Password" onChangeText={setPassword} secureTextEntry value={password} />
        <AppButton icon={UserPlus} loading={isLoading} onPress={submit} title="Create Account" />
      </Card>

      <TouchableOpacity className="mt-7 min-h-[48px] items-center justify-center" onPress={() => navigation.goBack()}>
        <Text className="text-care-base font-semibold text-care-leaf">I already have an account</Text>
      </TouchableOpacity>
    </Screen>
  );
}
