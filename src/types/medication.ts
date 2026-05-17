export type UserRole = "patient" | "caregiver" | "family";

export type DoseStatus = "scheduled" | "taken" | "missed" | "skipped";

export type AlertLevel = "missed-only" | "all-reminders" | "emergency";

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship?: string;
}

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
  locale: string;
  emergencyContact?: EmergencyContact;
  caregiverIds: string[];
}

export interface DoseTime {
  id: string;
  hour: number;
  minute: number;
  label: string;
}

export interface MedicationInventory {
  pillsRemaining: number;
  refillAt: number;
}

export interface Medication {
  id: string;
  ownerId: string;
  name: string;
  dosage: string;
  instructions?: string;
  times: DoseTime[];
  inventory: MedicationInventory;
  color: string;
  voiceReminderEnabled: boolean;
  caregiverAlertsEnabled: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DoseLog {
  id: string;
  ownerId: string;
  medicationId: string;
  timeId: string;
  status: DoseStatus;
  scheduledFor: string;
  takenAt?: string;
  createdAt: string;
}

export interface CaregiverLink {
  id: string;
  patientId: string;
  caregiverId: string;
  relationship: string;
  alertLevel: AlertLevel;
  createdAt: string;
}
