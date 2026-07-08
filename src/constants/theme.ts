import { Platform } from "react-native";

export const palette = {
  background: "#FFF8F1",
  surface: "#FFFFFF",
  surfaceMuted: "#F5EDE3",
  border: "#E7D8C8",
  text: "#2C211B",
  textMuted: "#76655A",
  accent: "#E07A5F",
  accentStrong: "#C75D40",
  accentSoft: "#F5D4C8",
  success: "#3D8C55",
  successSoft: "#D9F0DF",
  warning: "#D9A441",
  warningSoft: "#F8E8C7",
  danger: "#C55A5A",
  dangerSoft: "#F8D8D8",
  info: "#4A7B8C",
  infoSoft: "#D7EAF1",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  pill: 999,
} as const;

export const typography = {
  title: 25,
  section: 18,
  body: 13,
  caption: 10,
} as const;

export const shadow = Platform.select({
  ios: {
    shadowColor: "#5B463A",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 6,
    },
  },
  android: {
    elevation: 3,
  },
  default: {},
});
