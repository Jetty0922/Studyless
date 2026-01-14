import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../utils/useTheme";
import { Card } from "../components/ui";
import { useFlashcardStore } from "../state/flashcardStore";

type TabType = "how" | "science" | "tips" | "modes";

export default function LearnScreen() {
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>("how");
  const stats = useFlashcardStore((s) => s.stats);
  const flashcards = useFlashcardStore((s) => s.flashcards);

  const masteredCount = flashcards.filter(c => c.mastery === "MASTERED").length;
  const totalReviewed = stats.totalCardsReviewed || 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Learn</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Understand how your brain remembers
          </Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <View style={[styles.tabBackground, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TabButton 
              title="How It Works" 
              isActive={activeTab === "how"} 
              onPress={() => setActiveTab("how")}
              colors={colors}
            />
            <TabButton 
              title="The Science" 
              isActive={activeTab === "science"} 
              onPress={() => setActiveTab("science")}
              colors={colors}
            />
            <TabButton 
              title="Tips" 
              isActive={activeTab === "tips"} 
              onPress={() => setActiveTab("tips")}
              colors={colors}
            />
            <TabButton 
              title="Modes" 
              isActive={activeTab === "modes"} 
              onPress={() => setActiveTab("modes")}
              colors={colors}
            />
          </View>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {activeTab === "how" && <HowItWorksContent colors={colors} />}
            {activeTab === "science" && <ScienceContent colors={colors} isDark={isDark} />}
            {activeTab === "tips" && <TipsContent colors={colors} />}
            {activeTab === "modes" && <ModesContent colors={colors} isDark={isDark} />}
            <View style={{ height: 32 }} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function TabButton({ title, isActive, onPress, colors }: { 
  title: string; 
  isActive: boolean; 
  onPress: () => void;
  colors: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.tabButton,
        isActive && { backgroundColor: colors.primary },
      ]}
    >
      <Text style={[
        styles.tabButtonText,
        { color: isActive ? "#FFFFFF" : colors.textSecondary },
      ]}>
        {title}
      </Text>
    </Pressable>
  );
}

function HowItWorksContent({ colors }: { colors: any }) {
  const steps = [
    {
      icon: "camera-outline" as const,
      title: "1. Create Cards",
      description: "Take a photo of your notes or upload a PDF. Our AI extracts key concepts and creates flashcards automatically.",
    },
    {
      icon: "sparkles-outline" as const,
      title: "2. Smart Scheduling",
      description: "Each card is scheduled based on how well you know it. Cards you struggle with appear more often.",
    },
    {
      icon: "time-outline" as const,
      title: "3. Review at the Right Time",
      description: "We show you each card just before you'd forget it. This strengthens your memory with minimal effort.",
    },
    {
      icon: "trending-up-outline" as const,
      title: "4. Watch Progress Grow",
      description: "As you review, intervals between cards grow from days to weeks to months. Eventually, you'll remember forever.",
    },
  ];

  return (
    <View style={styles.sectionContainer}>
      {steps.map((step, index) => (
        <Card key={index} variant="outlined" style={styles.stepCard}>
          <View style={styles.stepContent}>
            <View style={[styles.stepIcon, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name={step.icon} size={24} color={colors.primary} />
            </View>
            <View style={styles.stepText}>
              <Text style={[styles.stepTitle, { color: colors.text }]}>{step.title}</Text>
              <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
                {step.description}
              </Text>
            </View>
          </View>
        </Card>
      ))}
    </View>
  );
}

function ScienceContent({ colors, isDark }: { colors: any; isDark: boolean }) {
  return (
    <View style={styles.sectionContainer}>
      {/* Forgetting Curve Section */}
      <Card variant="outlined" style={styles.scienceCard}>
        <Text style={[styles.scienceTitle, { color: colors.text }]}>The Forgetting Curve</Text>
        <Text style={[styles.scienceDescription, { color: colors.textSecondary }]}>
          In 1885, Hermann Ebbinghaus discovered that we forget information exponentially over time. 
          Without review, we forget about 70% of new information within 24 hours.
        </Text>
        
        {/* Simple Forgetting Curve Visualization */}
        <ForgettingCurveIllustration colors={colors} isDark={isDark} />
      </Card>

      {/* Spaced Repetition Section */}
      <Card variant="outlined" style={styles.scienceCard}>
        <Text style={[styles.scienceTitle, { color: colors.text }]}>Spaced Repetition</Text>
        <Text style={[styles.scienceDescription, { color: colors.textSecondary }]}>
          By reviewing information at strategic intervals, we can interrupt the forgetting curve. 
          Each review strengthens the memory and extends the time until the next review is needed.
        </Text>

        <View style={styles.intervalExample}>
          <Text style={[styles.intervalTitle, { color: colors.text }]}>Example Review Schedule:</Text>
          <View style={styles.intervalRow}>
            {["1 day", "3 days", "1 week", "2 weeks", "1 month", "3 months"].map((interval, i) => (
              <View key={i} style={[styles.intervalBadge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.intervalText, { color: colors.primary }]}>{interval}</Text>
              </View>
            ))}
          </View>
        </View>
      </Card>

      {/* Research Section */}
      <Card variant="outlined" style={styles.scienceCard}>
        <Text style={[styles.scienceTitle, { color: colors.text }]}>Proven by Research</Text>
        <View style={styles.statsList}>
          <StatItem 
            value="200%" 
            label="More efficient than traditional studying" 
            colors={colors}
          />
          <StatItem 
            value="90%" 
            label="Long-term retention rate with spaced repetition" 
            colors={colors}
          />
          <StatItem 
            value="10 min" 
            label="Average daily study time needed" 
            colors={colors}
          />
        </View>
      </Card>
    </View>
  );
}

function ForgettingCurveIllustration({ colors, isDark }: { colors: any; isDark: boolean }) {
  return (
    <View style={{ marginTop: 16, gap: 16 }}>
      {/* User's graph image */}
      <View style={{ position: "relative" }}>
        <Image 
          source={require("../../assets/forgetting-curve.jpeg")}
          style={{ 
            width: "100%", 
            height: 200, 
            borderRadius: 12,
          }}
          resizeMode="contain"
        />
        
        {/* Y-axis label overlay */}
        <View style={{ 
          position: "absolute", 
          left: 8, 
          top: "40%",
          transform: [{ rotate: "-90deg" }],
        }}>
          <Text style={{ color: "#9CA3AF", fontSize: 11, fontWeight: "500" }}>
            Memory
          </Text>
        </View>
      </View>
      
      {/* Legend below the graph */}
      <View style={{ gap: 10, paddingHorizontal: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ 
            width: 24, 
            height: 3, 
            backgroundColor: "#4ADE80",
            borderRadius: 2,
          }} />
          <Text style={{ color: colors.text, fontSize: 13, flex: 1 }}>With spaced repetition</Text>
          <Text style={{ color: "#4ADE80", fontSize: 13, fontWeight: "600" }}>Long-term retention</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ 
            width: 24, 
            height: 3, 
            backgroundColor: "#F87171",
            borderRadius: 2,
            borderStyle: "dashed",
          }} />
          <Text style={{ color: colors.text, fontSize: 13, flex: 1 }}>Without review</Text>
          <Text style={{ color: "#F87171", fontSize: 13, fontWeight: "600" }}>Rapid forgetting</Text>
        </View>
      </View>
      
      {/* Key insight */}
      <View style={{ 
        backgroundColor: isDark ? "rgba(74, 222, 128, 0.1)" : "rgba(74, 222, 128, 0.08)",
        borderRadius: 8,
        padding: 12,
        borderLeftWidth: 3,
        borderLeftColor: "#4ADE80",
      }}>
        <Text style={{ color: colors.text, fontSize: 13, lineHeight: 18 }}>
          Each review <Text style={{ fontWeight: "600", color: "#4ADE80" }}>resets your memory</Text> to 100% 
          and extends the time until the next review is needed.
        </Text>
      </View>
    </View>
  );
}

function StatItem({ value, label, colors }: { value: string; label: string; colors: any }) {
  return (
    <View style={styles.statItem}>
      <Text style={[styles.statValue, { color: colors.primary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function TipsContent({ colors }: { colors: any }) {
  const tips = [
    {
      icon: "sunny-outline" as const,
      title: "Study in the Morning",
      description: "Your brain consolidates memories during sleep. Review in the morning to reinforce what you learned.",
    },
    {
      icon: "timer-outline" as const,
      title: "Keep Sessions Short",
      description: "10-15 minutes of focused review is more effective than hour-long cramming sessions.",
    },
    {
      icon: "checkmark-circle-outline" as const,
      title: "Be Honest with Ratings",
      description: "Rate cards accurately. Overestimating what you know leads to weaker memories.",
    },
    {
      icon: "calendar-outline" as const,
      title: "Review Every Day",
      description: "Consistency beats intensity. A few cards daily is better than many cards occasionally.",
    },
    {
      icon: "create-outline" as const,
      title: "Create Your Own Cards",
      description: "Cards you create yourself are more memorable than pre-made ones.",
    },
    {
      icon: "bed-outline" as const,
      title: "Get Enough Sleep",
      description: "Memory consolidation happens during sleep. Aim for 7-9 hours for optimal learning.",
    },
  ];

  return (
    <View style={styles.sectionContainer}>
      {tips.map((tip, index) => (
        <Card key={index} variant="outlined" style={styles.tipCard}>
          <View style={styles.tipContent}>
            <Ionicons name={tip.icon} size={24} color={colors.primary} style={styles.tipIcon} />
            <View style={styles.tipText}>
              <Text style={[styles.tipTitle, { color: colors.text }]}>{tip.title}</Text>
              <Text style={[styles.tipDescription, { color: colors.textSecondary }]}>
                {tip.description}
              </Text>
            </View>
          </View>
        </Card>
      ))}
    </View>
  );
}

function ModesContent({ colors, isDark }: { colors: any; isDark: boolean }) {
  return (
    <View style={styles.sectionContainer}>
      {/* Test Prep Mode */}
      <Card variant="outlined" style={styles.scienceCard}>
        <View style={styles.modeHeader}>
          <View style={[styles.modeIcon, { backgroundColor: "#667eea" }]}>
            <Ionicons name="school" size={24} color="#ffffff" />
          </View>
          <Text style={[styles.scienceTitle, { color: colors.text, marginBottom: 0 }]}>Test Prep Mode</Text>
        </View>
        <Text style={[styles.modeSubtitle, { color: colors.textSecondary }]}>
          For exams, certifications, and interviews with a specific date.
        </Text>
        
        <Text style={[styles.modeDescription, { color: colors.text }]}>
          Set your test date and we schedule your reviews to maximize what you'll remember on exam day.
        </Text>

        <Text style={[styles.phaseHeader, { color: colors.text }]}>The 3-Phase System:</Text>
        
        <View style={styles.phaseList}>
          <View style={[styles.phaseItem, { backgroundColor: isDark ? "rgba(102, 126, 234, 0.1)" : "#eef2ff" }]}>
            <View style={[styles.phaseBadge, { backgroundColor: "#667eea" }]}>
              <Text style={styles.phaseBadgeText}>1</Text>
            </View>
            <View style={styles.phaseContent}>
              <Text style={[styles.phaseTitle, { color: colors.text }]}>Maintenance</Text>
              <Text style={[styles.phaseTime, { color: "#667eea" }]}>30+ days out</Text>
              <Text style={[styles.phaseDesc, { color: colors.textSecondary }]}>Relaxed schedule, build familiarity</Text>
            </View>
          </View>

          <View style={[styles.phaseItem, { backgroundColor: isDark ? "rgba(139, 92, 246, 0.1)" : "#ede9fe" }]}>
            <View style={[styles.phaseBadge, { backgroundColor: "#8b5cf6" }]}>
              <Text style={styles.phaseBadgeText}>2</Text>
            </View>
            <View style={styles.phaseContent}>
              <Text style={[styles.phaseTitle, { color: colors.text }]}>Consolidation</Text>
              <Text style={[styles.phaseTime, { color: "#8b5cf6" }]}>7-30 days out</Text>
              <Text style={[styles.phaseDesc, { color: colors.textSecondary }]}>Intervals shorten, strengthen memory</Text>
            </View>
          </View>

          <View style={[styles.phaseItem, { backgroundColor: isDark ? "rgba(239, 68, 68, 0.1)" : "#fef2f2" }]}>
            <View style={[styles.phaseBadge, { backgroundColor: "#ef4444" }]}>
              <Text style={styles.phaseBadgeText}>3</Text>
            </View>
            <View style={styles.phaseContent}>
              <Text style={[styles.phaseTitle, { color: colors.text }]}>Cram</Text>
              <Text style={[styles.phaseTime, { color: "#ef4444" }]}>Final week</Text>
              <Text style={[styles.phaseDesc, { color: colors.textSecondary }]}>Intensive review, weakest cards first</Text>
            </View>
          </View>
        </View>
      </Card>

      {/* Long Term Mode */}
      <Card variant="outlined" style={styles.scienceCard}>
        <View style={styles.modeHeader}>
          <View style={[styles.modeIcon, { backgroundColor: "#10b981" }]}>
            <Ionicons name="repeat" size={24} color="#ffffff" />
          </View>
          <Text style={[styles.scienceTitle, { color: colors.text, marginBottom: 0 }]}>Long Term Mode</Text>
        </View>
        <Text style={[styles.modeSubtitle, { color: colors.textSecondary }]}>
          For languages, professional knowledge, and lifelong learning.
        </Text>

        <View style={[styles.fsrsBadge, { backgroundColor: isDark ? "rgba(16, 185, 129, 0.15)" : "#d1fae5" }]}>
          <Text style={[styles.fsrsText, { color: "#10b981" }]}>
            Powered by FSRS — the same algorithm used by Anki
          </Text>
        </View>

        <Text style={[styles.modeDescription, { color: colors.text }]}>
          Your brain forgets things over time in a predictable way. We schedule reviews right before you'd forget, so you remember more with less effort.
        </Text>

        <View style={styles.featureList}>
          <View style={styles.featureRow}>
            <Ionicons name="add-circle" size={20} color="#10b981" />
            <Text style={[styles.featureText, { color: colors.text }]}>
              <Text style={{ fontWeight: "600" }}>New cards</Text> start with short intervals (1-4 days)
            </Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
            <Text style={[styles.featureText, { color: colors.text }]}>
              <Text style={{ fontWeight: "600" }}>Easy cards</Text> grow to weeks, then months
            </Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="close-circle" size={20} color="#ef4444" />
            <Text style={[styles.featureText, { color: colors.text }]}>
              <Text style={{ fontWeight: "600" }}>Hard cards</Text> stay at shorter intervals
            </Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="analytics" size={20} color="#8b5cf6" />
            <Text style={[styles.featureText, { color: colors.text }]}>
              <Text style={{ fontWeight: "600" }}>Each card adapts</Text> — we track what's hard for you
            </Text>
          </View>
        </View>

        <View style={[styles.resultBox, { backgroundColor: isDark ? "rgba(16, 185, 129, 0.1)" : "#d1fae5" }]}>
          <Text style={[styles.resultText, { color: colors.text }]}>
            <Text style={{ fontWeight: "700", color: "#10b981" }}>Result:</Text> ~90% retention with minimum reviews
          </Text>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    marginTop: 4,
  },
  tabContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  tabBackground: {
    flexDirection: "row",
    borderRadius: 8,
    padding: 4,
    borderWidth: 1,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },
  sectionContainer: {
    gap: 12,
  },
  stepCard: {
    marginBottom: 0,
  },
  stepContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  stepIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  stepText: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  scienceCard: {
    marginBottom: 0,
  },
  scienceTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  scienceDescription: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
  },
  intervalExample: {
    marginTop: 8,
  },
  intervalTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 10,
  },
  intervalRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  intervalBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  intervalText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statsList: {
    gap: 16,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 14,
    flex: 1,
  },
  tipCard: {
    marginBottom: 0,
  },
  tipContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  tipIcon: {
    marginRight: 14,
    marginTop: 2,
  },
  tipText: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  tipDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  // Modes tab styles
  modeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 12,
  },
  modeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modeSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  modeDescription: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
  },
  phaseHeader: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 12,
  },
  phaseList: {
    gap: 10,
  },
  phaseItem: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 10,
    alignItems: "flex-start",
    gap: 12,
  },
  phaseBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  phaseBadgeText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  phaseContent: {
    flex: 1,
  },
  phaseTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  phaseTime: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  phaseDesc: {
    fontSize: 13,
    marginTop: 4,
  },
  fsrsBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
  },
  fsrsText: {
    fontSize: 13,
    fontWeight: "600",
  },
  featureList: {
    gap: 12,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  resultBox: {
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  resultText: {
    fontSize: 14,
    lineHeight: 20,
  },
});

