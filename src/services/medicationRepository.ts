import { addDoc, collection, getDocs, query, serverTimestamp, setDoc, where, doc } from "firebase/firestore";

import { db } from "../config/firebase";
import type { DoseLog, Medication } from "../types/medication";

function toSafeString(value: unknown, fallback = "") {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }

  return fallback;
}

function toSafeNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value ?? fallback);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function toSafeBoolean(value: unknown) {
  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }

  return Boolean(value);
}

function mapMedicationDocument(id: string, data: Record<string, unknown>): Medication {
  return {
    id,
    ownerId: toSafeString(data.ownerId),
    name: toSafeString(data.name),
    dosage: toSafeString(data.dosage),
    instructions: toSafeString(data.instructions),
    times: Array.isArray(data.times)
      ? data.times.map((time, index) => {
          const timeData = typeof time === "object" && time ? (time as Record<string, unknown>) : {};

          return {
            id: toSafeString(timeData.id, String(index)),
            hour: toSafeNumber(timeData.hour),
            minute: toSafeNumber(timeData.minute),
            label: toSafeString(timeData.label)
          };
        })
      : [],
    inventory:
      typeof data.inventory === "object" && data.inventory
        ? {
            pillsRemaining: toSafeNumber((data.inventory as Record<string, unknown>).pillsRemaining),
            refillAt: toSafeNumber((data.inventory as Record<string, unknown>).refillAt)
          }
        : { pillsRemaining: 0, refillAt: 0 },
    color: toSafeString(data.color, "#67C391"),
    voiceReminderEnabled: toSafeBoolean(data.voiceReminderEnabled),
    caregiverAlertsEnabled: toSafeBoolean(data.caregiverAlertsEnabled),
    isActive: toSafeBoolean(data.isActive),
    createdAt: toSafeString(data.createdAt),
    updatedAt: toSafeString(data.updatedAt)
  };
}

export async function fetchMedications(ownerId: string) {
  if (!db) {
    return [];
  }

  const snapshot = await getDocs(query(collection(db, "medications"), where("ownerId", "==", ownerId)));
  return snapshot.docs.map((item) => mapMedicationDocument(item.id, item.data()));
}

export async function upsertMedication(medication: Medication) {
  if (!db) {
    return medication;
  }

  const reference = medication.id
    ? doc(db, "medications", medication.id)
    : doc(collection(db, "medications"));

  const payload = {
    ...medication,
    id: reference.id,
    updatedAt: serverTimestamp()
  };

  await setDoc(reference, payload, { merge: true });
  return { ...medication, id: reference.id };
}

export async function saveDoseLog(log: DoseLog) {
  if (!db) {
    return log;
  }

  await addDoc(collection(db, "doseLogs"), {
    ...log,
    createdAt: serverTimestamp()
  });

  return log;
}
