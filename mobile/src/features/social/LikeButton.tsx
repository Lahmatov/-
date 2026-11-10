import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import type { LikeState } from "../../api/models";
import { useAPI } from "../../auth/AuthContext";
import { useTheme } from "../../components/theme";
import { L } from "../../i18n";

/** ♥ с числом лайков. Сам хранит состояние: меняет оптимистично, при ошибке возвращает как было. */
export function LikeButton({ entryId, likes, likedByMe }: { entryId: string; likes: number; likedByMe: boolean }) {
  const api = useAPI();
  const theme = useTheme();
  const [state, setState] = useState<LikeState>({ likes, likedByMe });
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Экран перезагрузил данные — показываем то, что пришло с сервера.
  useEffect(() => {
    setState({ likes, likedByMe });
  }, [entryId, likes, likedByMe]);

  const toggle = async () => {
    if (busy) return;
    const previous = state;
    setBusy(true);
    setState({ likes: Math.max(0, previous.likes + (previous.likedByMe ? -1 : 1)), likedByMe: !previous.likedByMe });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    try {
      const next = await api.setLiked(!previous.likedByMe, entryId);
      if (mounted.current) setState(next);
    } catch {
      if (mounted.current) setState(previous);
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  const color = state.likedByMe ? theme.danger : theme.secondaryText;
  return (
    <Pressable
      onPress={() => void toggle()}
      disabled={busy}
      hitSlop={8}
      testID={`like-${entryId}`}
      accessibilityRole="button"
      accessibilityLabel={state.likedByMe ? L("Убрать лайк") : L("Нравится")}
      accessibilityValue={{ text: String(state.likes) }}
      accessibilityState={{ selected: state.likedByMe, disabled: busy }}
      style={({ pressed }) => [styles.button, pressed && { opacity: 0.6 }]}
    >
      <Ionicons name={state.likedByMe ? "heart" : "heart-outline"} size={18} color={color} />
      {state.likes > 0 && <Text style={[styles.count, { color }]}>{state.likes}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 32 },
  count: { fontSize: 15 },
});
