import Icon from "@mdi/react";
import {
  mdiEmoticonHappyOutline,
  mdiEmoticonSadOutline,
  mdiEmoticonAngryOutline,
  mdiEmoticonConfusedOutline,
  mdiEmoticonNeutralOutline,
  mdiEmoticonOutline,
} from "@mdi/js";

const ICON_PATHS: Record<string, string> = {
  happy:   mdiEmoticonHappyOutline,
  sad:     mdiEmoticonSadOutline,
  angry:   mdiEmoticonAngryOutline,
  anxious: mdiEmoticonConfusedOutline,
  okay:    mdiEmoticonNeutralOutline,
};

const ICON_COLORS: Record<string, string> = {
  happy:   "#92400e",
  sad:     "#1e40af",
  angry:   "#991b1b",
  anxious: "#5b21b6",
  okay:    "#6b7280",
};

export function EmotionIcon({
  emotion,
  size = 24,
  color,
}: {
  emotion: string;
  size?: number;
  color?: string;
}) {
  return (
    <Icon
      path={ICON_PATHS[emotion] ?? mdiEmoticonOutline}
      size={`${size}px`}
      color={color ?? ICON_COLORS[emotion] ?? "#9ca3af"}
    />
  );
}
