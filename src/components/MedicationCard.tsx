import { CheckCircle2, Clock, Volume2 } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";

import type { DoseLog, Medication } from "../types/medication";
import { formatDoseTime, getRelativeDoseLabel } from "../utils/date";
import { AppButton } from "./AppButton";
import { Card } from "./Card";

interface MedicationCardProps {
  medication: Medication;
  logs: DoseLog[];
  onTaken: (timeId: string) => void;
  onOpen?: () => void;
}

export function MedicationCard({ medication, logs, onTaken, onOpen }: MedicationCardProps) {
  const nextTime = medication.times[0];
  const isTaken = logs.some((log) => log.medicationId === medication.id && log.timeId === nextTime.id && log.status === "taken");

  return (
    <TouchableOpacity activeOpacity={0.86} accessibilityRole="button" onPress={onOpen}>
      <Card className="mb-3">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <View className="mb-3 h-3 w-14 rounded-full" style={{ backgroundColor: medication.color }} />
            <Text className="text-care-xl font-bold text-care-ink dark:text-white">{medication.name}</Text>
            <Text className="mt-1 text-care-base text-care-muted dark:text-[#A7B0BA]">{medication.dosage}</Text>
          </View>
          <View className="items-end gap-2">
            <View className="flex-row items-center gap-1 rounded-full bg-[#F1F7F4] px-3 py-2 dark:bg-[#21352C]">
              <Clock color="#2F8C67" size={16} />
              <Text className="text-care-sm font-semibold text-care-leaf dark:text-[#8AD7A9]">{formatDoseTime(nextTime)}</Text>
            </View>
            {medication.voiceReminderEnabled ? <Volume2 color="#4D88FF" size={20} /> : null}
          </View>
        </View>

        <View className="mt-5 flex-row items-center justify-between gap-3">
          <View className="flex-1">
            <Text className="text-care-sm text-care-muted dark:text-[#A7B0BA]">{getRelativeDoseLabel(nextTime)}</Text>
            <Text className="mt-1 text-care-sm text-care-muted dark:text-[#A7B0BA]">
              {String(medication.inventory.pillsRemaining)} left
            </Text>
          </View>
          <AppButton
            className="min-h-[52px] px-5"
            disabled={!!isTaken}
            icon={CheckCircle2}
            onPress={() => onTaken(nextTime.id)}
            title={isTaken ? "Taken" : "Taken"}
            variant={isTaken ? "quiet" : "primary"}
          />
        </View>
      </Card>
    </TouchableOpacity>
  );
}
