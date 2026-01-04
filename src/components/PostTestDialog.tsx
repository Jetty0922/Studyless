import React from "react";
import { View, Text, Pressable, Modal, StyleSheet } from "react-native";
import { useTheme } from "../utils/useTheme";

interface LongTermDialogProps {
  visible: boolean;
  deckName: string;
  onYes: () => void;
  onNo: () => void;
}

export function LongTermDialog({
  visible,
  deckName,
  onYes,
  onNo,
}: LongTermDialogProps) {
  const { isDark } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onNo}
    >
      <View style={styles.overlay}>
        <View style={[styles.dialogContainer, { backgroundColor: isDark ? "#1e293b" : "#ffffff" }]}>
          <Text style={[styles.title, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>
            Keep reviewing for finals?
          </Text>

          <View style={[styles.infoBox, { backgroundColor: isDark ? "rgba(59, 130, 246, 0.15)" : "#eff6ff" }]}>
            <Text style={[styles.infoText, { color: isDark ? "#94a3b8" : "#374151" }]}>
              Review these flashcards periodically to maintain your knowledge for finals. Intervals adjust based on how well you remember.
            </Text>
          </View>

          <Text style={[styles.deckNameSmall, { color: isDark ? "#64748b" : "#6b7280" }]}>
            {deckName}
          </Text>

          <View style={styles.buttonContainer}>
            <Pressable
              onPress={onYes}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            >
              <Text style={styles.primaryButtonText}>Yes, Keep Reviewing</Text>
            </Pressable>

            <Pressable
              onPress={onNo}
              style={({ pressed }) => [
                styles.secondaryButton,
                { backgroundColor: isDark ? "#0f172a" : "#f3f4f6" },
                pressed && styles.pressed
              ]}
            >
              <Text style={[styles.secondaryButtonText, { color: isDark ? "#f1f5f9" : "#374151" }]}>
                No, Archive Chapter
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  dialogContainer: {
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 340,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  deckNameSmall: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
  },
  pressed: {
    opacity: 0.7,
  },
  infoBox: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 22,
  },
  buttonContainer: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: "#667eea",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600",
  },
  secondaryButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: "600",
  },
});
