import { useColorScheme } from "react-native";

export type Theme = {
  dark: boolean;
  accent: string;
  onAccent: string;
  background: string;
  groupedBackground: string;
  card: string;
  text: string;
  secondaryText: string;
  separator: string;
  placeholder: string;
  danger: string;
  star: string;
  warningBackground: string;
  success: string;
};

const light: Theme = {
  dark: false,
  accent: "#F59E0B",
  onAccent: "#1C1917",
  background: "#FFFFFF",
  groupedBackground: "#F2F2F7",
  card: "#FFFFFF",
  text: "#111111",
  secondaryText: "#6B6B70",
  separator: "#D9D9DE",
  placeholder: "#E9E9EE",
  danger: "#D92D20",
  star: "#F59E0B",
  warningBackground: "#FDE7C4",
  success: "#16A34A",
};

const dark: Theme = {
  dark: true,
  accent: "#FBBF24",
  onAccent: "#1C1917",
  background: "#000000",
  groupedBackground: "#000000",
  card: "#1C1C1E",
  text: "#F5F5F7",
  secondaryText: "#A1A1A6",
  separator: "#38383A",
  placeholder: "#2C2C2E",
  danger: "#FF6B5E",
  star: "#FBBF24",
  warningBackground: "#5A3B0A",
  success: "#4ADE80",
};

export function useTheme(): Theme {
  return useColorScheme() === "dark" ? dark : light;
}

export const spacing = { xs: 4, s: 8, m: 12, l: 16, xl: 24 };
