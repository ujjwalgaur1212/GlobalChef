import { LinearGradient } from "expo-linear-gradient";
import { BellRing, CheckCircle2, Plus, Volume2 } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { AppButton } from "../../components/AppButton";
import { Card } from "../../components/Card";
import { EmergencyCallButton } from "../../components/EmergencyCallButton";
import { IconButton } from "../../components/IconButton";
import { MedicationCard } from "../../components/MedicationCard";
import { Screen } from "../../components/Screen";
import { SectionHeader } from "../../components/SectionHeader";
import { speakMedicationReminder } from "../../services/voiceService";
import { useAuthStore } from "../../store/useAuthStore";
import { useMedicationStore } from "../../store/useMedicationStore";
import { useSettingsStore } from "../../store/useSettingsStore";
import type { RootStackParamList } from "../../types/navigation";
import { getNextDose, getTodaysDoseLogs, formatDoseTime } from "../../utils/date";

export function HomeDashboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useAuthStore((state) => state.user);
  const locale = useSettingsStore((state) => state.locale);
  const emergencyContact = useSettingsStore((state) => state.emergencyContact);
  const medications = useMedicationStore((state) => state.medications);
  const doseLogs = useMedicationStore((state) => state.doseLogs);
  const markDose = useMedicationStore((state) => state.markDose);
  const todaysLogs = getTodaysDoseLogs(doseLogs);
  const totalDoses = medications.reduce((count, medication) => count + medication.times.length, 0);
  const takenDoses = todaysLogs.filter((log) => log.status === "taken").length;
  const progress = totalDoses ? Math.round((takenDoses / totalDoses) * 100) : 0;
  const nextDose = getNextDose(medications, doseLogs);
  const firstName = user?.displayName?.split(" ")[0] || "there";

  function markNextTaken() {
    if (!nextDose) {
      return;
    }

    markDose(nextDose.medication.id, nextDose.time.id, "taken");
  }

  return (
    <Screen>
      <View className="flex-row items-center justify-between pt-4">
        <View>
          <Text className="text-care-sm font-bold uppercase text-care-leaf">Today</Text>
          <Text className="mt-2 text-care-2xl font-bold text-care-ink dark:text-white">Hi, {firstName}</Text>
        </View>
        <View className="flex-row gap-3">
          <IconButton icon={BellRing} label="Notifications" />
          <IconButton icon={Plus} label="Add medication" onPress={() => navigation.navigate("AddMedication")} />
        </View>
      </View>

      <LinearGradient
        colors={["#E5F8ED", "#DCEEFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 28, marginTop: 28, padding: 22 }}
      >
        <Text className="text-care-sm font-bold uppercase text-care-leaf">Daily progress</Text>
        <View className="mt-5 flex-row items-end justify-between">
          <View>
            <Text className="text-[46px] font-black text-care-ink">{String(progress)}%</Text>
            <Text className="text-care-base font-semibold text-care-muted">
              {String(takenDoses)} of {String(totalDoses)} taken
            </Text>
          </View>
          <View className="h-24 w-24 items-center justify-center rounded-full bg-white/70">
            <CheckCircle2 color="#2F8C67" size={48} />
          </View>
        </View>
      </LinearGradient>

      {nextDose ? (
        <>
          <SectionHeader title="Next dose" />
          <TouchableOpacity
            activeOpacity={0.86}
            onPress={() =>
              navigation.navigate("Reminder", {
                medicationId: nextDose.medication.id,
                timeId: nextDose.time.id
              })
            }
          >
            <Card>
              <View className="flex-row items-start justify-between gap-4">
                <View className="flex-1">
                  <Text className="text-care-xl font-bold text-care-ink dark:text-white">{nextDose.medication.name}</Text>
                  <Text className="mt-1 text-care-lg text-care-muted dark:text-[#A7B0BA]">{nextDose.medication.dosage}</Text>
                  <Text className="mt-4 text-care-base font-semibold text-care-leaf">
                    {formatDoseTime(nextDose.time)}
                  </Text>
                </View>
                <View className="rounded-full bg-[#EAF6EF] p-4 dark:bg-[#21352C]">
                  <BellRing color="#2F8C67" size={32} />
                </View>
              </View>
              <View className="mt-6 flex-row gap-3">
                <AppButton className="flex-1" icon={CheckCircle2} onPress={markNextTaken} title="Taken" />
                <IconButton
                  className="h-[60px] w-[60px]"
                  icon={Volume2}
                  label="Speak reminder"
                  onPress={() => speakMedicationReminder(nextDose.medication, nextDose.time.id, locale)}
                />
              </View>
            </Card>
          </TouchableOpacity>
        </>
      ) : (
        <Card className="mt-6">
          <Text className="text-care-xl font-bold text-care-ink dark:text-white">All set for now</Text>
          <Text className="mt-2 text-care-base text-care-muted dark:text-[#A7B0BA]">No more scheduled doses are waiting today.</Text>
        </Card>
      )}

      <View className="mt-6">
        <EmergencyCallButton name={emergencyContact.name} phone={emergencyContact.phone} />
      </View>

      <SectionHeader action="Add" title="Medicines" />
      {medications.map((medication) => (
        <MedicationCard
          key={medication.id}
          logs={todaysLogs}
          medication={medication}
          onOpen={() => navigation.navigate("AddMedication", { medicationId: medication.id })}
          onTaken={(timeId) => markDose(medication.id, timeId, "taken")}
        />
      ))}
    </Screen>
  );
}
