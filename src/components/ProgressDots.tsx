import { View } from "react-native";

interface ProgressDotsProps {
  total: number;
  activeIndex: number;
}

export function ProgressDots({ total, activeIndex }: ProgressDotsProps) {
  return (
    <View className="flex-row items-center justify-center gap-2">
      {Array.from({ length: total }).map((_, index) => (
        <View
          className={index === activeIndex ? "h-2 w-8 rounded-full bg-care-leaf" : "h-2 w-2 rounded-full bg-[#C8D7CF]"}
          key={index}
        />
      ))}
    </View>
  );
}
