import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Button, Row, Section, type IconName } from "../../components/ui";
import { useTheme } from "../../components/theme";
import { L } from "../../i18n";

// Общие элементы экранов клубов и челленджей.

/** Кнопка-иконка в заголовке экрана. */
export function HeaderIconButton({ icon, label, onPress, testID }: { icon: IconName; label: string; onPress: () => void; testID?: string }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={10} accessibilityRole="button" accessibilityLabel={label} testID={testID} style={({ pressed }) => [styles.headerButton, pressed && { opacity: 0.5 }]}>
      <Ionicons name={icon} size={24} color={theme.accent} />
    </Pressable>
  );
}

/** Строка «текст  [−] [+]» — аналог Stepper. */
export function StepperRow({
  title,
  value,
  min,
  max,
  onChange,
  first,
  testID,
}: {
  title: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  first?: boolean;
  testID?: string;
}) {
  const theme = useTheme();
  const step = (delta: number) => onChange(Math.min(max, Math.max(min, value + delta)));
  return (
    <Row first={first}>
      <View
        style={styles.stepperRow}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={title}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(e) => step(e.nativeEvent.actionName === "increment" ? 1 : -1)}
        testID={testID}
      >
        <Text style={[styles.body, { color: theme.text, flex: 1 }]}>{title}</Text>
        <View style={[styles.stepper, { backgroundColor: theme.placeholder }]}>
          <Pressable onPress={() => step(-1)} disabled={value <= min} hitSlop={4} style={[styles.stepperButton, value <= min && { opacity: 0.35 }]}>
            <Ionicons name="remove" size={20} color={theme.text} />
          </Pressable>
          <View style={[styles.stepperDivider, { backgroundColor: theme.separator }]} />
          <Pressable onPress={() => step(1)} disabled={value >= max} hitSlop={4} style={[styles.stepperButton, value >= max && { opacity: 0.35 }]}>
            <Ionicons name="add" size={20} color={theme.text} />
          </Pressable>
        </View>
      </View>
    </Row>
  );
}

/** Вступление по коду приглашения: поле и кнопка прямо на экране списка. */
export function JoinByCodeSection({
  code,
  onChangeCode,
  onJoin,
  busy,
  footer,
  testID,
}: {
  code: string;
  onChangeCode: (code: string) => void;
  onJoin: () => void;
  busy: boolean;
  footer?: string;
  testID?: string;
}) {
  const theme = useTheme();
  const canJoin = code.trim().length > 0 && !busy;
  return (
    <Section title={L("Вступить по коду")} footer={footer}>
      <Row first>
        <View style={styles.joinRow}>
          <Ionicons name="key-outline" size={20} color={theme.accent} />
          <TextInput
            value={code}
            onChangeText={onChangeCode}
            placeholder={L("Например, AB3DEF9K")}
            placeholderTextColor={theme.secondaryText}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            returnKeyType="go"
            onSubmitEditing={() => canJoin && onJoin()}
            accessibilityLabel={L("Код приглашения")}
            testID={testID}
            style={[styles.body, { color: theme.text, flex: 1, paddingVertical: 4 }]}
          />
          <Button title={L("Вступить")} kind="plain" onPress={onJoin} disabled={!canJoin} busy={busy} />
        </View>
      </Row>
    </Section>
  );
}

const styles = StyleSheet.create({
  headerButton: { paddingHorizontal: 4 },
  body: { fontSize: 16 },
  stepperRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepper: { flexDirection: "row", alignItems: "center", borderRadius: 8 },
  stepperButton: { paddingHorizontal: 14, paddingVertical: 6 },
  stepperDivider: { width: StyleSheet.hairlineWidth, height: 18 },
  joinRow: { flexDirection: "row", alignItems: "center", gap: 10 },
});
