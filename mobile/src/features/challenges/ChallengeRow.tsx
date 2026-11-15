import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { challengeCompleted, challengeFraction, type Challenge } from "../../api/models";
import { ProgressBar } from "../../components/ProgressBar";
import { useTheme } from "../../components/theme";
import { L } from "../../i18n";
import { challengeSummary, participantsCount } from "./challengeText";

export function ChallengeRow({ challenge }: { challenge: Challenge }) {
  const theme = useTheme();
  const completed = challengeCompleted(challenge);
  return (
    <View style={styles.box}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
          {challenge.title}
        </Text>
        {completed && challenge.myProgress != null && <Ionicons name="ribbon" size={16} color={theme.accent} accessibilityLabel={L("Выполнен")} />}
        {!challenge.isPublic && <Ionicons name="lock-closed" size={12} color={theme.secondaryText} />}
      </View>
      <Text style={[styles.subtitle, { color: theme.secondaryText }]}>{challengeSummary(challenge)}</Text>
      {challenge.myProgress != null ? (
        <View style={{ gap: 4 }}>
          <Text style={[styles.caption, { color: theme.text }]}>{L("%@ из %@", String(challenge.myProgress), String(challenge.goal))}</Text>
          <ProgressBar value={challengeFraction(challenge)} color={completed ? theme.success : theme.accent} />
        </View>
      ) : (
        <Text style={[styles.caption, { color: theme.secondaryText }]}>{participantsCount(challenge.participantCount)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 6, paddingVertical: 2 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  title: { fontSize: 17, fontWeight: "600", flexShrink: 1 },
  subtitle: { fontSize: 14 },
  caption: { fontSize: 12 },
});
