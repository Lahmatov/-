import { Stack } from "expo-router";
import { useTheme } from "../../components/theme";
import { L } from "../../i18n";

/** Всё, что доступно после входа: вкладки и экраны, которые открываются поверх них. */
export default function AppLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerTintColor: theme.accent,
        headerStyle: { backgroundColor: theme.card },
        headerTitleStyle: { color: theme.text },
        contentStyle: { backgroundColor: theme.groupedBackground },
        headerBackButtonDisplayMode: "minimal",
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false, title: L("Назад") }} />
      <Stack.Screen name="add-book" options={{ presentation: "modal", title: L("Новая книга") }} />
      <Stack.Screen name="scan" options={{ presentation: "fullScreenModal", headerShown: false }} />
      <Stack.Screen name="review/[bookId]" options={{ presentation: "modal" }} />
      <Stack.Screen name="quote-edit" options={{ presentation: "modal" }} />
      <Stack.Screen name="comments/[entryId]" options={{ presentation: "modal" }} />
      <Stack.Screen name="list-edit" options={{ presentation: "modal" }} />
      <Stack.Screen name="add-to-list/[bookId]" options={{ presentation: "modal" }} />
      <Stack.Screen name="club-new" options={{ presentation: "modal" }} />
      <Stack.Screen name="challenge-new" options={{ presentation: "modal" }} />
    </Stack>
  );
}
