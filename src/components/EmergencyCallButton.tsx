import { PhoneCall } from "lucide-react-native";
import { Linking, Text, TouchableOpacity, View } from "react-native";

interface EmergencyCallButtonProps {
  name: string;
  phone: string;
}

export function EmergencyCallButton({ name, phone }: EmergencyCallButtonProps) {
  return (
    <TouchableOpacity
      accessibilityLabel={`Call emergency contact ${name}`}
      accessibilityRole="button"
      activeOpacity={0.78}
      className="min-h-[76px] flex-row items-center justify-between rounded-[20px] bg-care-rose px-5"
      onPress={() => Linking.openURL(`tel:${phone}`)}
    >
      <View>
        <Text className="text-care-sm font-semibold text-white/85">Emergency contact</Text>
        <Text className="mt-1 text-care-lg font-bold text-white">{name}</Text>
      </View>
      <View className="h-14 w-14 items-center justify-center rounded-full bg-white/20 p-3">
        <PhoneCall color="#FFFFFF" size={28} />
      </View>
    </TouchableOpacity>
  );
}
