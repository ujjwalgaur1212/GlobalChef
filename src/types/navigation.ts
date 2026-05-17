import type { NavigatorScreenParams } from "@react-navigation/native";

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Schedule: undefined;
  Family: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Auth: NavigatorScreenParams<AuthStackParamList> | undefined;
  MainTabs: undefined;
  AddMedication: { medicationId?: string } | undefined;
  Reminder: { medicationId: string; timeId: string };
  EmergencySupport: undefined;
};
