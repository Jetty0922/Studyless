import React from "react";
import { View, Text, Pressable, Modal, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../utils/useTheme";

interface SortOption {
  value: string;
  label: string;
}

interface SortMenuProps {
  visible: boolean;
  onClose: () => void;
  options: SortOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  title?: string;
}

export function SortMenu({
  visible,
  onClose,
  options,
  selectedValue,
  onSelect,
  title = "Sort by"
}: SortMenuProps) {
  const { colors, isDark } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View style={[styles.menuContainer, { backgroundColor: colors.surface }]}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

            <View style={styles.optionsContainer}>
              {options.map((option) => {
                const isSelected = selectedValue === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      onSelect(option.value);
                      onClose();
                    }}
                    style={({ pressed }) => [
                      styles.optionButton,
                      { backgroundColor: isSelected ? colors.primaryLight : "transparent" },
                      pressed && styles.pressed
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        {
                          color: isSelected ? colors.primary : colors.text,
                          fontWeight: isSelected ? "700" : "400"
                        }
                      ]}
                    >
                      {option.label}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={24} color={colors.primary} />
                    )}
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.cancelButton,
                { backgroundColor: isDark ? "#0f172a" : colors.border },
                pressed && styles.pressed
              ]}
            >
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  menuContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },
  optionsContainer: {
    gap: 8,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  pressed: {
    opacity: 0.7,
  },
  optionText: {
    fontSize: 16,
  },
  cancelButton: {
    marginTop: 16,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
