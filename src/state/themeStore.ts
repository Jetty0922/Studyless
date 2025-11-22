import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Theme = "light" | "dark";

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "dark", // Default to dark mode
      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === "light" ? "dark" : "light",
        })),
      setTheme: (theme: Theme) => set({ theme }),
    }),
    {
      name: "theme-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Theme colors
export const colors = {
  light: {
    background: "#f9fafb",
    surface: "#ffffff",
    text: "#111827",
    textSecondary: "#6b7280",
    border: "#e5e7eb",
    primary: "#3b82f6",
    primaryLight: "#dbeafe",
    success: "#10b981",
    successLight: "#d1fae5",
    warning: "#f59e0b",
    warningLight: "#fef3c7",
    error: "#ef4444",
    errorLight: "#fee2e2",
    purple: "#8b5cf6",
    purpleLight: "#ede9fe",
    orange: "#f97316",
    orangeLight: "#ffedd5",
    green: "#10b981",
    greenLight: "#d1fae5",
    blue: "#3b82f6",
    blueLight: "#dbeafe",
    card: "#ffffff",
  },
  dark: {
    background: "#0f172a",
    surface: "#1e293b",
    text: "#f1f5f9",
    textSecondary: "#94a3b8",
    border: "#334155",
    primary: "#60a5fa",
    primaryLight: "#1e3a8a",
    success: "#34d399",
    successLight: "#064e3b",
    warning: "#fbbf24",
    warningLight: "#78350f",
    error: "#f87171",
    errorLight: "#7f1d1d",
    purple: "#a78bfa",
    purpleLight: "#4c1d95",
    orange: "#fb923c",
    orangeLight: "#7c2d12",
    green: "#34d399",
    greenLight: "#064e3b",
    blue: "#60a5fa",
    blueLight: "#1e3a8a",
    card: "#1e293b",
  },
};

export const getThemedColors = (theme: Theme) => colors[theme];
