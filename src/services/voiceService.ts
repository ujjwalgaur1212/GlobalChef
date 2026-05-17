import * as Speech from "expo-speech";

import type { Medication } from "../types/medication";
import { formatDoseTime } from "../utils/date";

export function speakMedicationReminder(medication: Medication, timeId?: string, locale = "en-US") {
  const time = medication.times.find((item) => item.id === timeId) || medication.times[0];
  const message = `It is time to take ${medication.name}, ${medication.dosage}, at ${formatDoseTime(time)}.`;

  Speech.stop();
  Speech.speak(message, {
    language: locale,
    pitch: 1,
    rate: 0.84
  });
}

export function stopSpeaking() {
  Speech.stop();
}
