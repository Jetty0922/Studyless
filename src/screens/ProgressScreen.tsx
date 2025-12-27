import React, { useState, useCallback, useMemo } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFlashcardStore } from "../state/flashcardStore";
import { format, subDays, startOfWeek, differenceInDays, addDays } from "date-fns";
import { useTheme } from "../utils/useTheme";
import { useNavigation, useFocusEffect, CompositeNavigationProp } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { MainTabsParamList, RootStackParamList } from "../navigation/RootNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { GlassCard } from "../components/ui";
import { getExamPhase, getExamPreparedness } from "../utils/examScheduler";
import { getWorkloadForecast, DEFAULT_LOAD_CONFIG } from "../utils/loadBalancer";

type NavigationProp = CompositeNavigationProp<BottomTabNavigationProp<MainTabsParamList, "Progress">, NativeStackNavigationProp<RootStackParamList>>;
type TestFilter = "all" | "upcoming" | "finished";

export default function ProgressScreen() {
  const { isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const flashcards = useFlashcardStore((s) => s.flashcards);
  const decks = useFlashcardStore((s) => s.decks);
  const syncWithSupabase = useFlashcardStore((s) => s.syncWithSupabase);
  const [testFilter, setTestFilter] = useState<TestFilter>("upcoming");

  // Sync data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      syncWithSupabase();
    }, [syncWithSupabase])
  );

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const cardsThisWeek = flashcards.filter((card) => card.last_review && new Date(card.last_review) >= weekStart).length;

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayCards = flashcards.filter((card) => card.last_review && new Date(card.last_review).toDateString() === date.toDateString()).length;
    return { date, count: dayCards, label: format(date, "EEE").substring(0, 3) };
  });

  const maxDayCards = Math.max(...weekDays.map((d) => d.count), 1);
  const avgDaily = cardsThisWeek > 0 ? Math.round(cardsThisWeek / 7) : 0;

  const categorizedCards = flashcards.reduce((acc, card) => {
    if (card.mastery === "STRUGGLING") acc.struggling.push(card);
    else if (card.mastery === "MASTERED") acc.mastered.push(card);
    else acc.learning.push(card);
    return acc;
  }, { mastered: [] as typeof flashcards, learning: [] as typeof flashcards, struggling: [] as typeof flashcards });

  const totalCards = flashcards.length;
  const masteredPercentage = totalCards > 0 ? Math.round((categorizedCards.mastered.length / totalCards) * 100) : 0;
  const learningPercentage = totalCards > 0 ? Math.round((categorizedCards.learning.length / totalCards) * 100) : 0;
  const strugglingPercentage = totalCards > 0 ? Math.round((categorizedCards.struggling.length / totalCards) * 100) : 0;

  const allTestsWithDetails = decks.filter((d) => d.testDate).map((deck) => {
    const deckCards = flashcards.filter((card) => card.deckId === deck.id);
    const masteredCount = deckCards.filter((c) => c.mastery === "MASTERED").length;
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

  // Exam preparedness for upcoming tests
  const upcomingExams = useMemo(() => {
    return decks
      .filter(d => d.testDate && new Date(d.testDate) > new Date())
      .map(deck => {
        const deckCards = flashcards.filter(c => c.deckId === deck.id);
        const examDate = new Date(deck.testDate!);
        const phaseConfig = getExamPhase(examDate);
        const preparedness = getExamPreparedness(deckCards, examDate);
        return { deck, phaseConfig, preparedness };
      })
      .filter(e => e.preparedness.daysLeft <= 30)  // Show exams within 30 days
      .slice(0, 3);
  }, [decks, flashcards]);

  // Workload forecast for next 7 days
  const workloadForecast = useMemo(() => {
    return getWorkloadForecast(flashcards, 7, DEFAULT_LOAD_CONFIG);
  }, [flashcards]);

  const deckStats = decks.map((deck) => {
    const deckCards = flashcards.filter((card) => card.deckId === deck.id);
    const masteredCount = deckCards.filter((c) => c.mastery === "MASTERED").length;
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

            {/* Exam Preparedness */}
            {upcomingExams.length > 0 && (
              <GlassCard style={styles.card}>
                <Text style={[styles.cardTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Exam Preparedness</Text>
                <Text style={[styles.cardSubtitle, { color: isDark ? "#64748b" : "#94a3b8" }]}>Upcoming exams within 30 days</Text>
                
                <View style={styles.examList}>
                  {upcomingExams.map(({ deck, phaseConfig, preparedness }) => {
                    const phaseColors = {
                      MAINTENANCE: "#10b981",
                      CONSOLIDATION: "#f59e0b",
                      CRAM: "#ef4444",
                      EXAM_DAY: "#8b5cf6",
                      POST_EXAM: "#64748b"
                    };
                    const phaseColor = phaseColors[phaseConfig.phase] || "#667eea";
                    
                    return (
                      <View key={deck.id} style={[styles.examItem, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }]}>
                        <View style={styles.examHeader}>
                          <View style={styles.examInfo}>
                            <View style={[styles.examDot, { backgroundColor: deck.color }]} />
                            <Text style={[styles.examName, { color: isDark ? "#f1f5f9" : "#1e293b" }]} numberOfLines={1}>{deck.name}</Text>
                          </View>
                          <View style={[styles.phaseBadge, { backgroundColor: isDark ? `${phaseColor}33` : `${phaseColor}22` }]}>
                            <Text style={[styles.phaseText, { color: phaseColor }]}>{phaseConfig.phase}</Text>
                          </View>
                        </View>
                        
                        <View style={styles.examStats}>
                          <View style={styles.examStatItem}>
                            <Text style={[styles.examStatLabel, { color: isDark ? "#64748b" : "#94a3b8" }]}>Days Left</Text>
                            <Text style={[styles.examStatValue, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>{preparedness.daysLeft}</Text>
                          </View>
                          <View style={styles.examStatItem}>
                            <Text style={[styles.examStatLabel, { color: isDark ? "#64748b" : "#94a3b8" }]}>Predicted Score</Text>
                            <Text style={[styles.examStatValue, { color: preparedness.estimatedScore >= 80 ? "#10b981" : preparedness.estimatedScore >= 60 ? "#f59e0b" : "#ef4444" }]}>{preparedness.estimatedScore}%</Text>
                          </View>
                          <View style={styles.examStatItem}>
                            <Text style={[styles.examStatLabel, { color: isDark ? "#64748b" : "#94a3b8" }]}>Daily Goal</Text>
                            <Text style={[styles.examStatValue, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>{preparedness.dailyCardsNeeded}</Text>
                          </View>
                        </View>
                        
                        <View style={styles.examBreakdown}>
                          <View style={[styles.breakdownItem, { backgroundColor: isDark ? "rgba(16,185,129,0.15)" : "#d1fae5" }]}>
                            <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                            <Text style={[styles.breakdownText, { color: "#10b981" }]}>{preparedness.readyCards} ready</Text>
                          </View>
                          <View style={[styles.breakdownItem, { backgroundColor: isDark ? "rgba(245,158,11,0.15)" : "#fef3c7" }]}>
                            <Ionicons name="alert-circle" size={14} color="#f59e0b" />
                            <Text style={[styles.breakdownText, { color: "#f59e0b" }]}>{preparedness.atRiskCards} at risk</Text>
                          </View>
                          <View style={[styles.breakdownItem, { backgroundColor: isDark ? "rgba(239,68,68,0.15)" : "#fee2e2" }]}>
                            <Ionicons name="warning" size={14} color="#ef4444" />
                            <Text style={[styles.breakdownText, { color: "#ef4444" }]}>{preparedness.criticalCards} critical</Text>
                          </View>
                        </View>
                        
                        <Text style={[styles.recommendation, { color: isDark ? "#94a3b8" : "#64748b" }]}>{preparedness.recommendation}</Text>
                      </View>
                    );
                  })}
                </View>
              </GlassCard>
            )}

            {/* Workload Forecast */}
            <GlassCard style={styles.card}>
              <Text style={[styles.cardTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Upcoming Reviews</Text>
              <Text style={[styles.cardSubtitle, { color: isDark ? "#64748b" : "#94a3b8" }]}>Next 7 days</Text>
              <View style={styles.workloadContainer}>
                {workloadForecast.map((day, index) => {
                  const isToday = index === 0;
                  const barHeight = day.scheduledCards > 0 
                    ? Math.max((day.scheduledCards / Math.max(...workloadForecast.map(d => d.scheduledCards), 1)) * 80, 12) 
                    : 4;
                  
                  return (
                    <View key={day.dateKey} style={styles.workloadDay}>
                      <View style={styles.workloadBarContainer}>
                        {day.scheduledCards > 0 && (
                          <Text style={[styles.workloadCount, { color: isDark ? "#94a3b8" : "#64748b" }]}>{day.scheduledCards}</Text>
                        )}
                        <View 
                          style={[
                            styles.workloadBar, 
                            { 
                              height: barHeight, 
                              backgroundColor: day.isOverloaded 
                                ? "#ef4444" 
                                : day.isEasyDay 
                                  ? "#10b981" 
                                  : isToday 
                                    ? "#667eea" 
                                    : (isDark ? "rgba(102,126,234,0.3)" : "#c7d2fe")
                            }
                          ]} 
                        />
                      </View>
                      <Text style={[styles.workloadLabel, { color: isToday ? "#667eea" : (isDark ? "#64748b" : "#94a3b8"), fontWeight: isToday ? "700" : "400" }]}>
                        {isToday ? "Today" : format(day.date, "EEE")}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </GlassCard>

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
  
  // Exam preparedness styles
  examList: { gap: 16 },
  examItem: { borderRadius: 16, padding: 14 },
  examHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  examInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  examDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  examName: { fontSize: 15, fontWeight: "600", flex: 1 },
  phaseBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  phaseText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  examStats: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  examStatItem: { alignItems: "center" },
  examStatLabel: { fontSize: 11, marginBottom: 2 },
  examStatValue: { fontSize: 18, fontWeight: "700" },
  examBreakdown: { flexDirection: "row", gap: 8, marginBottom: 8 },
  breakdownItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
  breakdownText: { fontSize: 12, fontWeight: "500" },
  recommendation: { fontSize: 12, fontStyle: "italic", textAlign: "center" },
  
  // Workload forecast styles
  workloadContainer: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: 120, marginTop: 8 },
  workloadDay: { flex: 1, alignItems: "center" },
  workloadBarContainer: { flex: 1, justifyContent: "flex-end", alignItems: "center", marginBottom: 8 },
  workloadCount: { fontSize: 10, fontWeight: "600", marginBottom: 4 },
  workloadBar: { width: 20, borderRadius: 4 },
  workloadLabel: { fontSize: 10 },
});
