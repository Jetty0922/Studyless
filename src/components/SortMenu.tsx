import React from "react";
import { View, Text, Pressable, Modal } from "react-native";
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
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 bg-black/50 justify-end"
        onPress={onClose}
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View className="rounded-t-3xl p-6" style={{ backgroundColor: colors.surface }}>
            <Text className="text-xl font-bold mb-4" style={{ color: colors.text }}>{title}</Text>

            <View className="gap-2">
              {options.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    onSelect(option.value);
                    onClose();
                  }}
                  className="flex-row items-center justify-between py-3 px-4 rounded-xl active:opacity-70"
                  style={{ backgroundColor: selectedValue === option.value ? colors.primaryLight : "transparent" }}
                >
                  <Text
                    className="text-base"
                    style={{
                      color: selectedValue === option.value ? colors.primary : colors.text,
                      fontWeight: selectedValue === option.value ? "bold" : "normal"
                    }}
                  >
                    {option.label}
                  </Text>
                  {selectedValue === option.value && (
                    <Ionicons name="checkmark" size={24} color={colors.primary} />
                  )}
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={onClose}
              className="mt-4 rounded-xl py-4 items-center active:opacity-70"
              style={{ backgroundColor: colors.border }}
            >
              <Text className="font-semibold text-base" style={{ color: colors.textSecondary }}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
