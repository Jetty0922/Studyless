import React, { useState } from "react";
import { View, TextInput, StyleSheet, Pressable, TextInputProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../utils/useTheme";

interface GradientInputProps extends Omit<TextInputProps, "style"> {
  icon?: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
  error?: boolean;
}

export default function GradientInput({
  icon,
  isPassword = false,
  error = false,
  ...props
}: GradientInputProps) {
  const { colors, isDark } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? colors.surface : "#f8fafc",
          borderColor: error
            ? colors.error
            : isFocused
            ? "#667eea"
            : isDark
            ? colors.border
            : "#e2e8f0",
          borderWidth: isFocused ? 2 : 1.5,
        },
      ]}
    >
      {icon && (
        <View style={styles.iconContainer}>
          <Ionicons
            name={icon}
            size={20}
            color={isFocused ? "#667eea" : colors.textSecondary}
          />
        </View>
      )}
      <TextInput
        {...props}
        style={[
          styles.input,
          {
            color: colors.text,
            paddingLeft: icon ? 0 : 16,
          },
        ]}
        placeholderTextColor={colors.textSecondary}
        secureTextEntry={isPassword && !showPassword}
        onFocus={(e) => {
          setIsFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          props.onBlur?.(e);
        }}
      />
      {isPassword && (
        <Pressable
          onPress={() => setShowPassword(!showPassword)}
          style={styles.eyeButton}
        >
          <Ionicons
            name={showPassword ? "eye-off-outline" : "eye-outline"}
            size={20}
            color={colors.textSecondary}
          />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    minHeight: 56,
  },
  iconContainer: {
    paddingLeft: 16,
    paddingRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 16,
    paddingRight: 16,
  },
  eyeButton: {
    padding: 12,
    paddingRight: 16,
  },
});




