import { ArrowLeft, FileHeart, PhoneCall, ShieldAlert } from "lucide-react-native";
import { Linking, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "../../components/AppButton";
import { Card } from "../../components/Card";
import { EmergencyCallButton } from "../../components/EmergencyCallButton";
import { IconButton } from "../../components/IconButton";
import { Screen } from "../../components/Screen";
import { useMedicationStore } from "../../store/useMedicationStore";
import { useSettingsStore } from "../../store/useSettingsStore";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "EmergencySupport">;

export function EmergencySupportScreen({ navigation }: Props) {
  const emergencyContact = useSettingsStore((state) => state.emergencyContact);
  const medications = useMedicationStore((state) => state.medications);

  return (
    <Screen>
      <View className="flex-row items-center justify-between pt-4">
        <IconButton icon={ArrowLeft} label="Back" onPress={() => navigation.goBack()} />
        <Text className="text-care-lg font-bold text-care-ink dark:text-white">Emergency</Text>
        <View className="h-12 w-12" />
      </View>

      <View className="mt-8">
        <EmergencyCallButton name={emergencyContact.name} phone={emergencyContact.phone} />
      </View>

      <AppButton
        className="mt-4"
        icon={PhoneCall}
        onPress={() => Linking.openURL("tel:911")}
        title="Call Emergency Services"
        variant="danger"
      />

      <Card className="mt-6">
        <View className="flex-row items-center gap-4">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-[#FFE8E8]">
            <ShieldAlert color="#F25F6B" size={30} />
          </View>
          <View className="flex-1">
            <Text className="text-care-lg font-bold text-care-ink dark:text-white">Medical ID</Text>
            <Text className="mt-1 text-care-base text-care-muted dark:text-[#A7B0BA]">Available for first responders</Text>
          </View>
        </View>
      </Card>

      <Card className="mt-4 gap-4">
        <View className="flex-row items-center gap-3">
          <FileHeart color="#2F8C67" size={24} />
          <Text className="text-care-lg font-bold text-care-ink dark:text-white">Current medicines</Text>
        </View>
        {medications.map((medication, index) => (
          <View
            className="flex-row items-center justify-between pb-3"
            key={medication.id}
            style={{ borderBottomColor: "#EEF2EF", borderBottomWidth: index === medications.length - 1 ? 0 : 1 }}
          >
            <View>
              <Text className="text-care-base font-semibold text-care-ink dark:text-white">{medication.name}</Text>
              <Text className="mt-1 text-care-sm text-care-muted dark:text-[#A7B0BA]">{medication.dosage}</Text>
            </View>
            <View className="h-4 w-4 rounded-full" style={{ backgroundColor: medication.color }} />
          </View>
        ))}
      </Card>
    </Screen>
  );
}
