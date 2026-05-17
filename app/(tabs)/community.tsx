import { UsersRound } from "lucide-react-native";

import { TabPlaceholder } from "@/components/TabPlaceholder";
import { colors } from "@/constants/theme";

export default function CommunityTab() {
  return (
    <TabPlaceholder
      description="Social interactions will be built after accounts and protected navigation are fully stable."
      eyebrow="Community"
      icon={<UsersRound stroke={colors.plum} size={32} strokeWidth={2.4} />}
      title="The community table is reserved."
    />
  );
}
