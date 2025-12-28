import React from "react";
import { View, StyleSheet, ViewStyle, Pressable } from "react-native";
import { useTheme } from "../../utils/useTheme";

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
  onPress?: () => void;
  variant?: "elevated" | "outlined" | "filled";
}

export default function Card({
  children,
  style,
  padding = 16,
  onPress,
  variant = "elevated",
}: CardProps) {
  const { colors, isDark } = useTheme();

  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case "elevated":
        return {
          backgroundColor: colors.card,
          borderWidth: 0,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: isDark ? 0.3 : 0.08,
          shadowRadius: 4,
          elevation: 2,
        };
      case "outlined":
        return {
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
        };
      case "filled":
        return {
          backgroundColor: colors.surface,
          borderWidth: 0,
        };
      default:
        return {
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
        };
    }
  };

  const cardContent = (
    <View
      style={[
        styles.container,
        getVariantStyles(),
        { padding },
        style,
      ]}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
        {cardContent}
      </Pressable>
    );
  }

  return cardContent;
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: "hidden",
  },
});

