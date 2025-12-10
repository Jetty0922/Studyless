import React from "react";
import { Pressable, Text, View, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface GradientButtonProps {
  onPress: () => void;
  title: string;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "accent";
  size?: "small" | "medium" | "large";
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

const gradients = {
  primary: ["#667eea", "#764ba2"] as const,
  secondary: ["#f093fb", "#f5576c"] as const,
  accent: ["#4facfe", "#00f2fe"] as const,
};

export default function GradientButton({
  onPress,
  title,
  disabled = false,
  variant = "primary",
  size = "large",
  style,
  textStyle,
  icon,
}: GradientButtonProps) {
  const sizeStyles = {
    small: { paddingVertical: 12, paddingHorizontal: 20 },
    medium: { paddingVertical: 16, paddingHorizontal: 28 },
    large: { paddingVertical: 18, paddingHorizontal: 32 },
  };

  const textSizes = {
    small: 14,
    medium: 16,
    large: 18,
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.container,
        style,
        { opacity: disabled ? 0.5 : pressed ? 0.9 : 1 },
        pressed && styles.pressed,
      ]}
    >
      <LinearGradient
        colors={gradients[variant]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, sizeStyles[size]]}
      >
        <View style={styles.content}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text
            style={[
              styles.text,
              { fontSize: textSizes[size] },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 28,
    overflow: "hidden",
    // Shadow for iOS
    shadowColor: "#667eea",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    // Elevation for Android
    elevation: 6,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  gradient: {
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    marginRight: 8,
  },
  text: {
    color: "#ffffff",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});




