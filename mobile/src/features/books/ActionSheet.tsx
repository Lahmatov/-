import { useCallback, useState, type ReactNode } from "react";
import { ActionSheetIOS, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../components/theme";
import { L } from "../../i18n";

export type SheetOption = { title: string; destructive?: boolean; onPress: () => void };
type SheetRequest = { title?: string; options: SheetOption[] };

/**
 * Меню действий (замена SwiftUI Menu): на iOS — системный action sheet, на Android — список снизу.
 * Alert на Android вмещает только три кнопки, поэтому для длинных списков (жанры) он не подходит.
 * Верните `sheet` из компонента, чтобы на Android было где показать список.
 */
export function useActionSheet(): { sheet: ReactNode; show: (request: SheetRequest) => void } {
  const [request, setRequest] = useState<SheetRequest | null>(null);

  const show = useCallback((next: SheetRequest) => {
    if (Platform.OS === "ios") {
      const titles = [...next.options.map((o) => o.title), L("Отмена")];
      const destructive = next.options.flatMap((o, i) => (o.destructive ? [i] : []));
      ActionSheetIOS.showActionSheetWithOptions(
        { title: next.title, options: titles, cancelButtonIndex: titles.length - 1, destructiveButtonIndex: destructive },
        (index) => next.options[index]?.onPress(),
      );
      return;
    }
    setRequest(next);
  }, []);

  const sheet = <AndroidSheet request={request} onClose={() => setRequest(null)} />;
  return { sheet, show };
}

function AndroidSheet({ request, onClose }: { request: SheetRequest | null; onClose: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  if (Platform.OS === "ios") return null;
  return (
    <Modal visible={request != null} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={L("Отмена")}>
        <Pressable style={[styles.card, { backgroundColor: theme.card, paddingBottom: insets.bottom + 8 }]} onPress={() => undefined}>
          {request?.title ? <Text style={[styles.title, { color: theme.secondaryText }]}>{request.title}</Text> : null}
          <ScrollView style={{ maxHeight: 420 }}>
            {request?.options.map((option, i) => (
              <Pressable
                key={`${i}-${option.title}`}
                accessibilityRole="button"
                style={({ pressed }) => [styles.option, { borderTopColor: theme.separator }, pressed && { opacity: 0.6 }]}
                onPress={() => {
                  onClose();
                  option.onPress();
                }}
              >
                <Text style={[styles.optionText, { color: option.destructive ? theme.danger : theme.text }]}>{option.title}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.option, { borderTopColor: theme.separator }, pressed && { opacity: 0.6 }]}
            onPress={onClose}
          >
            <Text style={[styles.optionText, { color: theme.accent, fontWeight: "600" }]}>{L("Отмена")}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  card: { borderTopLeftRadius: 14, borderTopRightRadius: 14, paddingTop: 8 },
  title: { fontSize: 13, textAlign: "center", paddingHorizontal: 16, paddingVertical: 8 },
  option: { paddingVertical: 14, paddingHorizontal: 20, borderTopWidth: StyleSheet.hairlineWidth },
  optionText: { fontSize: 17 },
});
