import React from "react";
import { View, Text, Pressable, Modal, StyleSheet } from "react-native";
import { useTheme } from "../utils/useTheme";

interface PostTestDialogProps {
  visible: boolean;
  deckName: string;
  onTestResponse: (response: "great" | "good" | "okay" | "bad") => void;
  onClose: () => void;
}

export function PostTestDialog({
  visible,
  deckName,
  onTestResponse,
  onClose,
}: PostTestDialogProps) {
  const { isDark } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.dialogContainer, { backgroundColor: isDark ? "#1e293b" : "#ffffff" }]}>
          <Text style={[styles.title, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>
            How was your test?
          </Text>
          <Text style={[styles.deckName, { color: isDark ? "#94a3b8" : "#64748b" }]}>
            {deckName}
          </Text>

          <View style={styles.optionsRow}>
            <Pressable
              onPress={() => onTestResponse("great")}
              style={({ pressed }) => [styles.optionButton, pressed && styles.pressed]}
            >
              <View style={[styles.emojiCircle, { backgroundColor: isDark ? "rgba(16, 185, 129, 0.2)" : "#d1fae5" }]}>
                <Text style={styles.emoji}>😊</Text>
              </View>
              <Text style={[styles.optionLabel, { color: isDark ? "#f1f5f9" : "#374151" }]}>Great</Text>
            </Pressable>

            <Pressable
              onPress={() => onTestResponse("good")}
              style={({ pressed }) => [styles.optionButton, pressed && styles.pressed]}
            >
              <View style={[styles.emojiCircle, { backgroundColor: isDark ? "rgba(59, 130, 246, 0.2)" : "#dbeafe" }]}>
                <Text style={styles.emoji}>🙂</Text>
              </View>
              <Text style={[styles.optionLabel, { color: isDark ? "#f1f5f9" : "#374151" }]}>Good</Text>
            </Pressable>

            <Pressable
              onPress={() => onTestResponse("okay")}
              style={({ pressed }) => [styles.optionButton, pressed && styles.pressed]}
            >
              <View style={[styles.emojiCircle, { backgroundColor: isDark ? "rgba(251, 191, 36, 0.2)" : "#fef3c7" }]}>
                <Text style={styles.emoji}>😐</Text>
              </View>
              <Text style={[styles.optionLabel, { color: isDark ? "#f1f5f9" : "#374151" }]}>Okay</Text>
            </Pressable>

            <Pressable
              onPress={() => onTestResponse("bad")}
              style={({ pressed }) => [styles.optionButton, pressed && styles.pressed]}
            >
              <View style={[styles.emojiCircle, { backgroundColor: isDark ? "rgba(239, 68, 68, 0.2)" : "#fee2e2" }]}>
                <Text style={styles.emoji}>😞</Text>
              </View>
              <Text style={[styles.optionLabel, { color: isDark ? "#f1f5f9" : "#374151" }]}>Bad</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.skipButton,
              { backgroundColor: isDark ? "#0f172a" : "#f3f4f6" },
              pressed && styles.pressed
            ]}
          >
            <Text style={[styles.skipText, { color: isDark ? "#94a3b8" : "#374151" }]}>Skip</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

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
              Review these flashcards every 2 weeks to maintain your knowledge for finals. Each session takes about 20 minutes.
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
  deckName: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
  },
  deckNameSmall: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
  },
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  optionButton: {
    alignItems: "center",
  },
  pressed: {
    opacity: 0.7,
  },
  emojiCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emoji: {
    fontSize: 32,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  skipButton: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  skipText: {
    fontSize: 16,
    fontWeight: "600",
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
