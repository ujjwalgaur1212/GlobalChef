import { useMemo, useState } from "react";
import { ArrowLeft, BellRing, UsersRound, Volume2 } from "lucide-react-native";
import { Alert, Switch, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "../../components/AppButton";
import { Card } from "../../components/Card";
import { IconButton } from "../../components/IconButton";
import { Screen } from "../../components/Screen";
import { TextField } from "../../components/TextField";
import { medicationColors } from "../../constants/theme";
import { useAuthStore } from "../../store/useAuthStore";
import { useMedicationStore } from "../../store/useMedicationStore";
import type { DoseTime } from "../../types/medication";
import type { RootStackParamList } from "../../types/navigation";
import { cn } from "../../utils/cn";
import { formatDoseTime } from "../../utils/date";

type Props = NativeStackScreenProps<RootStackParamList, "AddMedication">;

const timePresets: DoseTime[] = [
  { id: "morning", hour: 8, minute: 0, label: "Morning" },
  { id: "lunch", hour: 13, minute: 0, label: "Lunch" },
  { id: "evening", hour: 18, minute: 0, label: "Evening" },
  { id: "night", hour: 20, minute: 30, label: "Night" }
];

export function AddMedicationScreen({ navigation, route }: Props) {
  const user = useAuthStore((state) => state.user);
  const medications = useMedicationStore((state) => state.medications);
  const addMedication = useMedicationStore((state) => state.addMedication);
  const updateMedication = useMedicationStore((state) => state.updateMedication);
  const existing = medications.find((item) => item.id === route.params?.medicationId);
  const [name, setName] = useState(existing?.name || "");
  const [dosage, setDosage] = useState(existing?.dosage || "");
  const [instructions, setInstructions] = useState(existing?.instructions || "");
  const [pillsRemaining, setPillsRemaining] = useState(String(existing?.inventory.pillsRemaining || 30));
  const [refillAt, setRefillAt] = useState(String(existing?.inventory.refillAt || 7));
  const [selectedTimes, setSelectedTimes] = useState<string[]>(existing?.times.map((time) => time.id) || ["morning"]);
  const [voiceReminderEnabled, setVoiceReminderEnabled] = useState(existing?.voiceReminderEnabled ?? true);
  const [caregiverAlertsEnabled, setCaregiverAlertsEnabled] = useState(existing?.caregiverAlertsEnabled ?? true);
  const color = existing?.color || medicationColors[medications.length % medicationColors.length];
  const title = existing ? "Edit medicine" : "Add medicine";

  const times = useMemo(
    () => timePresets.filter((time) => selectedTimes.includes(time.id)),
    [selectedTimes]
  );

  function toggleTime(id: string) {
    setSelectedTimes((current) => {
      if (current.includes(id)) {
        return current.length === 1 ? current : current.filter((item) => item !== id);
      }

      return [...current, id];
    });
  }

  async function save() {
    if (!name.trim() || !dosage.trim()) {
      Alert.alert("Add medicine name and dosage");
      return;
    }

    const payload = {
      ownerId: user?.id || "demo-patient",
      name: name.trim(),
      dosage: dosage.trim(),
      instructions: instructions.trim(),
      times,
      inventory: {
        pillsRemaining: Number(pillsRemaining) || 0,
        refillAt: Number(refillAt) || 0
      },
      color,
      voiceReminderEnabled,
      caregiverAlertsEnabled,
      isActive: true
    };

    if (existing) {
      await updateMedication({ ...existing, ...payload });
    } else {
      await addMedication(payload);
    }

    navigation.goBack();
  }

  return (
    <Screen>
      <View className="flex-row items-center justify-between pt-4">
        <IconButton icon={ArrowLeft} label="Back" onPress={() => navigation.goBack()} />
        <Text className="text-care-lg font-bold text-care-ink dark:text-white">{title}</Text>
        <View className="h-12 w-12" />
      </View>

      <Card className="mt-6 gap-5">
        <TextField label="Medicine name" onChangeText={setName} placeholder="Amlodipine" value={name} />
        <TextField label="Dosage" onChangeText={setDosage} placeholder="5 mg" value={dosage} />
        <TextField label="Notes" onChangeText={setInstructions} placeholder="After breakfast" value={instructions} />
      </Card>

      <Card className="mt-5">
        <View className="mb-4 flex-row items-center gap-3">
          <BellRing color="#2F8C67" size={24} />
          <Text className="text-care-lg font-bold text-care-ink dark:text-white">Dose times</Text>
        </View>
        <View className="flex-row flex-wrap gap-3">
          {timePresets.map((time) => {
            const selected = selectedTimes.includes(time.id);
            return (
              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.78}
                className={cn(
                  "min-h-[64px] min-w-[132px] justify-center rounded-[18px] border px-4",
                  selected ? "border-care-leaf bg-[#EAF6EF]" : "border-[#DDE8E1] bg-white dark:border-[#2A3944] dark:bg-[#17212B]"
                )}
                key={time.id}
                onPress={() => toggleTime(time.id)}
              >
                <Text className="text-care-base font-bold text-care-ink dark:text-white">{time.label}</Text>
                <Text className="text-care-sm text-care-muted dark:text-[#A7B0BA]">{formatDoseTime(time)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>

      <Card className="mt-5 gap-5">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 flex-row items-center gap-3">
            <Volume2 color="#4D88FF" size={24} />
            <Text className="text-care-base font-semibold text-care-ink dark:text-white">Voice reminder</Text>
          </View>
          <Switch
            onValueChange={setVoiceReminderEnabled}
            trackColor={{ false: "#D5DED9", true: "#67C391" }}
            value={!!voiceReminderEnabled}
          />
        </View>
        <View className="flex-row items-center justify-between">
          <View className="flex-1 flex-row items-center gap-3">
            <UsersRound color="#2F8C67" size={24} />
            <Text className="text-care-base font-semibold text-care-ink dark:text-white">Family alerts</Text>
          </View>
          <Switch
            onValueChange={setCaregiverAlertsEnabled}
            trackColor={{ false: "#D5DED9", true: "#67C391" }}
            value={!!caregiverAlertsEnabled}
          />
        </View>
      </Card>

      <Card className="mt-5 gap-5">
        <Text className="text-care-lg font-bold text-care-ink dark:text-white">Refill</Text>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <TextField keyboardType="number-pad" label="Pills left" onChangeText={setPillsRemaining} value={pillsRemaining} />
          </View>
          <View className="flex-1">
            <TextField keyboardType="number-pad" label="Remind at" onChangeText={setRefillAt} value={refillAt} />
          </View>
        </View>
      </Card>

      <AppButton className="mt-6" onPress={save} title={existing ? "Save Changes" : "Add Medicine"} />
    </Screen>
  );
}
