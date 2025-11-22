import { useThemeStore, getThemedColors } from "../state/themeStore";

export const useTheme = () => {
  const theme = useThemeStore((s) => s.theme);
  const colors = getThemedColors(theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  return {
    theme,
    colors,
    toggleTheme,
    isDark: theme === "dark",
  };
};
