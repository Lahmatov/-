import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import type { PublicUser } from "../../api/models";
import { Row } from "../../components/ui";
import { useTheme } from "../../components/theme";
import { routes } from "../../lib/routes";

/** Строка человека: открывает его профиль. */
export function UserRow({ user, first }: { user: PublicUser; first?: boolean }) {
  const theme = useTheme();
  return (
    <Row first={first} onPress={() => router.push(routes.user(user.id))} accessibilityLabel={user.name} testID={`user-${user.id}`}>
      <View style={styles.row}>
        <Ionicons name="person-circle-outline" size={24} color={theme.accent} />
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
          {user.name}
        </Text>
      </View>
    </Row>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  name: { fontSize: 16, flex: 1 },
});
