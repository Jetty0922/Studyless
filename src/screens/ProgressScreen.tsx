import React, { useCallback } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFlashcardStore } from "../state/flashcardStore";
import { format, subDays, startOfWeek } from "date-fns";
import { useTheme } from "../utils/useTheme";
import { useFocusEffect } from "@react-navigation/native";
import { Card } from "../components/ui";

export default function ProgressScreen() {
  const { colors } = useTheme();
  const flashcards = useFlashcardStore((s) => s.flashcards);
  const syncWithSupabase = useFlashcardStore((s) => s.syncWithSupabase);

  useFocusEffect(
    useCallback(() => {
      syncWithSupabase();
    }, [syncWithSupabase])
  );

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const getLastReview = (card: typeof flashcards[0]) => card.lastReview || card.last_review;
  const cardsThisWeek = flashcards.filter((card) => {
    const lastReview = getLastReview(card);
    return lastReview && new Date(lastReview) >= weekStart;
  }).length;

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayCards = flashcards.filter((card) => {
      const lastReview = getLastReview(card);
      return lastReview && new Date(lastReview).toDateString() === date.toDateString();
    }).length;
    return { date, count: dayCards, label: format(date, "EEE").substring(0, 3) };
  });

  const maxDayCards = Math.max(...weekDays.map((d) => d.count), 1);

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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Progress</Text>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {/* Quick Stats */}
            <View style={styles.statsRow}>
              <Card variant="outlined" style={styles.statCard}>
                <Ionicons name="trophy" size={24} color={colors.warning} />
                <Text style={[styles.statValue, { color: colors.text }]}>{categorizedCards.mastered.length}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Mastered</Text>
              </Card>
              <Card variant="outlined" style={styles.statCard}>
                <Ionicons name="checkmark-done" size={24} color={colors.success} />
                <Text style={[styles.statValue, { color: colors.text }]}>{cardsThisWeek}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>This Week</Text>
              </Card>
              <Card variant="outlined" style={styles.statCard}>
                <Ionicons name="layers" size={24} color={colors.primary} />
                <Text style={[styles.statValue, { color: colors.text }]}>{totalCards}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Cards</Text>
              </Card>
            </View>

            {/* Weekly Activity */}
            <Card variant="outlined">
              <Text style={[styles.cardTitle, { color: colors.text }]}>Weekly Activity</Text>
              <View style={styles.chartContainer}>
                {weekDays.map((day, index) => {
                  const barHeight = day.count > 0 ? Math.max((day.count / maxDayCards) * 80, 8) : 4;
                  const isToday = day.date.toDateString() === new Date().toDateString();
                  return (
                    <View key={index} style={styles.chartBar}>
                      <View style={styles.chartBarInner}>
                        {day.count > 0 && (
                          <Text style={[styles.chartCount, { color: colors.textSecondary }]}>{day.count}</Text>
                        )}
                        <View 
                          style={[
                            styles.bar, 
                            { 
                              height: barHeight, 
                              backgroundColor: isToday ? colors.primary : colors.border 
                            }
                          ]} 
                        />
                      </View>
                      <Text style={[styles.chartLabel, { color: isToday ? colors.primary : colors.textSecondary }]}>
                        {day.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Card>

            {/* Mastery Breakdown */}
            <Card variant="outlined">
              <Text style={[styles.cardTitle, { color: colors.text }]}>Mastery Breakdown</Text>
              <View style={styles.masterySection}>
                <MasteryRow 
                  label="Mastered" 
                  count={categorizedCards.mastered.length} 
                  percentage={masteredPercentage}
                  color={colors.success}
                  colors={colors}
                />
                <MasteryRow 
                  label="Learning" 
                  count={categorizedCards.learning.length} 
                  percentage={learningPercentage}
                  color={colors.primary}
                  colors={colors}
                />
                <MasteryRow 
                  label="Struggling" 
                  count={categorizedCards.struggling.length} 
                  percentage={strugglingPercentage}
                  color={colors.warning}
                  colors={colors}
                />
              </View>
            </Card>

            <View style={{ height: 32 }} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function MasteryRow({ label, count, percentage, color, colors }: { 
  label: string; 
  count: number; 
  percentage: number; 
  color: string;
  colors: any;
}) {
  return (
    <View style={styles.masteryRow}>
      <View style={styles.masteryInfo}>
        <View style={[styles.masteryDot, { backgroundColor: color }]} />
        <Text style={[styles.masteryLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.masteryCount, { color: colors.textSecondary }]}>{count}</Text>
      </View>
      <View style={styles.masteryBarContainer}>
        <View style={[styles.masteryBar, { backgroundColor: colors.border }]}>
          <View style={[styles.masteryFill, { width: `${percentage}%`, backgroundColor: color }]} />
        </View>
        <Text style={[styles.masteryPercent, { color: colors.textSecondary }]}>{percentage}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { 
    paddingHorizontal: 20, 
    paddingTop: 16, 
    paddingBottom: 12 
  },
  headerTitle: { 
    fontSize: 28, 
    fontWeight: "700", 
    letterSpacing: -0.5 
  },
  scrollView: { flex: 1 },
  content: { 
    paddingHorizontal: 20, 
    paddingTop: 8,
    gap: 16,
  },
  statsRow: { 
    flexDirection: "row", 
    gap: 12 
  },
  statCard: { 
    flex: 1, 
    alignItems: "center", 
    paddingVertical: 16 
  },
  statValue: { 
    fontSize: 28, 
    fontWeight: "700", 
    marginTop: 8 
  },
  statLabel: { 
    fontSize: 12, 
    marginTop: 2 
  },
  cardTitle: { 
    fontSize: 17, 
    fontWeight: "600", 
    marginBottom: 16 
  },
  chartContainer: { 
    flexDirection: "row", 
    alignItems: "flex-end", 
    justifyContent: "space-between", 
    height: 120 
  },
  chartBar: { 
    flex: 1, 
    alignItems: "center" 
  },
  chartBarInner: { 
    flex: 1, 
    justifyContent: "flex-end", 
    alignItems: "center", 
    marginBottom: 8 
  },
  chartCount: { 
    fontSize: 10, 
    fontWeight: "600", 
    marginBottom: 4 
  },
  bar: { 
    width: 20, 
    borderRadius: 4 
  },
  chartLabel: { 
    fontSize: 11 
  },
  masterySection: { 
    gap: 12 
  },
  masteryRow: {},
  masteryInfo: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: 6 
  },
  masteryDot: { 
    width: 8, 
    height: 8, 
    borderRadius: 4, 
    marginRight: 8 
  },
  masteryLabel: { 
    fontSize: 14, 
    fontWeight: "500", 
    flex: 1 
  },
  masteryCount: { 
    fontSize: 14 
  },
  masteryBarContainer: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 8 
  },
  masteryBar: { 
    flex: 1, 
    height: 6, 
    borderRadius: 3, 
    overflow: "hidden" 
  },
  masteryFill: { 
    height: "100%", 
    borderRadius: 3 
  },
  masteryPercent: { 
    fontSize: 12, 
    width: 36, 
    textAlign: "right" 
  },
});
