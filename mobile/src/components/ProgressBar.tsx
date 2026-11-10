import { View } from "react-native";
import { useTheme } from "./theme";

export function ProgressBar({ value, height = 4, color }: { value: number; height?: number; color?: string }) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: theme.placeholder, overflow: "hidden" }}>
      <View style={{ width: `${clamped * 100}%`, height, backgroundColor: color ?? theme.accent }} />
    </View>
  );
}
