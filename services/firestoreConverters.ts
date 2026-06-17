import type { Timestamp } from "firebase/firestore";



type TimestampLike = Timestamp | { toDate?: unknown };

export function toSafeString(value: unknown, fallback = "") {
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

export function toSafeNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value ?? fallback);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

export function toSafeBoolean(value: unknown) {
  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }

  return Boolean(value);
}

export function toSafeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => toSafeString(item)).filter((item) => item.length > 0);
}

export function toSafeDate(value: unknown) {
  const timestamp = value as TimestampLike;

  if (typeof timestamp?.toDate === "function") {
    const date = timestamp.toDate();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  return null;
}

