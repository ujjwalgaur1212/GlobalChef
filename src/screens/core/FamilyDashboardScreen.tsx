import { AlertCircle, CheckCircle2, MessageCircle, UsersRound } from "lucide-react-native";
import { Text, View } from "react-native";

import { Card } from "../../components/Card";
import { Screen } from "../../components/Screen";
import { SectionHeader } from "../../components/SectionHeader";
import { ToggleRow } from "../../components/ToggleRow";
import { useMedicationStore } from "../../store/useMedicationStore";
import { useSettingsStore } from "../../store/useSettingsStore";
import { getTodaysDoseLogs } from "../../utils/date";

export function FamilyDashboardScreen() {
  const medications = useMedicationStore((state) => state.medications);
  const doseLogs = useMedicationStore((state) => state.doseLogs);
  const familyAlertsEnabled = useSettingsStore((state) => state.familyAlertsEnabled);
  const setFamilyAlertsEnabled = useSettingsStore((state) => state.setFamilyAlertsEnabled);
  const todaysLogs = getTodaysDoseLogs(doseLogs);
  const totalDoses = medications.reduce((count, medication) => count + medication.times.length, 0);
  const takenDoses = todaysLogs.filter((log) => log.status === "taken").length;
  const missedDoses = todaysLogs.filter((log) => log.status === "missed").length;
  const adherence = totalDoses ? Math.round((takenDoses / totalDoses) * 100) : 0;

  return (
    <Screen>
      <View className="pt-4">
        <Text className="text-care-sm font-bold uppercase text-care-leaf">Family</Text>
        <Text className="mt-2 text-care-2xl font-bold text-care-ink dark:text-white">Caregiver dashboard</Text>
      </View>

      <View className="mt-7 flex-row gap-3">
        <Card className="flex-1">
          <CheckCircle2 color="#2F8C67" size={30} />
          <Text className="mt-4 text-[38px] font-black text-care-ink dark:text-white">{String(adherence)}%</Text>
          <Text className="text-care-sm text-care-muted dark:text-[#A7B0BA]">Adherence</Text>
        </Card>
        <Card className="flex-1">
          <AlertCircle color="#F25F6B" size={30} />
          <Text className="mt-4 text-[38px] font-black text-care-ink dark:text-white">{String(missedDoses)}</Text>
          <Text className="text-care-sm text-care-muted dark:text-[#A7B0BA]">Missed</Text>
        </Card>
      </View>

      <SectionHeader title="Care circle" />
      <Card>
        <View className="flex-row items-center gap-4">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-care-sky">
            <UsersRound color="#4D88FF" size={30} />
          </View>
          <View className="flex-1">
            <Text className="text-care-lg font-bold text-care-ink dark:text-white">Aarav Sharma</Text>
            <Text className="mt-1 text-care-base text-care-muted dark:text-[#A7B0BA]">Primary caregiver</Text>
          </View>
          <View className="rounded-full bg-[#EAF6EF] px-3 py-2">
            <Text className="text-care-xs font-bold text-care-leaf">Active</Text>
          </View>
        </View>
      </Card>

      <SectionHeader title="Alerts" />
      <Card>
        <ToggleRow
          icon={<MessageCircle color="#2F8C67" size={24} />}
          onValueChange={setFamilyAlertsEnabled}
          subtitle="Push now, WhatsApp-ready later"
          title="Family notifications"
          value={!!familyAlertsEnabled}
        />
      </Card>

      <SectionHeader title="Summary" />
      <Card className="gap-4">
        <View className="flex-row justify-between">
          <Text className="text-care-base text-care-muted dark:text-[#A7B0BA]">Medicines tracked</Text>
          <Text className="text-care-base font-bold text-care-ink dark:text-white">{String(medications.length)}</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-care-base text-care-muted dark:text-[#A7B0BA]">Doses today</Text>
          <Text className="text-care-base font-bold text-care-ink dark:text-white">{String(totalDoses)}</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-care-base text-care-muted dark:text-[#A7B0BA]">Confirmed</Text>
          <Text className="text-care-base font-bold text-care-ink dark:text-white">{String(takenDoses)}</Text>
        </View>
      </Card>
    </Screen>
  );
}
