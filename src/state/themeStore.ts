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
      theme: "light", // Default to light mode for professional look
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

// Professional color palette - no gradients
export const colors = {
  light: {
    // Core
    background: "#FFFFFF",
    surface: "#F9FAFB",
    card: "#FFFFFF",
    
    // Text
    text: "#111827",
    textSecondary: "#6B7280",
    
    // Borders
    border: "#E5E7EB",
    borderLight: "#F3F4F6",
    
    // Primary - Professional Blue
    primary: "#2563EB",
    primaryLight: "#DBEAFE",
    primaryDark: "#1D4ED8",
    
    // Semantic colors
    success: "#059669",
    successLight: "#D1FAE5",
    warning: "#D97706",
    warningLight: "#FEF3C7",
    error: "#DC2626",
    errorLight: "#FEE2E2",
    
    // Additional accents (muted)
    purple: "#7C3AED",
    purpleLight: "#EDE9FE",
    orange: "#EA580C",
    orangeLight: "#FFEDD5",
    green: "#059669",
    greenLight: "#D1FAE5",
    blue: "#2563EB",
    blueLight: "#DBEAFE",
  },
  dark: {
    // Core
    background: "#111827",
    surface: "#1F2937",
    card: "#1F2937",
    
    // Text
    text: "#F9FAFB",
    textSecondary: "#9CA3AF",
    
    // Borders
    border: "#374151",
    borderLight: "#4B5563",
    
    // Primary - Brighter blue for dark mode
    primary: "#3B82F6",
    primaryLight: "#1E3A8A",
    primaryDark: "#2563EB",
    
    // Semantic colors
    success: "#10B981",
    successLight: "#064E3B",
    warning: "#F59E0B",
    warningLight: "#78350F",
    error: "#EF4444",
    errorLight: "#7F1D1D",
    
    // Additional accents
    purple: "#A78BFA",
    purpleLight: "#4C1D95",
    orange: "#FB923C",
    orangeLight: "#7C2D12",
    green: "#10B981",
    greenLight: "#064E3B",
    blue: "#3B82F6",
    blueLight: "#1E3A8A",
  },
};

export const getThemedColors = (theme: Theme) => colors[theme];

// Spacing scale for consistent layout
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Border radius - professional, not playful
export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
};
