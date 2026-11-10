import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import type { Badge } from "../../api/models";
import { Section } from "../../components/ui";
import { useTheme } from "../../components/theme";
import { L } from "../../i18n";
import { routes } from "../../lib/routes";

/**
 * Значки за выполненные челленджи — в профиле. Пока значков нет, раздел не показывается.
 * Значки загружает сам экран профиля (api.badges()).
 */
export function BadgesSection({ badges }: { badges: Badge[] }) {
  const theme = useTheme();
  if (badges.length === 0) return null;
  return (
    <Section title={L("Значки")}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip} testID="badges">
        {badges.map((badge) => (
          <Pressable
            key={badge.id}
            onPress={() => router.push(routes.challenge(badge.id))}
            accessibilityRole="button"
            accessibilityLabel={badge.title}
            style={({ pressed }) => [styles.badge, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="ribbon" size={32} color={theme.accent} />
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
              {badge.title}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </Section>
  );
}

const styles = StyleSheet.create({
  strip: { gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  badge: { width: 84, alignItems: "center", gap: 4 },
  title: { fontSize: 12, textAlign: "center" },
});
