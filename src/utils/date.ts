import type { DoseLog, DoseTime, Medication } from "../types/medication";

export function pad(value: number) {
  return value.toString().padStart(2, "0");
}

export function formatDoseTime(time: DoseTime) {
  const date = new Date();
  date.setHours(time.hour, time.minute, 0, 0);

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

export function getDoseDateForToday(time: DoseTime) {
  const date = new Date();
  date.setHours(time.hour, time.minute, 0, 0);
  return date;
}

export function getTodayKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function getRelativeDoseLabel(time: DoseTime) {
  const now = new Date();
  const target = getDoseDateForToday(time);
  const diffMinutes = Math.round((target.getTime() - now.getTime()) / 60000);

  if (diffMinutes < -60) {
    return "Earlier today";
  }

  if (diffMinutes < 0) {
    return "Due now";
  }

  if (diffMinutes < 60) {
    return `In ${diffMinutes} min`;
  }

  return formatDoseTime(time);
}

export function getTodaysDoseLogs(logs: DoseLog[]) {
  const today = new Date();
  return logs.filter((log) => isSameDay(new Date(log.scheduledFor), today));
}

export function getNextDose(medications: Medication[], logs: DoseLog[]) {
  const now = new Date();
  const todaysLogs = getTodaysDoseLogs(logs);

  const doses = medications
    .filter((medication) => medication.isActive)
    .flatMap((medication) =>
      medication.times.map((time) => {
        const scheduledFor = getDoseDateForToday(time);
        const log = todaysLogs.find((item) => item.medicationId === medication.id && item.timeId === time.id);
        return { medication, time, scheduledFor, log };
      })
    )
    .filter((dose) => dose.scheduledFor.getTime() >= now.getTime() - 30 * 60000 && dose.log?.status !== "taken")
    .sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());

  return doses[0];
}

export function formatShortDate(date: string | Date) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric"
  }).format(new Date(date));
}
