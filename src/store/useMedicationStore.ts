import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { scheduleMedicationNotifications, scheduleRefillReminder } from "../services/notificationService";
import type { DoseLog, DoseStatus, Medication } from "../types/medication";
import { medicationColors } from "../constants/theme";
import { getDoseDateForToday } from "../utils/date";

const now = new Date().toISOString();

const starterMedications: Medication[] = [
  {
    id: "med-metformin",
    ownerId: "demo-patient",
    name: "Metformin",
    dosage: "500 mg",
    instructions: "After breakfast",
    times: [{ id: "morning", hour: 8, minute: 0, label: "Morning" }],
    inventory: { pillsRemaining: 18, refillAt: 7 },
    color: medicationColors[0],
    voiceReminderEnabled: true,
    caregiverAlertsEnabled: true,
    isActive: true,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "med-amlodipine",
    ownerId: "demo-patient",
    name: "Amlodipine",
    dosage: "5 mg",
    instructions: "With water",
    times: [{ id: "night", hour: 20, minute: 30, label: "Night" }],
    inventory: { pillsRemaining: 9, refillAt: 5 },
    color: medicationColors[1],
    voiceReminderEnabled: true,
    caregiverAlertsEnabled: true,
    isActive: true,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "med-vitamin-d",
    ownerId: "demo-patient",
    name: "Vitamin D3",
    dosage: "1000 IU",
    instructions: "After lunch",
    times: [{ id: "afternoon", hour: 13, minute: 0, label: "Afternoon" }],
    inventory: { pillsRemaining: 28, refillAt: 6 },
    color: medicationColors[2],
    voiceReminderEnabled: false,
    caregiverAlertsEnabled: false,
    isActive: true,
    createdAt: now,
    updatedAt: now
  }
];

interface MedicationState {
  medications: Medication[];
  doseLogs: DoseLog[];
  addMedication: (input: Omit<Medication, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateMedication: (medication: Medication) => Promise<void>;
  markDose: (medicationId: string, timeId: string, status: DoseStatus) => void;
  getMedicationById: (id: string) => Medication | undefined;
}

export const useMedicationStore = create<MedicationState>()(
  persist(
    (set, get) => ({
      medications: starterMedications,
      doseLogs: [],
      addMedication: async (input) => {
        const timestamp = new Date().toISOString();
        const medication: Medication = {
          ...input,
          id: `med-${Date.now()}`,
          createdAt: timestamp,
          updatedAt: timestamp
        };

        set((state) => ({ medications: [medication, ...state.medications] }));
        await scheduleMedicationNotifications(medication);
        await scheduleRefillReminder(medication);
      },
      updateMedication: async (medication) => {
        const updated = { ...medication, updatedAt: new Date().toISOString() };
        set((state) => ({
          medications: state.medications.map((item) => (item.id === medication.id ? updated : item))
        }));
        await scheduleMedicationNotifications(updated);
        await scheduleRefillReminder(updated);
      },
      markDose: (medicationId, timeId, status) => {
        const medication = get().medications.find((item) => item.id === medicationId);
        const time = medication?.times.find((item) => item.id === timeId);

        if (!medication || !time) {
          return;
        }

        const scheduledFor = getDoseDateForToday(time).toISOString();
        const log: DoseLog = {
          id: `dose-${medicationId}-${timeId}-${Date.now()}`,
          ownerId: medication.ownerId,
          medicationId,
          timeId,
          status,
          scheduledFor,
          takenAt: status === "taken" ? new Date().toISOString() : undefined,
          createdAt: new Date().toISOString()
        };

        set((state) => ({
          doseLogs: [
            log,
            ...state.doseLogs.filter((item) => !(item.medicationId === medicationId && item.timeId === timeId))
          ],
          medications:
            status === "taken"
              ? state.medications.map((item) =>
                  item.id === medicationId
                    ? {
                        ...item,
                        inventory: {
                          ...item.inventory,
                          pillsRemaining: Math.max(item.inventory.pillsRemaining - 1, 0)
                        }
                      }
                    : item
                )
              : state.medications
        }));
      },
      getMedicationById: (id) => get().medications.find((item) => item.id === id)
    }),
    {
      name: "caredose-medications",
      storage: createJSONStorage(() => AsyncStorage)
    }
  )
);
