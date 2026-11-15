import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type AccessibilityActionEvent,
  type AccessibilityActionInfo,
  type AccessibilityState,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { L } from "../i18n";
import { useTheme } from "./theme";

export type IconName = ComponentProps<typeof Ionicons>["name"];

/** Экран в стиле grouped list: прокрутка, pull-to-refresh, секции. */
export function Screen({
  children,
  refreshing,
  onRefresh,
  testID,
  contentStyle,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  testID?: string;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <ScrollView
      testID={testID}
      style={{ flex: 1, backgroundColor: theme.groupedBackground }}
      contentContainerStyle={[{ paddingVertical: 16, gap: 20 }, contentStyle]}
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined}
    >
      {children}
    </ScrollView>
  );
}

/** Секция: заголовок, карточка со строками, подпись. */
export function Section({ title, footer, children, right }: { title?: string; footer?: string; children: ReactNode; right?: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ paddingHorizontal: 16 }}>
      {(title || right) && (
        <View style={styles.sectionHeader}>
          {title ? <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>{title.toUpperCase()}</Text> : <View />}
          {right}
        </View>
      )}
      <View style={[styles.card, { backgroundColor: theme.card }]}>{children}</View>
      {footer && <Text style={[styles.footer, { color: theme.secondaryText }]}>{footer}</Text>}
    </View>
  );
}

/** Строка секции. С onPress — нажимается, со стрелкой вправо по умолчанию. */
export function Row({
  children,
  onPress,
  onLongPress,
  chevron,
  first,
  testID,
  accessibilityLabel,
  accessibilityState,
  accessibilityActions,
  onAccessibilityAction,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  chevron?: boolean;
  first?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityState?: AccessibilityState;
  accessibilityActions?: readonly AccessibilityActionInfo[];
  onAccessibilityAction?: (event: AccessibilityActionEvent) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const content = (
    <View style={[styles.row, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.separator }, style]}>
      <View style={{ flex: 1 }}>{children}</View>
      {(chevron ?? !!onPress) && <Ionicons name="chevron-forward" size={16} color={theme.secondaryText} />}
    </View>
  );
  if (!onPress && !onLongPress) return content;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      accessibilityActions={accessibilityActions}
      onAccessibilityAction={onAccessibilityAction}
      style={({ pressed }) => pressed && { opacity: 0.6 }}
    >
      {content}
    </Pressable>
  );
}

/** Строка «иконка + текст (+ значение справа)». */
export function LabelRow({
  icon,
  title,
  value,
  color,
  onPress,
  first,
  testID,
  destructive,
}: {
  icon?: IconName;
  title: string;
  value?: string;
  color?: string;
  onPress?: () => void;
  first?: boolean;
  testID?: string;
  destructive?: boolean;
}) {
  const theme = useTheme();
  const tint = destructive ? theme.danger : color ?? theme.text;
  return (
    <Row onPress={onPress} first={first} testID={testID} chevron={!!onPress && !destructive}>
      <View style={styles.labelRow}>
        {icon && <Ionicons name={icon} size={20} color={destructive ? theme.danger : theme.accent} />}
        <Text style={[styles.body, { color: tint, flex: 1 }]}>{title}</Text>
        {value !== undefined && <Text style={[styles.body, { color: theme.secondaryText }]}>{value}</Text>}
      </View>
    </Row>
  );
}

export function SwitchRow({ title, value, onChange, first }: { title: string; value: boolean; onChange: (v: boolean) => void; first?: boolean }) {
  const theme = useTheme();
  return (
    <Row first={first}>
      <View style={styles.labelRow}>
        <Text style={[styles.body, { color: theme.text, flex: 1 }]}>{title}</Text>
        <Switch value={value} onValueChange={onChange} trackColor={{ true: theme.accent }} />
      </View>
    </Row>
  );
}

export function Field(props: TextInputProps & { first?: boolean; label?: string }) {
  const theme = useTheme();
  const { first, label, style, ...rest } = props;
  return (
    <Row first={first}>
      {label && <Text style={[styles.caption, { color: theme.secondaryText, marginBottom: 2 }]}>{label}</Text>}
      <TextInput
        placeholderTextColor={theme.secondaryText}
        style={[styles.body, { color: theme.text, paddingVertical: 2, minHeight: rest.multiline ? 80 : undefined, textAlignVertical: rest.multiline ? "top" : "center" }, style]}
        {...rest}
      />
    </Row>
  );
}

