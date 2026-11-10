import { Image } from "expo-image";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "./theme";

/** Обложка с дисковым кэшем (видна и без сети); без картинки — название на сером фоне. */
export function BookCover({ url, title, width = 48 }: { url: string | null | undefined; title: string; width?: number }) {
  const theme = useTheme();
  const [failed, setFailed] = useState(false);
  const size = { width, height: width * 1.5, borderRadius: 4 };
  return (
    <View style={[size, styles.box, { backgroundColor: theme.placeholder }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {!url || failed ? (
        <Text style={[styles.title, { fontSize: Math.max(7, width / 7), color: theme.secondaryText }]} numberOfLines={6}>
          {title}
        </Text>
      ) : (
        <Image source={{ uri: url }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="disk" onError={() => setFailed(true)} transition={150} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { overflow: "hidden", alignItems: "center", justifyContent: "center" },
  title: { textAlign: "center", padding: 3 },
});
