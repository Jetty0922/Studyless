import React from "react";
import { Pressable, Text, View, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from "react-native";
import { useTheme } from "../../utils/useTheme";

interface ButtonProps {
  onPress: () => void;
  title: string;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "small" | "medium" | "large";
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export default function Button({
  onPress,
  title,
  disabled = false,
  loading = false,
  variant = "primary",
  size = "large",
  style,
  textStyle,
  icon,
  fullWidth = true,
}: ButtonProps) {
  const { colors, isDark } = useTheme();

  const sizeStyles = {
    small: { paddingVertical: 10, paddingHorizontal: 16 },
    medium: { paddingVertical: 12, paddingHorizontal: 20 },
    large: { paddingVertical: 14, paddingHorizontal: 24 },
  };

  const textSizes = {
    small: 14,
    medium: 15,
    large: 16,
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "primary":
        return {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
          textColor: "#FFFFFF",
        };
      case "secondary":
        return {
          backgroundColor: "transparent",
          borderColor: colors.border,
          textColor: colors.text,
        };
      case "ghost":
        return {
          backgroundColor: "transparent",
          borderColor: "transparent",
          textColor: colors.primary,
        };
      case "danger":
        return {
          backgroundColor: colors.error,
          borderColor: colors.error,
          textColor: "#FFFFFF",
        };
      default:
        return {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
          textColor: "#FFFFFF",
        };
    }
  };

  const variantStyles = getVariantStyles();
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.container,
        sizeStyles[size],
        {
          backgroundColor: variantStyles.backgroundColor,
          borderColor: variantStyles.borderColor,
          opacity: isDisabled ? 0.5 : pressed ? 0.8 : 1,
          width: fullWidth ? "100%" : undefined,
        },
        variant === "secondary" && { borderWidth: 1 },
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={variantStyles.textColor} />
        ) : (
          <>
            {icon && <View style={styles.iconContainer}>{icon}</View>}
            <Text
              style={[
                styles.text,
                { fontSize: textSizes[size], color: variantStyles.textColor },
                textStyle,
              ]}
            >
              {title}
            </Text>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
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
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});

