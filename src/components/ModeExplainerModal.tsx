import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, Modal, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../utils/useTheme";

interface ModeExplainerModalProps {
  visible: boolean;
  onClose: () => void;
  initialMode?: "testPrep" | "longTerm";
}

export default function ModeExplainerModal({
  visible,
  onClose,
  initialMode = "testPrep",
}: ModeExplainerModalProps) {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<"testPrep" | "longTerm">(initialMode);

  React.useEffect(() => {
    if (visible) {
      setActiveTab(initialMode);
    }
  }, [visible, initialMode]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: isDark ? "#1e293b" : "#ffffff" }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: isDark ? "#334155" : "#e2e8f0" }]}>
          <Text style={[styles.headerTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>
            How It Works
          </Text>
          <Pressable onPress={onClose} style={styles.closeButton} hitSlop={12}>
            <Ionicons name="close" size={24} color={isDark ? "#94a3b8" : "#64748b"} />
          </Pressable>
        </View>

        {/* Tab Switcher */}
        <View style={[styles.tabContainer, { backgroundColor: isDark ? "#0f172a" : "#f1f5f9" }]}>
          <Pressable
            onPress={() => setActiveTab("testPrep")}
            style={[
              styles.tab,
              activeTab === "testPrep" && styles.activeTab,
              activeTab === "testPrep" && { backgroundColor: isDark ? "#1e293b" : "#ffffff" },
            ]}
          >
            <Ionicons
              name="school"
              size={18}
              color={activeTab === "testPrep" ? "#667eea" : (isDark ? "#64748b" : "#94a3b8")}
            />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === "testPrep" ? "#667eea" : (isDark ? "#64748b" : "#94a3b8") },
              ]}
            >
              Test Prep
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab("longTerm")}
            style={[
              styles.tab,
              activeTab === "longTerm" && styles.activeTab,
              activeTab === "longTerm" && { backgroundColor: isDark ? "#1e293b" : "#ffffff" },
            ]}
          >
            <Ionicons
              name="repeat"
              size={18}
              color={activeTab === "longTerm" ? "#10b981" : (isDark ? "#64748b" : "#94a3b8")}
            />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === "longTerm" ? "#10b981" : (isDark ? "#64748b" : "#94a3b8") },
              ]}
            >
              Long Term
            </Text>
          </Pressable>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === "testPrep" ? (
            <TestPrepContent isDark={isDark} />
          ) : (
            <LongTermContent isDark={isDark} />
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function TestPrepContent({ isDark }: { isDark: boolean }) {
  return (
    <View>
      <Text style={[styles.introText, { color: isDark ? "#94a3b8" : "#64748b" }]}>
        Set your test date, and we schedule your reviews to maximize what you'll remember on exam day.
      </Text>

      <Text style={[styles.sectionTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>
        The 3-Phase System
      </Text>

      {/* Phase 1 */}
      <View style={[styles.phaseCard, { backgroundColor: isDark ? "rgba(102, 126, 234, 0.1)" : "#eef2ff" }]}>
        <View style={styles.phaseHeader}>
          <View style={[styles.phaseBadge, { backgroundColor: "#667eea" }]}>
            <Text style={styles.phaseBadgeText}>1</Text>
          </View>
          <View style={styles.phaseHeaderText}>
            <Text style={[styles.phaseTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>
              Maintenance
            </Text>
            <Text style={[styles.phaseTime, { color: "#667eea" }]}>30+ days out</Text>
          </View>
        </View>
        <Text style={[styles.phaseDesc, { color: isDark ? "#94a3b8" : "#64748b" }]}>
          Relaxed schedule with longer intervals. Focus on getting familiar with all the material.
        </Text>
      </View>

      {/* Phase 2 */}
      <View style={[styles.phaseCard, { backgroundColor: isDark ? "rgba(139, 92, 246, 0.1)" : "#ede9fe" }]}>
        <View style={styles.phaseHeader}>
          <View style={[styles.phaseBadge, { backgroundColor: "#8b5cf6" }]}>
            <Text style={styles.phaseBadgeText}>2</Text>
          </View>
          <View style={styles.phaseHeaderText}>
            <Text style={[styles.phaseTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>
              Consolidation
            </Text>
            <Text style={[styles.phaseTime, { color: "#8b5cf6" }]}>7-30 days out</Text>
          </View>
        </View>
        <Text style={[styles.phaseDesc, { color: isDark ? "#94a3b8" : "#64748b" }]}>
          Intervals gradually shorten as your test approaches. Weak cards get extra attention to build memory strength.
        </Text>
      </View>

      {/* Phase 3 */}
      <View style={[styles.phaseCard, { backgroundColor: isDark ? "rgba(239, 68, 68, 0.1)" : "#fef2f2" }]}>
        <View style={styles.phaseHeader}>
          <View style={[styles.phaseBadge, { backgroundColor: "#ef4444" }]}>
            <Text style={styles.phaseBadgeText}>3</Text>
          </View>
          <View style={styles.phaseHeaderText}>
            <Text style={[styles.phaseTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>
              Cram
            </Text>
            <Text style={[styles.phaseTime, { color: "#ef4444" }]}>Final week</Text>
          </View>
        </View>
        <Text style={[styles.phaseDesc, { color: isDark ? "#94a3b8" : "#64748b" }]}>
          Intensive daily reviews. Cards prioritized by what you're most likely to forget on test day.
        </Text>
      </View>

      {/* Exam Day */}
      <View style={[styles.infoBox, { backgroundColor: isDark ? "rgba(245, 158, 11, 0.1)" : "#fffbeb", borderColor: isDark ? "rgba(245, 158, 11, 0.3)" : "#fcd34d" }]}>
        <Ionicons name="today" size={20} color="#f59e0b" />
        <View style={styles.infoBoxContent}>
          <Text style={[styles.infoBoxTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>
            On Exam Day
          </Text>
          <Text style={[styles.infoBoxDesc, { color: isDark ? "#94a3b8" : "#64748b" }]}>
            Only shows cards you're struggling with for a quick final review.
          </Text>
        </View>
      </View>

      {/* After Test */}
      <Text style={[styles.footerText, { color: isDark ? "#64748b" : "#94a3b8" }]}>
        After your test, convert the deck to Long Term mode to keep learning, or archive it.
      </Text>
    </View>
  );
}

function LongTermContent({ isDark }: { isDark: boolean }) {
  return (
    <View>
      <Text style={[styles.introText, { color: isDark ? "#94a3b8" : "#64748b" }]}>
        Powered by <Text style={{ fontWeight: "600", color: "#10b981" }}>FSRS</Text> (Free Spaced Repetition Scheduler) — the same algorithm used by Anki and backed by memory research.
      </Text>

      <Text style={[styles.sectionTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>
        The Core Idea
      </Text>

      <View style={[styles.coreIdeaBox, { backgroundColor: isDark ? "rgba(16, 185, 129, 0.1)" : "#d1fae5" }]}>
        <Ionicons name="bulb" size={24} color="#10b981" />
        <Text style={[styles.coreIdeaText, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>
          Your brain forgets things over time in a predictable way. We schedule reviews right before you'd forget, so you remember more with less effort.
        </Text>
      </View>

      <Text style={[styles.sectionTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>
        How It Works
      </Text>

      {/* New Cards */}
      <View style={styles.featureRow}>
        <View style={[styles.featureIcon, { backgroundColor: isDark ? "rgba(16, 185, 129, 0.2)" : "#d1fae5" }]}>
          <Ionicons name="add-circle" size={20} color="#10b981" />
        </View>
        <View style={styles.featureContent}>
          <Text style={[styles.featureTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>
            New Cards
          </Text>
          <Text style={[styles.featureDesc, { color: isDark ? "#94a3b8" : "#64748b" }]}>
            Start with short intervals (1-4 days)
          </Text>
        </View>
      </View>

      {/* Easy Cards */}
      <View style={styles.featureRow}>
        <View style={[styles.featureIcon, { backgroundColor: isDark ? "rgba(34, 197, 94, 0.2)" : "#dcfce7" }]}>
          <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
        </View>
        <View style={styles.featureContent}>
          <Text style={[styles.featureTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>
            Easy Cards
          </Text>
          <Text style={[styles.featureDesc, { color: isDark ? "#94a3b8" : "#64748b" }]}>
            Intervals grow longer (weeks → months)
          </Text>
        </View>
      </View>

      {/* Hard Cards */}
      <View style={styles.featureRow}>
        <View style={[styles.featureIcon, { backgroundColor: isDark ? "rgba(239, 68, 68, 0.2)" : "#fee2e2" }]}>
          <Ionicons name="close-circle" size={20} color="#ef4444" />
        </View>
        <View style={styles.featureContent}>
          <Text style={[styles.featureTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>
            Hard Cards
          </Text>
          <Text style={[styles.featureDesc, { color: isDark ? "#94a3b8" : "#64748b" }]}>
            Stay at shorter intervals until you master them
          </Text>
        </View>
      </View>

      {/* Adaptive */}
      <View style={styles.featureRow}>
        <View style={[styles.featureIcon, { backgroundColor: isDark ? "rgba(139, 92, 246, 0.2)" : "#ede9fe" }]}>
          <Ionicons name="analytics" size={20} color="#8b5cf6" />
        </View>
        <View style={styles.featureContent}>
          <Text style={[styles.featureTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>
            Each Card Adapts
          </Text>
          <Text style={[styles.featureDesc, { color: isDark ? "#94a3b8" : "#64748b" }]}>
            The app tracks what's difficult for you
          </Text>
        </View>
      </View>

      {/* Result */}
      <View style={[styles.resultBox, { backgroundColor: isDark ? "rgba(16, 185, 129, 0.15)" : "#d1fae5", borderColor: isDark ? "rgba(16, 185, 129, 0.3)" : "#6ee7b7" }]}>
        <Text style={[styles.resultTitle, { color: "#10b981" }]}>
          The Result
        </Text>
        <Text style={[styles.resultText, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>
          ~90% retention with the minimum number of reviews. You spend time only on cards that need it.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  closeButton: {
    position: "absolute",
    right: 16,
    padding: 4,
  },
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  activeTab: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  introText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 16,
  },
  phaseCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  phaseHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  phaseBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  phaseBadgeText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  phaseHeaderText: {
    flex: 1,
  },
  phaseTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  phaseTime: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },
  phaseDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  infoBox: {
    flexDirection: "row",
    padding: 14,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    gap: 12,
    alignItems: "flex-start",
  },
  infoBoxContent: {
    flex: 1,
  },
  infoBoxTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  infoBoxDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  footerText: {
    fontSize: 13,
    textAlign: "center",
    fontStyle: "italic",
  },
  coreIdeaBox: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
    alignItems: "flex-start",
  },
  coreIdeaText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 14,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 13,
  },
  resultBox: {
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6,
  },
  resultText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
