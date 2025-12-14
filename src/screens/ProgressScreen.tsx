import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFlashcardStore } from "../state/flashcardStore";
import { format, subDays, startOfWeek, differenceInDays } from "date-fns";
import { useTheme } from "../utils/useTheme";
import { useNavigation, CompositeNavigationProp } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { MainTabsParamList, RootStackParamList } from "../navigation/RootNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { GlassCard } from "../components/ui";
import { getMastery } from "../utils/spacedRepetition";

type NavigationProp = CompositeNavigationProp<BottomTabNavigationProp<MainTabsParamList, "Progress">, NativeStackNavigationProp<RootStackParamList>>;
type TestFilter = "all" | "upcoming" | "finished";

export default function ProgressScreen() {
  const { isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const flashcards = useFlashcardStore((s) => s.flashcards);
  const decks = useFlashcardStore((s) => s.decks);
  const [testFilter, setTestFilter] = useState<TestFilter>("upcoming");

  // Helper to get review date - supports both modes
  // For cards without last_review (old TEST_PREP), use nextReviewDate minus 1 day as approximation
  const getReviewDate = (card: typeof flashcards[0]): Date | null => {
    if (card.last_review) {
      return new Date(card.last_review);
    }
    // Fallback for old TEST_PREP cards: if reviewed (has lastResponse), estimate from nextReviewDate
    if (card.lastResponse && card.nextReviewDate) {
      // Approximate: review happened before next review date
      // Use today if nextReviewDate is in the future (recently reviewed)
      const nextReview = new Date(card.nextReviewDate);
      return nextReview > new Date() ? new Date() : nextReview;
    }
    return null;
  };

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const cardsThisWeek = flashcards.filter((card) => {
    const reviewDate = getReviewDate(card);
    return reviewDate && reviewDate >= weekStart;
  }).length;

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayCards = flashcards.filter((card) => {
      const reviewDate = getReviewDate(card);
      return reviewDate && reviewDate.toDateString() === date.toDateString();
    }).length;
    return { date, count: dayCards, label: format(date, "EEE").substring(0, 3) };
  });

  const maxDayCards = Math.max(...weekDays.map((d) => d.count), 1);
  const avgDaily = cardsThisWeek > 0 ? Math.round(cardsThisWeek / 7) : 0;

  // Use getMastery for LONG_TERM cards (considers state, stability, lapses)
  const getCardMastery = (card: typeof flashcards[0]) => {
    return card.mode === "LONG_TERM" ? getMastery(card) : (card.mastery || "LEARNING");
  };

  const categorizedCards = flashcards.reduce((acc, card) => {
    const mastery = getCardMastery(card);
    if (mastery === "STRUGGLING") acc.struggling.push(card);
    else if (mastery === "MASTERED") acc.mastered.push(card);
    else acc.learning.push(card);
    return acc;
  }, { mastered: [] as typeof flashcards, learning: [] as typeof flashcards, struggling: [] as typeof flashcards });

  const totalCards = flashcards.length;
  const masteredPercentage = totalCards > 0 ? Math.round((categorizedCards.mastered.length / totalCards) * 100) : 0;
  const learningPercentage = totalCards > 0 ? Math.round((categorizedCards.learning.length / totalCards) * 100) : 0;
  const strugglingPercentage = totalCards > 0 ? Math.round((categorizedCards.struggling.length / totalCards) * 100) : 0;

  const allTestsWithDetails = decks.filter((d) => d.testDate).map((deck) => {
    const deckCards = flashcards.filter((card) => card.deckId === deck.id);
    const masteredCount = deckCards.filter((c) => getCardMastery(c) === "MASTERED").length;
    const readyPercentage = deckCards.length > 0 ? Math.round((masteredCount / deckCards.length) * 100) : 0;
    const daysLeft = differenceInDays(new Date(deck.testDate!), new Date());
    const isPast = new Date(deck.testDate!) < new Date();
    return { ...deck, readyPercentage, daysLeft, cardCount: deckCards.length, isPast };
  });

  const filteredTests = allTestsWithDetails.filter((test) => {
    if (testFilter === "upcoming") return !test.isPast;
    if (testFilter === "finished") return test.isPast;
    return true;
  }).sort((a, b) => testFilter === "finished" ? new Date(b.testDate!).getTime() - new Date(a.testDate!).getTime() : a.daysLeft - b.daysLeft);

  const deckStats = decks.map((deck) => {
    const deckCards = flashcards.filter((card) => card.deckId === deck.id);
    const masteredCount = deckCards.filter((c) => getCardMastery(c) === "MASTERED").length;
    const masteredPct = deckCards.length > 0 ? Math.round((masteredCount / deckCards.length) * 100) : 0;
    const hasTest = deck.testDate && new Date(deck.testDate) > new Date();
    const nextTest = hasTest ? { date: deck.testDate!, daysLeft: differenceInDays(new Date(deck.testDate!), new Date()) } : null;
    return { ...deck, cardCount: deckCards.length, masteredPct, nextTest };
  });

  return (
    <View style={styles.container}>
      <LinearGradient colors={isDark ? ["#0f172a", "#1e1b4b"] : ["#f8fafc", "#eef2ff"]} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <View style={[styles.floatingShape, styles.shape1, { backgroundColor: isDark ? "#667eea" : "#a5b4fc" }]} />
      <View style={[styles.floatingShape, styles.shape2, { backgroundColor: isDark ? "#f093fb" : "#c4b5fd" }]} />
      <View style={[styles.floatingShape, styles.shape3, { backgroundColor: isDark ? "#4facfe" : "#93c5fd" }]} />

      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Progress</Text>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {/* This Week Stats */}
            <GlassCard style={styles.card}>
              <Text style={[styles.cardTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>This Week</Text>
              <View style={styles.weekStats}>
                <View style={styles.weekStatItem}>
                  <Text style={[styles.weekStatLabel, { color: isDark ? "#94a3b8" : "#64748b" }]}>Cards Reviewed</Text>
                  <Text style={[styles.weekStatValue, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>{cardsThisWeek}</Text>
                </View>
                <View style={styles.weekStatItem}>
                  <Text style={[styles.weekStatLabel, { color: isDark ? "#94a3b8" : "#64748b" }]}>Daily Average</Text>
                  <Text style={[styles.weekStatValue, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>{avgDaily}</Text>
                </View>
              </View>
            </GlassCard>

            {/* Overall Mastery */}
            <GlassCard style={styles.card}>
              <Text style={[styles.cardTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Overall Mastery</Text>
              <Text style={[styles.cardSubtitle, { color: isDark ? "#64748b" : "#94a3b8" }]}>Total Cards: {totalCards}</Text>

              <View style={styles.masterySection}>
                <View style={styles.masteryItem}>
                  <View style={styles.masteryHeader}>
                    <Text style={[styles.masteryLabel, { color: "#10b981" }]}>Mastered</Text>
                    <Text style={[styles.masteryValue, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>{categorizedCards.mastered.length} ({masteredPercentage}%)</Text>
                  </View>
                  <View style={[styles.progressBar, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)" }]}>
                    <View style={[styles.progressFill, { width: `${masteredPercentage}%`, backgroundColor: "#10b981" }]} />
                  </View>
                </View>

                <View style={styles.masteryItem}>
                  <View style={styles.masteryHeader}>
                    <Text style={[styles.masteryLabel, { color: "#667eea" }]}>Learning</Text>
                    <Text style={[styles.masteryValue, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>{categorizedCards.learning.length} ({learningPercentage}%)</Text>
                  </View>
                  <View style={[styles.progressBar, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)" }]}>
                    <View style={[styles.progressFill, { width: `${learningPercentage}%`, backgroundColor: "#667eea" }]} />
                  </View>
                </View>

                <View style={styles.masteryItem}>
                  <View style={styles.masteryHeader}>
                    <Text style={[styles.masteryLabel, { color: "#f97316" }]}>Struggling</Text>
                    <Text style={[styles.masteryValue, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>{categorizedCards.struggling.length} ({strugglingPercentage}%)</Text>
                  </View>
                  <View style={[styles.progressBar, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)" }]}>
                    <View style={[styles.progressFill, { width: `${strugglingPercentage}%`, backgroundColor: "#f97316" }]} />
                  </View>
                </View>
              </View>
            </GlassCard>

            {/* Your Decks */}
            {deckStats.length > 0 && (
              <GlassCard style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Your Decks</Text>
                  {deckStats.length > 3 && (
                    <Pressable onPress={() => navigation.navigate("Decks")}>
                      <Text style={{ color: "#667eea", fontSize: 14, fontWeight: "600" }}>See All ({deckStats.length})</Text>
                    </Pressable>
                  )}
                </View>
                <View style={styles.decksList}>
                  {deckStats.slice(0, 3).map((deck, index, array) => (
                    <Pressable key={deck.id} onPress={() => navigation.navigate("Deck", { deckId: deck.id })} style={[styles.deckItem, index !== array.length - 1 && { borderBottomWidth: 1, borderBottomColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]}>
                      <View style={styles.deckItemHeader}>
                        <View style={[styles.deckDot, { backgroundColor: deck.color }]} />
                        <Text style={[styles.deckName, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>{deck.name}</Text>
                      </View>
                      <Text style={[styles.deckStats, { color: isDark ? "#64748b" : "#94a3b8" }]}>{deck.cardCount} cards • {deck.masteredPct}% mastered</Text>
                      {deck.nextTest && <Text style={{ color: "#667eea", fontSize: 13, fontWeight: "500", marginTop: 2 }}>Next test: {format(new Date(deck.nextTest.date), "MMM d")} ({deck.nextTest.daysLeft}d)</Text>}
                    </Pressable>
                  ))}
                </View>
              </GlassCard>
            )}

            {/* Review Activity */}
            <GlassCard style={styles.card}>
              <Text style={[styles.cardTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Review Activity</Text>
              <Text style={[styles.cardSubtitle, { color: isDark ? "#64748b" : "#94a3b8" }]}>Last 7 Days</Text>
              <View style={styles.chartContainer}>
                {weekDays.map((day, index) => {
                  const barHeight = day.count > 0 ? Math.max((day.count / maxDayCards) * 120, 16) : 6;
                  const isToday = day.date.toDateString() === new Date().toDateString();
                  return (
                    <View key={index} style={styles.chartBar}>
                      <View style={styles.chartBarInner}>
                        {day.count > 0 && <Text style={[styles.chartCount, { color: isDark ? "#94a3b8" : "#64748b" }]}>{day.count}</Text>}
                        <View style={[styles.bar, { height: barHeight, backgroundColor: isToday ? "#667eea" : (isDark ? "rgba(102,126,234,0.3)" : "#c7d2fe") }]} />
                      </View>
                      <Text style={[styles.chartLabel, { color: isToday ? "#667eea" : (isDark ? "#64748b" : "#94a3b8"), fontWeight: isToday ? "700" : "400" }]}>{day.label}</Text>
                    </View>
                  );
                })}
              </View>
            </GlassCard>

            {/* Tests */}
            {allTestsWithDetails.length > 0 && (
              <GlassCard style={styles.card}>
                <Text style={[styles.cardTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Tests</Text>
                
                <GlassCard padding={4} borderRadius={14} style={styles.filterContainer}>
                  <View style={styles.filterRow}>
                    {(["upcoming", "finished", "all"] as TestFilter[]).map((filter) => (
                      <Pressable key={filter} onPress={() => setTestFilter(filter)} style={[styles.filterTab, testFilter === filter && styles.filterTabActive]}>
                        {testFilter === filter && <LinearGradient colors={["#667eea", "#764ba2"]} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} pointerEvents="none" />}
                        <Text style={[styles.filterText, { color: testFilter === filter ? "#ffffff" : (isDark ? "#64748b" : "#94a3b8") }]}>{filter.charAt(0).toUpperCase() + filter.slice(1)}</Text>
                      </Pressable>
                    ))}
                  </View>
                </GlassCard>

                {filteredTests.length === 0 ? (
                  <View style={styles.emptyTests}>
                    <Text style={{ color: isDark ? "#64748b" : "#94a3b8" }}>No {testFilter === "all" ? "" : testFilter} tests</Text>
                  </View>
                ) : (
                  <View style={styles.testsList}>
                    {filteredTests.map((test) => (
                      <View key={test.id} style={[styles.testItem, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }]}>
                        <View style={styles.testItemTop}>
                          <View style={styles.testItemInfo}>
                            <View style={styles.testItemHeader}>
                              <View style={[styles.testDot, { backgroundColor: test.color }]} />
                              <Text style={[styles.testName, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>{test.name}</Text>
                            </View>
                            <Text style={[styles.testCards, { color: isDark ? "#64748b" : "#94a3b8" }]}>{test.cardCount} cards</Text>
                          </View>
                          <View style={[styles.readyBadge, { backgroundColor: test.readyPercentage >= 80 ? (isDark ? "rgba(16,185,129,0.2)" : "#d1fae5") : test.readyPercentage >= 60 ? (isDark ? "rgba(251,191,36,0.2)" : "#fef3c7") : (isDark ? "rgba(239,68,68,0.2)" : "#fee2e2") }]}>
                            <Text style={[styles.readyText, { color: test.readyPercentage >= 80 ? "#10b981" : test.readyPercentage >= 60 ? "#f59e0b" : "#ef4444" }]}>{test.readyPercentage}%</Text>
                          </View>
                        </View>
                        <View style={[styles.testItemBottom, { borderTopColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]}>
                          <Text style={[styles.testDate, { color: isDark ? "#64748b" : "#94a3b8" }]}>{format(new Date(test.testDate!), "MMM d, yyyy")}</Text>
                          {test.isPast ? (
                            <Text style={{ color: isDark ? "#64748b" : "#94a3b8", fontSize: 13, fontWeight: "500" }}>Finished</Text>
                          ) : (
                            <Text style={{ color: "#667eea", fontSize: 13, fontWeight: "600" }}>{test.daysLeft === 0 ? "Today" : test.daysLeft === 1 ? "Tomorrow" : `${test.daysLeft} days left`}</Text>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </GlassCard>
            )}

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
  card: { marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
  cardSubtitle: { fontSize: 13, marginBottom: 16 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  weekStats: { gap: 12 },
  weekStatItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  weekStatLabel: { fontSize: 15 },
  weekStatValue: { fontSize: 20, fontWeight: "700" },
  masterySection: { gap: 16 },
  masteryItem: {},
  masteryHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  masteryLabel: { fontSize: 14, fontWeight: "600" },
  masteryValue: { fontSize: 14, fontWeight: "600" },
  progressBar: { height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  decksList: {},
  deckItem: { paddingVertical: 12 },
  deckItemHeader: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  deckDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  deckName: { fontSize: 15, fontWeight: "600" },
  deckStats: { fontSize: 13 },
  chartContainer: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: 160, marginTop: 8 },
  chartBar: { flex: 1, alignItems: "center" },
  chartBarInner: { flex: 1, justifyContent: "flex-end", alignItems: "center", marginBottom: 8 },
  chartCount: { fontSize: 11, fontWeight: "600", marginBottom: 4 },
  bar: { width: 24, borderRadius: 6 },
  chartLabel: { fontSize: 11 },
  filterContainer: { marginBottom: 16 },
  filterRow: { flexDirection: "row" },
  filterTab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center", overflow: "hidden" },
  filterTabActive: { overflow: "hidden" },
  filterText: { fontSize: 13, fontWeight: "600" },
  emptyTests: { paddingVertical: 32, alignItems: "center" },
  testsList: { gap: 12 },
  testItem: { borderRadius: 16, overflow: "hidden" },
  testItemTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14 },
  testItemInfo: { flex: 1 },
  testItemHeader: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  testDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  testName: { fontSize: 15, fontWeight: "600" },
  testCards: { fontSize: 12 },
  readyBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  readyText: { fontSize: 13, fontWeight: "700" },
  testItemBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1 },
  testDate: { fontSize: 13 },
  floatingShape: { position: "absolute", borderRadius: 100, opacity: 0.12 },
  shape1: { width: 180, height: 180, top: -60, right: -40 },
  shape2: { width: 120, height: 120, bottom: 300, left: -40 },
  shape3: { width: 80, height: 80, top: 400, right: -20 },
});
