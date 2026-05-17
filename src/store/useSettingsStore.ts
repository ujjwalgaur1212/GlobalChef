import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { EmergencyContact } from "../types/medication";

export type ColorMode = "system" | "light" | "dark";

interface SettingsState {
  colorMode: ColorMode;
  locale: string;
  voiceRemindersEnabled: boolean;
  familyAlertsEnabled: boolean;
  emergencyContact: EmergencyContact;
  setColorMode: (mode: ColorMode) => void;
  setLocale: (locale: string) => void;
  setVoiceRemindersEnabled: (value: boolean) => void;
  setFamilyAlertsEnabled: (value: boolean) => void;
  setEmergencyContact: (contact: EmergencyContact) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      colorMode: "system",
      locale: "en-US",
      voiceRemindersEnabled: true,
      familyAlertsEnabled: true,
      emergencyContact: {
        name: "Aarav Sharma",
        phone: "+1 555 012 1402",
        relationship: "Son"
      },
      setColorMode: (colorMode) => set({ colorMode }),
      setLocale: (locale) => set({ locale }),
      setVoiceRemindersEnabled: (voiceRemindersEnabled) => set({ voiceRemindersEnabled }),
      setFamilyAlertsEnabled: (familyAlertsEnabled) => set({ familyAlertsEnabled }),
      setEmergencyContact: (emergencyContact) => set({ emergencyContact })
    }),
    {
      name: "caredose-settings",
      storage: createJSONStorage(() => AsyncStorage)
    }
  )
);