export function Button({
  title,
  onPress,
  kind = "bordered",
  icon,
  disabled,
  testID,
  busy,
  style,
}: {
  title: string;
  onPress: () => void;
  kind?: "prominent" | "bordered" | "plain" | "destructive";
  icon?: IconName;
  disabled?: boolean;
  testID?: string;
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const prominent = kind === "prominent";
  const color = kind === "destructive" ? theme.danger : prominent ? theme.onAccent : theme.accent;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(disabled || busy) }}
      style={({ pressed }) => [
        styles.button,
        prominent && { backgroundColor: theme.accent },
        kind === "bordered" && { backgroundColor: theme.dark ? "#3A2E12" : "#FDF1D8" },
        kind === "plain" && { paddingHorizontal: 0, minHeight: 0 },
        (disabled || busy) && { opacity: 0.45 },
        pressed && { opacity: 0.7 },
        style,
      ]}
    >
      {busy ? <ActivityIndicator color={color} /> : icon ? <Ionicons name={icon} size={18} color={color} /> : null}
      <Text style={[styles.buttonText, { color }]}>{title}</Text>
    </Pressable>
  );
}

export function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" />
    </View>
  );
}

/** Ошибка загрузки с кнопкой «Повторить». */
export function ErrorView({ message, onRetry }: { message: string; onRetry: () => void }) {
  const theme = useTheme();
  return (
    <View style={[styles.center, { backgroundColor: theme.groupedBackground }]}>
      <Ionicons name="cloud-offline-outline" size={44} color={theme.secondaryText} />
      <Text style={[styles.headline, { color: theme.text }]}>{L("Не удалось загрузить")}</Text>
      <Text style={[styles.body, { color: theme.secondaryText, textAlign: "center" }]}>{message}</Text>
      <Button title={L("Повторить")} onPress={onRetry} />
    </View>
  );
}

/** Пустое состояние экрана или секции. */
export function Empty({ icon, title, message, children }: { icon?: IconName; title: string; message?: string; children?: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.empty}>
      {icon && <Ionicons name={icon} size={44} color={theme.secondaryText} />}
      <Text style={[styles.headline, { color: theme.text, textAlign: "center" }]}>{title}</Text>
      {message && <Text style={[styles.body, { color: theme.secondaryText, textAlign: "center" }]}>{message}</Text>}
      {children}
    </View>
  );
}

/** Загрузка / ошибка / содержимое для useLoad. */
export function Loaded<T>({ state, children }: { state: { data: T | undefined; error: string | null; reload: () => Promise<void> }; children: (data: T) => ReactNode }) {
  if (state.data !== undefined) return <>{children(state.data)}</>;
  if (state.error) return <ErrorView message={state.error} onRetry={() => void state.reload()} />;
  return <Loading />;
}

export function Caption({ children, style }: { children: ReactNode; style?: object }) {
  const theme = useTheme();
  return <Text style={[styles.caption, { color: theme.secondaryText }, style]}>{children}</Text>;
}

export function Body({ children, style, numberOfLines }: { children: ReactNode; style?: object; numberOfLines?: number }) {
  const theme = useTheme();
  return (
    <Text style={[styles.body, { color: theme.text }, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

export function Headline({ children, style }: { children: ReactNode; style?: object }) {
  const theme = useTheme();
  return <Text style={[styles.headline, { color: theme.text }, style]}>{children}</Text>;
}

/** Сегментированный переключатель. */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: theme.placeholder }]} accessibilityRole="tablist">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={[styles.segment, selected && { backgroundColor: theme.card }]}
          >
            <Text style={[styles.caption, { color: theme.text, fontWeight: selected ? "600" : "400", fontSize: 13 }]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const styles = StyleSheet.create({
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 6, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 12, letterSpacing: 0.3 },
  card: { borderRadius: 10, overflow: "hidden" },
  footer: { fontSize: 12, marginTop: 6, paddingHorizontal: 16 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 11, paddingHorizontal: 16, gap: 8, minHeight: 44 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  body: { fontSize: 16 },
  caption: { fontSize: 12 },
  headline: { fontSize: 17, fontWeight: "600" },
  button: { flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", minHeight: 44, paddingHorizontal: 16, borderRadius: 10 },
  buttonText: { fontSize: 16, fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 24 },
  empty: { alignItems: "center", gap: 8, padding: 24 },
  segmented: { flexDirection: "row", borderRadius: 8, padding: 2 },
  segment: { flex: 1, alignItems: "center", paddingVertical: 6, borderRadius: 7 },
});
