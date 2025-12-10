import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../utils/useTheme";

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
  borderRadius?: number;
}

export default function GlassCard({
  children,
  style,
  padding = 20,
  borderRadius = 24,
}: GlassCardProps) {
  const { isDark } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          borderRadius,
          borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
        },
        style,
      ]}
    >
      <LinearGradient
        colors={
          isDark
            ? ["rgba(30, 41, 59, 0.8)", "rgba(30, 41, 59, 0.6)"]
            : ["rgba(255, 255, 255, 0.9)", "rgba(255, 255, 255, 0.7)"]
        }
        style={[StyleSheet.absoluteFillObject, { borderRadius }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        pointerEvents="none"
      />
      <View style={{ padding }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    borderWidth: 1,
    // Shadow for depth
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
});
