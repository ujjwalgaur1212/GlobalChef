import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import type { Medication } from "../types/medication";
import { formatDoseTime } from "../utils/date";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

export async function registerForPushNotificationsAsync() {
  const existing = await Notifications.getPermissionsAsync();
  let finalStatus = existing.status;

  if (existing.status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("medicine-reminders", {
      name: "Medicine reminders",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 300, 250, 300],
      lightColor: "#2F8C67"
    });
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch {
    return null;
  }
}

export async function cancelMedicationNotifications(medicationId: string) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((notification) => notification.content.data?.medicationId === medicationId)
      .map((notification) => Notifications.cancelScheduledNotificationAsync(notification.identifier))
  );
}

export async function scheduleMedicationNotifications(medication: Medication) {
  await cancelMedicationNotifications(medication.id);

  if (!medication.isActive) {
    return [];
  }

  const identifiers = await Promise.all(
    medication.times.map((time) =>
      Notifications.scheduleNotificationAsync({
        content: {
          title: `Time for ${medication.name}`,
          body: `${medication.dosage} · ${formatDoseTime(time)}`,
          sound: "default",
          data: {
            medicationId: medication.id,
            timeId: time.id,
            type: "medication-reminder"
          }
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: time.hour,
          minute: time.minute,
          channelId: "medicine-reminders"
        } as Notifications.SchedulableNotificationTriggerInput
      })
    )
  );

  return identifiers;
}

export async function scheduleRefillReminder(medication: Medication) {
  if (medication.inventory.pillsRemaining > medication.inventory.refillAt) {
    return null;
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title: `Refill ${medication.name}`,
      body: "Your supply is running low.",
      sound: "default",
      data: {
        medicationId: medication.id,
        type: "refill-reminder"
      }
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 10,
      channelId: "medicine-reminders"
    } as Notifications.SchedulableNotificationTriggerInput
  });
}

export async function notifyCaregiverMissedDose(medication: Medication) {
  if (!medication.caregiverAlertsEnabled) {
    return;
  }

  // Cloud Functions should send real remote alerts to caregiver Expo tokens.
  return Promise.resolve({
    medicationId: medication.id,
    alertType: "missed-dose"
  });
}
