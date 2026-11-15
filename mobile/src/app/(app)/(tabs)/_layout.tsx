import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useEffect } from "react";
import { AppState, View } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { useAuth } from "../../../auth/AuthContext";
import { OfflineBanner } from "../../../components/OfflineBanner";
import { useTheme } from "../../../components/theme";
import { L } from "../../../i18n";
import { enablePush } from "../../../lib/push";

export default function TabsLayout() {
  const { api } = useAuth();
  const theme = useTheme();

  useEffect(() => {
    void enablePush(api);
    // Неотправленные изменения уходят, когда появилась сеть или пользователь вернулся в приложение.
    let wasConnected = true;
    const unsubscribeNet = NetInfo.addEventListener((s) => {
      const connected = s.isConnected !== false;
      if (connected && !wasConnected) void api.flushOutbox();
      wasConnected = connected;
    });
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void api.flushOutbox();
    });
    void api.flushOutbox();
    return () => {
      unsubscribeNet();
      sub.remove();
    };
  }, [api]);

  const icon =
    (name: React.ComponentProps<typeof Ionicons>["name"]) =>
    ({ color, size }: { color: import("react-native").ColorValue; size: number }) => <Ionicons name={name} color={color as string} size={size} />;

  return (
    <View style={{ flex: 1, backgroundColor: theme.card }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: theme.accent,
          headerTintColor: theme.accent,
          headerStyle: { backgroundColor: theme.card },
          headerTitleStyle: { color: theme.text },
          tabBarStyle: { backgroundColor: theme.card },
          header: undefined,
        }}
        screenLayout={({ children }) => (
          <View style={{ flex: 1 }}>
            <OfflineBanner />
            {children}
          </View>
        )}
      >
        <Tabs.Screen name="index" options={{ title: L("Полка"), tabBarIcon: icon("library-outline"), tabBarButtonTestID: "tab-shelf" }} />
        <Tabs.Screen name="search" options={{ title: L("Поиск"), tabBarIcon: icon("search-outline"), tabBarButtonTestID: "tab-search" }} />
        <Tabs.Screen name="feed" options={{ title: L("Лента"), tabBarIcon: icon("people-outline"), tabBarButtonTestID: "tab-feed" }} />
        <Tabs.Screen name="stats" options={{ title: L("Итоги"), tabBarIcon: icon("bar-chart-outline"), tabBarButtonTestID: "tab-stats" }} />
        <Tabs.Screen name="profile" options={{ title: L("Профиль"), tabBarIcon: icon("person-circle-outline"), tabBarButtonTestID: "tab-profile" }} />
      </Tabs>
    </View>
  );
}
