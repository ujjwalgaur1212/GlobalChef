import { AlertCircle, CheckCircle2, Clock3 } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Card } from "../../components/Card";
import { Screen } from "../../components/Screen";
import { SectionHeader } from "../../components/SectionHeader";
import { useMedicationStore } from "../../store/useMedicationStore";
import type { RootStackParamList } from "../../types/navigation";
import { formatDoseTime, getDoseDateForToday, getTodaysDoseLogs } from "../../utils/date";

export function ScheduleScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const medications = useMedicationStore((state) => state.medications);
  const doseLogs = useMedicationStore((state) => state.doseLogs);
  const todaysLogs = getTodaysDoseLogs(doseLogs);

  const timeline = medications
    .flatMap((medication) =>
      medication.times.map((time) => ({
        medication,
        time,
        scheduledFor: getDoseDateForToday(time),
        log: todaysLogs.find((item) => item.medicationId === medication.id && item.timeId === time.id)
      }))
    )
    .sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());

  return (
    <Screen>
      <View className="pt-4">
        <Text className="text-care-sm font-bold uppercase text-care-leaf">Schedule</Text>
        <Text className="mt-2 text-care-2xl font-bold text-care-ink dark:text-white">Today’s doses</Text>
      </View>

      <SectionHeader title="Timeline" />
      <View className="gap-3">
        {timeline.map(({ medication, time, log }) => {
          const status = log?.status || "scheduled";
          const isTaken = status === "taken";
          const Icon = isTaken ? CheckCircle2 : status === "missed" ? AlertCircle : Clock3;

          return (
            <TouchableOpacity
              activeOpacity={0.86}
              key={`${medication.id}-${time.id}`}
              onPress={() => navigation.navigate("Reminder", { medicationId: medication.id, timeId: time.id })}
            >
              <Card className="flex-row items-center gap-4">
                <View className="h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: medication.color }}>
                  <Icon color={isTaken ? "#2F8C67" : "#17212B"} size={28} />
                </View>
                <View className="flex-1">
                  <Text className="text-care-lg font-bold text-care-ink dark:text-white">{medication.name}</Text>
                  <Text className="mt-1 text-care-base text-care-muted dark:text-[#A7B0BA]">
                    {medication.dosage} · {time.label}
                  </Text>
                </View>
                <Text className="text-care-base font-bold text-care-leaf">{formatDoseTime(time)}</Text>
              </Card>
            </TouchableOpacity>
          );
        })}
      </View>

      <SectionHeader title="History" />
      <Card>
        <Text className="text-care-lg font-bold text-care-ink dark:text-white">{String(todaysLogs.length)} updates today</Text>
        <Text className="mt-2 text-care-base text-care-muted dark:text-[#A7B0BA]">
          Taken confirmations sync with family dashboards when online.
        </Text>
      </Card>
    </Screen>
  );
}
