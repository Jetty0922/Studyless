import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFlashcardStore } from "../state/flashcardStore";
import { useTheme } from "../utils/useTheme";
import { GlassCard } from "../components/ui";

export default function StatsScreen() {
  const { isDark } = useTheme();
  const stats = useFlashcardStore((s) => s.stats);
  const flashcards = useFlashcardStore((s) => s.flashcards);

  const totalCards = flashcards.length;
  const masteredCards = flashcards.filter((card) => {
    const step = card.currentStep ?? 0;
    return step >= 3;
  }).length;
  const progressPercentage = totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0;

  const dailyProgress = stats.dailyGoal > 0
    ? Math.min(100, Math.round((stats.cardsReviewedToday / stats.dailyGoal) * 100))
    : 0;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={isDark ? ["#0f172a", "#1e1b4b"] : ["#f8fafc", "#eef2ff"]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={[styles.floatingShape, styles.shape1, { backgroundColor: isDark ? "#667eea" : "#a5b4fc" }]} />
      <View style={[styles.floatingShape, styles.shape2, { backgroundColor: isDark ? "#f093fb" : "#c4b5fd" }]} />

      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Statistics</Text>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {/* Streak Card */}
            <GlassCard style={styles.card}>
              <LinearGradient
                colors={["#667eea", "#764ba2"]}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                pointerEvents="none"
              />
              <View style={styles.streakHeader}>
                <Text style={styles.streakLabel}>Current Streak</Text>
                <Ionicons name="flame" size={28} color="#fbbf24" />
              </View>
              <Text style={styles.streakValue}>{stats.currentStreak}</Text>
              <Text style={styles.streakSubtext}>
                {stats.currentStreak === 1 ? "day" : "days"} in a row
              </Text>
              <View style={styles.streakDivider} />
              <Text style={styles.longestStreak}>
                Longest streak: {stats.longestStreak} {stats.longestStreak === 1 ? "day" : "days"}
              </Text>
            </GlassCard>

            {/* Daily Goal Card */}
            <GlassCard style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Daily Goal</Text>
                <View style={styles.goalProgress}>
                  <Text style={styles.goalText}>{stats.cardsReviewedToday}/{stats.dailyGoal}</Text>
                  <Ionicons name="checkmark-circle" size={24} color={dailyProgress >= 100 ? "#10b981" : (isDark ? "#475569" : "#d1d5db")} />
                </View>
              </View>
              <View style={[styles.progressBar, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)" }]}>
                <View style={[styles.progressFill, { width: `${dailyProgress}%`, backgroundColor: "#667eea" }]} />
              </View>
              <Text style={[styles.progressText, { color: isDark ? "#64748b" : "#94a3b8" }]}>
                {dailyProgress}% complete
              </Text>
            </GlassCard>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <GlassCard style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: isDark ? "rgba(139, 92, 246, 0.2)" : "#ede9fe" }]}>
                  <Ionicons name="layers" size={24} color="#8b5cf6" />
                </View>
                <Text style={[styles.statLabel, { color: isDark ? "#64748b" : "#94a3b8" }]}>Total Cards</Text>
                <Text style={[styles.statValue, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>{totalCards}</Text>
              </GlassCard>

              <GlassCard style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: isDark ? "rgba(16, 185, 129, 0.2)" : "#d1fae5" }]}>
                  <Ionicons name="checkmark-done" size={24} color="#10b981" />
                </View>
                <Text style={[styles.statLabel, { color: isDark ? "#64748b" : "#94a3b8" }]}>Mastered</Text>
                <Text style={[styles.statValue, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>{masteredCards}</Text>
              </GlassCard>
            </View>

            {/* Overall Progress Card */}
            <GlassCard style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Overall Progress</Text>
                <Text style={styles.progressPercentage}>{progressPercentage}%</Text>
              </View>
              <View style={[styles.progressBar, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)" }]}>
                <LinearGradient
                  colors={["#667eea", "#8b5cf6"]}
                  style={[styles.progressFill, { width: `${progressPercentage}%` }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </View>
              <Text style={[styles.progressText, { color: isDark ? "#64748b" : "#94a3b8" }]}>
                {masteredCards} of {totalCards} cards mastered
              </Text>
            </GlassCard>

            {/* Total Reviews Card */}
            <GlassCard style={styles.card}>
              <View style={styles.totalReviewsRow}>
                <View style={[styles.statIcon, { backgroundColor: isDark ? "rgba(249, 115, 22, 0.2)" : "#ffedd5" }]}>
                  <Ionicons name="trophy" size={24} color="#f97316" />
                </View>
                <View style={styles.totalReviewsInfo}>
                  <Text style={[styles.cardTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Total Reviews</Text>
                  <Text style={[styles.totalReviewsSubtext, { color: isDark ? "#64748b" : "#94a3b8" }]}>All time</Text>
                </View>
                <Text style={[styles.totalReviewsValue, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>
                  {stats.totalCardsReviewed}
                </Text>
              </View>
            </GlassCard>

            <View style={{ height: 32 }} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  headerTitle: { fontSize: 34, fontWeight: "800", letterSpacing: -0.5 },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  card: { marginBottom: 16, overflow: "hidden" },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  
  // Streak Card
  streakHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  streakLabel: { color: "rgba(255,255,255,0.8)", fontSize: 16, fontWeight: "500" },
  streakValue: { color: "#ffffff", fontSize: 56, fontWeight: "800", marginBottom: 4 },
  streakSubtext: { color: "rgba(255,255,255,0.8)", fontSize: 16 },
  streakDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.2)", marginTop: 16, marginBottom: 12 },
  longestStreak: { color: "rgba(255,255,255,0.8)", fontSize: 14 },
  
  // Goal Card
  goalProgress: { flexDirection: "row", alignItems: "center", gap: 8 },
  goalText: { color: "#667eea", fontSize: 18, fontWeight: "700" },
  progressBar: { height: 10, borderRadius: 5, overflow: "hidden", marginBottom: 8 },
  progressFill: { height: "100%", borderRadius: 5 },
  progressText: { fontSize: 14 },
  progressPercentage: { color: "#667eea", fontSize: 18, fontWeight: "700" },
  
  // Stats Row
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  statCard: { flex: 1 },
  statIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  statLabel: { fontSize: 14, marginBottom: 4 },
  statValue: { fontSize: 28, fontWeight: "800" },
  
  // Total Reviews
  totalReviewsRow: { flexDirection: "row", alignItems: "center" },
  totalReviewsInfo: { flex: 1, marginLeft: 12 },
  totalReviewsSubtext: { fontSize: 14, marginTop: 2 },
  totalReviewsValue: { fontSize: 32, fontWeight: "800" },
  
  // Floating shapes
  floatingShape: { position: "absolute", borderRadius: 100, opacity: 0.12 },
  shape1: { width: 180, height: 180, top: -60, right: -40 },
  shape2: { width: 120, height: 120, bottom: 200, left: -40 },
});
