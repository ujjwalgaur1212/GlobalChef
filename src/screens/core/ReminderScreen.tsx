import { useEffect } from "react";
import { ArrowLeft, CheckCircle2, Clock3, ShieldCheck, Volume2 } from "lucide-react-native";
import { Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "../../components/AppButton";
import { Card } from "../../components/Card";
import { IconButton } from "../../components/IconButton";
import { Screen } from "../../components/Screen";
import { speakMedicationReminder } from "../../services/voiceService";
import { useMedicationStore } from "../../store/useMedicationStore";
import { useSettingsStore } from "../../store/useSettingsStore";
import type { RootStackParamList } from "../../types/navigation";
import { formatDoseTime } from "../../utils/date";

type Props = NativeStackScreenProps<RootStackParamList, "Reminder">;

export function ReminderScreen({ navigation, route }: Props) {
  const { medicationId, timeId } = route.params;
  const medication = useMedicationStore((state) => state.getMedicationById(medicationId));
  const markDose = useMedicationStore((state) => state.markDose);
  const locale = useSettingsStore((state) => state.locale);
  const voiceEnabled = useSettingsStore((state) => state.voiceRemindersEnabled);
  const time = medication?.times.find((item) => item.id === timeId);

  useEffect(() => {
    if (medication?.voiceReminderEnabled && voiceEnabled) {
      speakMedicationReminder(medication, timeId, locale);
    }
  }, [locale, medication, timeId, voiceEnabled]);

  if (!medication || !time) {
    return (
      <Screen>
        <IconButton icon={ArrowLeft} label="Back" onPress={() => navigation.goBack()} />
        <Card className="mt-10">
          <Text className="text-care-xl font-bold text-care-ink dark:text-white">Reminder not found</Text>
          <Text className="mt-2 text-care-base text-care-muted dark:text-[#A7B0BA]">This medicine may have been removed.</Text>
        </Card>
      </Screen>
    );
  }

  const activeMedication = medication;
  const activeTime = time;

  function taken() {
    markDose(activeMedication.id, activeTime.id, "taken");
    navigation.goBack();
  }

  function skip() {
    markDose(activeMedication.id, activeTime.id, "skipped");
    navigation.goBack();
  }

  return (
    <Screen scroll={false}>
      <View className="flex-1 justify-between">
        <View>
          <View className="flex-row items-center justify-between pt-4">
            <IconButton icon={ArrowLeft} label="Back" onPress={() => navigation.goBack()} />
            <Text className="text-care-lg font-bold text-care-ink dark:text-white">Reminder</Text>
            <IconButton icon={Volume2} label="Speak reminder" onPress={() => speakMedicationReminder(medication, time.id, locale)} />
          </View>

          <View className="mt-10 items-center">
            <View className="h-40 w-40 items-center justify-center rounded-[42px]" style={{ backgroundColor: medication.color }}>
              <Clock3 color="#17212B" size={82} strokeWidth={1.7} />
            </View>
            <Text className="mt-8 text-center text-care-2xl font-black text-care-ink dark:text-white">{medication.name}</Text>
            <Text className="mt-3 text-center text-care-xl font-semibold text-care-muted dark:text-[#A7B0BA]">{medication.dosage}</Text>
            <Text className="mt-4 rounded-full bg-[#EAF6EF] px-5 py-3 text-care-lg font-bold text-care-leaf">
              {formatDoseTime(time)}
            </Text>
          </View>
        </View>

        <View className="gap-4">
          <Card className="flex-row items-center gap-4">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-[#EAF6EF] dark:bg-[#21352C]">
              <ShieldCheck color="#2F8C67" size={26} />
            </View>
            <View className="flex-1">
              <Text className="text-care-base font-semibold text-care-ink dark:text-white">Caregiver alerts are on</Text>
              <Text className="mt-1 text-care-sm text-care-muted dark:text-[#A7B0BA]">Missed doses can notify family.</Text>
            </View>
          </Card>
          <AppButton icon={CheckCircle2} onPress={taken} title="I Took It" />
          <AppButton onPress={skip} title="Skip This Dose" variant="secondary" />
        </View>
      </View>
    </Screen>
  );
}
