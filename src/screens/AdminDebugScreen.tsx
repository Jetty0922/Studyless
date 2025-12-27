import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  StyleSheet,
  Switch,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useFlashcardStore } from "../state/flashcardStore";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useTheme } from "../utils/useTheme";
import { GlassCard } from "../components/ui";
import { getDeckDebugInfo, formatIntervalLog } from "../utils/debugTools";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function AdminDebugScreen() {
  const { isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  
  const decks = useFlashcardStore((s) => s.decks);
  const flashcards = useFlashcardStore((s) => s.flashcards);
  const debugMode = useFlashcardStore((s) => s.debugMode);
  const intervalLogs = useFlashcardStore((s) => s.intervalLogs);
  const setDebugMode = useFlashcardStore((s) => s.setDebugMode);
  const clearIntervalLogs = useFlashcardStore((s) => s.clearIntervalLogs);
  const resetDeck = useFlashcardStore((s) => s.resetDeck);
  const forceAllDue = useFlashcardStore((s) => s.forceAllDue);
  const timeTravelDeck = useFlashcardStore((s) => s.timeTravelDeck);
  const updateDeck = useFlashcardStore((s) => s.updateDeck);
  const recalculateTestPrepSchedules = useFlashcardStore((s) => s.recalculateTestPrepSchedules);
  const simulateDaysPassing = useFlashcardStore((s) => s.simulateDaysPassing);
  
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(
    decks.length > 0 ? decks[0].id : null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: isDark ? "#0f172a" : "#f8fafc" },
      headerTintColor: isDark ? "#f1f5f9" : "#1e293b",
      title: "Admin Debug",
    });
  }, [navigation, isDark]);
  
  const selectedDeck = useMemo(
    () => decks.find((d) => d.id === selectedDeckId),
    [decks, selectedDeckId]
  );
  
  const deckCards = useMemo(
    () => flashcards.filter((c) => c.deckId === selectedDeckId),
    [flashcards, selectedDeckId]
  );
  
  const debugInfo = useMemo(
    () => getDeckDebugInfo(deckCards),
    [deckCards]
  );
  
  const handleResetDeck = async () => {
    if (!selectedDeckId) return;
    
    Alert.alert(
      "Reset Deck",
      "This will clear ALL progress for this deck. Cards will become 'new' again. This cannot be undone!",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            setIsLoading(true);
            try {
              await resetDeck(selectedDeckId);
              Alert.alert("Success", "Deck has been reset");
            } catch (e) {
              Alert.alert("Error", "Failed to reset deck");
            }
            setIsLoading(false);
          },
        },
      ]
    );
  };
  
  const handleForceAllDue = async () => {
    if (!selectedDeckId) return;
    
    setIsLoading(true);
    try {
      await forceAllDue(selectedDeckId);
      Alert.alert("Success", "All cards are now due");
    } catch (e) {
      Alert.alert("Error", "Failed to force cards due");
    }
    setIsLoading(false);
  };
  
  const handleTimeTravel = async (days: number) => {
    if (!selectedDeckId) return;
    
    setIsLoading(true);
    try {
      await timeTravelDeck(selectedDeckId, days);
      Alert.alert("Success", `Time traveled ${days} days into the future`);
    } catch (e) {
      Alert.alert("Error", "Failed to time travel");
    }
    setIsLoading(false);
  };
  
  const handleMoveTestDateCloser = async (days: number) => {
    if (!selectedDeckId || !selectedDeck) return;
    if (selectedDeck.mode !== 'TEST_PREP' || !selectedDeck.testDate) {
      Alert.alert("Error", "This only works for TEST_PREP decks with a test date");
      return;
    }
    
    setIsLoading(true);
    try {
      const currentTestDate = selectedDeck.testDate instanceof Date 
        ? selectedDeck.testDate 
        : new Date(selectedDeck.testDate);
      const newTestDate = new Date(currentTestDate.getTime() - days * 24 * 60 * 60 * 1000);
      
      // Don't allow test date in the past
      if (newTestDate <= new Date()) {
        Alert.alert("Error", "Cannot set test date to past");
        setIsLoading(false);
        return;
      }
      
      await updateDeck(selectedDeckId, { testDate: newTestDate });
      // Recalculate all card schedules based on new test date/phase
      await recalculateTestPrepSchedules(selectedDeckId);
      
      const daysLeft = Math.ceil((newTestDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      Alert.alert("Success", `Test date moved to ${newTestDate.toLocaleDateString()} (${daysLeft} days away). Card schedules recalculated.`);
    } catch (e) {
      Alert.alert("Error", "Failed to update test date");
    }
    setIsLoading(false);
  };
  
  const handleSimulateDaysPassing = async (days: number) => {
    if (!selectedDeckId || !selectedDeck) return;
    
    setIsLoading(true);
    try {
      await simulateDaysPassing(selectedDeckId, days);
      
      // Get updated deck info
      const updatedDeck = decks.find(d => d.id === selectedDeckId);
      if (updatedDeck?.testDate) {
        const newDaysLeft = Math.ceil((new Date(updatedDeck.testDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        Alert.alert(
          "Simulation Complete",
          `Simulated ${days} days passing.\n\nTest is now ${newDaysLeft} days away.\nAll card schedules have been recalculated.`
        );
      } else {
        Alert.alert("Simulation Complete", `Simulated ${days} days passing. Card dates shifted.`);
      }
    } catch (e) {
      Alert.alert("Error", "Failed to simulate time passing");
    }
    setIsLoading(false);
  };
  
  const colors = {
    bg: isDark ? "#0f172a" : "#f8fafc",
    card: isDark ? "rgba(30, 41, 59, 0.8)" : "rgba(255, 255, 255, 0.9)",
    text: isDark ? "#f1f5f9" : "#1e293b",
    textSecondary: isDark ? "#94a3b8" : "#64748b",
    border: isDark ? "rgba(148, 163, 184, 0.2)" : "rgba(148, 163, 184, 0.3)",
    danger: "#ef4444",
    warning: "#f59e0b",
    success: "#22c55e",
    primary: "#6366f1",
  };
  
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={isDark ? ["#0f172a", "#1e1b4b"] : ["#f8fafc", "#eef2ff"]}
        style={StyleSheet.absoluteFillObject}
      />
      
      <ScrollView contentContainerStyle={styles.content}>
        {/* Debug Mode Toggle */}
        <GlassCard style={styles.section}>
          <View style={styles.toggleRow}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Debug Mode
              </Text>
              <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
                Show FSRS state overlay on cards
              </Text>
            </View>
            <Switch
              value={debugMode}
              onValueChange={setDebugMode}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
        </GlassCard>
        
        {/* Deck Selector */}
        <GlassCard style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Select Deck
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {decks.map((deck) => (
              <Pressable
                key={deck.id}
                onPress={() => setSelectedDeckId(deck.id)}
                style={[
                  styles.deckChip,
                  {
                    backgroundColor:
                      deck.id === selectedDeckId ? colors.primary : colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: deck.id === selectedDeckId ? "#fff" : colors.text,
                    fontWeight: "600",
                  }}
                >
                  {deck.emoji} {deck.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </GlassCard>
        
        {selectedDeck && (
          <>
            {/* Deck Stats */}
            <GlassCard style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Deck Stats
              </Text>
              <View style={styles.statsGrid}>
                <StatBox label="Total" value={debugInfo.summary.total} color={colors.text} />
                <StatBox label="New" value={debugInfo.summary.newCards} color={colors.primary} />
                <StatBox label="Learning" value={debugInfo.summary.learning} color={colors.warning} />
                <StatBox label="Review" value={debugInfo.summary.review} color={colors.success} />
                <StatBox label="Relearning" value={debugInfo.summary.relearning} color={colors.danger} />
                <StatBox label="Overdue" value={debugInfo.summary.overdue} color={colors.danger} />
                <StatBox label="Leeches" value={debugInfo.summary.leeches} color={colors.danger} />
              </View>
              
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              
              <View style={styles.statsRow}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Avg Stability:
                </Text>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {debugInfo.summary.avgStability} days
                </Text>
              </View>
              <View style={styles.statsRow}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Avg Difficulty:
                </Text>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {debugInfo.summary.avgDifficulty}/10
                </Text>
              </View>
              <View style={styles.statsRow}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Avg Retrievability:
                </Text>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {(debugInfo.summary.avgRetrievability * 100).toFixed(1)}%
                </Text>
              </View>
            </GlassCard>
            
            {/* Debug Actions */}
            <GlassCard style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Debug Actions
              </Text>
              
              {isLoading && (
                <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
              )}
              
              {!isLoading && (
                <>
                  <Pressable
                    onPress={handleForceAllDue}
                    style={[styles.actionButton, { backgroundColor: colors.primary }]}
                  >
                    <Ionicons name="flash" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Force All Due Now</Text>
                  </Pressable>
                  
                  <Text style={[styles.subTitle, { color: colors.textSecondary, marginTop: 16 }]}>
                    Time Travel (make cards due sooner)
                  </Text>
                  <View style={styles.timeButtonsRow}>
                    {[1, 3, 7, 14, 30].map((days) => (
                      <Pressable
                        key={days}
                        onPress={() => handleTimeTravel(days)}
                        style={[styles.timeButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                      >
                        <Text style={{ color: colors.text, fontWeight: "600" }}>+{days}d</Text>
                      </Pressable>
                    ))}
                  </View>
                  
                  {selectedDeck?.mode === 'TEST_PREP' && selectedDeck.testDate && (
                    <>
                      <Text style={[styles.subTitle, { color: colors.textSecondary, marginTop: 16 }]}>
                        Move Test Date Closer (for testing cram mode)
                      </Text>
                      <Text style={[styles.testDateInfo, { color: colors.warning }]}>
                        Current: {new Date(selectedDeck.testDate).toLocaleDateString()} ({Math.ceil((new Date(selectedDeck.testDate).getTime() - new Date().getTime()) / (1000*60*60*24))} days away)
                      </Text>
                      <View style={styles.timeButtonsRow}>
                        {[1, 2, 3, 5].map((days) => (
                          <Pressable
                            key={days}
                            onPress={() => handleMoveTestDateCloser(days)}
                            style={[styles.timeButton, { backgroundColor: colors.warning + '30', borderColor: colors.warning }]}
                          >
                            <Text style={{ color: colors.warning, fontWeight: "600" }}>-{days}d</Text>
                          </Pressable>
                        ))}
                      </View>
                      
                      <Text style={[styles.subTitle, { color: colors.textSecondary, marginTop: 20 }]}>
                        Simulate Days Passing (full simulation)
                      </Text>
                      <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                        Moves test date closer + shifts card dates + recalculates schedules
                      </Text>
                      <View style={styles.timeButtonsRow}>
                        {[1, 3, 7, 14].map((days) => (
                          <Pressable
                            key={`sim-${days}`}
                            onPress={() => handleSimulateDaysPassing(days)}
                            style={[styles.timeButton, { backgroundColor: colors.success + '30', borderColor: colors.success }]}
                          >
                            <Text style={{ color: colors.success, fontWeight: "600" }}>+{days}d</Text>
                          </Pressable>
                        ))}
                      </View>
                    </>
                  )}
                  
                  <Pressable
                    onPress={handleResetDeck}
                    style={[styles.actionButton, { backgroundColor: colors.danger, marginTop: 16 }]}
                  >
                    <Ionicons name="refresh" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Reset Deck (Clear All Progress)</Text>
                  </Pressable>
                </>
              )}
            </GlassCard>
          </>
        )}
        
        {/* Interval Logs */}
        <GlassCard style={styles.section}>
          <Pressable
            onPress={() => setShowLogs(!showLogs)}
            style={styles.toggleRow}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Interval Logs ({intervalLogs.length})
            </Text>
            <Ionicons
              name={showLogs ? "chevron-up" : "chevron-down"}
              size={20}
              color={colors.textSecondary}
            />
          </Pressable>
          
          {showLogs && (
            <>
              {intervalLogs.length > 0 && (
                <Pressable
                  onPress={clearIntervalLogs}
                  style={[styles.clearButton, { borderColor: colors.border }]}
                >
                  <Text style={{ color: colors.danger }}>Clear Logs</Text>
                </Pressable>
              )}
              
              {intervalLogs.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No interval logs yet. Review some cards to see logs.
                </Text>
              ) : (
                intervalLogs.slice().reverse().map((log, index) => (
                  <View
                    key={index}
                    style={[styles.logEntry, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <Text style={[styles.logText, { color: colors.text }]}>
                      {formatIntervalLog(log)}
                    </Text>
                  </View>
                ))
              )}
            </>
          )}
        </GlassCard>
        
        {/* Card Debug Info */}
        {selectedDeck && debugMode && (
          <GlassCard style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Card Details
            </Text>
            
            {debugInfo.cards.slice(0, 10).map((card, index) => (
              <View
                key={index}
                style={[styles.cardRow, { borderBottomColor: colors.border }]}
              >
                <Text style={[styles.cardFront, { color: colors.text }]} numberOfLines={1}>
                  {card.front}
                </Text>
                <View style={styles.cardStats}>
                  <Text style={[styles.cardStat, { color: colors.textSecondary }]}>
                    S:{card.stability}d
                  </Text>
                  <Text style={[styles.cardStat, { color: colors.textSecondary }]}>
                    D:{card.difficulty}
                  </Text>
                  <Text style={[styles.cardStat, { color: card.isOverdue ? colors.danger : colors.success }]}>
                    R:{card.retrievabilityPercent}
                  </Text>
                </View>
              </View>
            ))}
            
            {debugInfo.cards.length > 10 && (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Showing 10 of {debugInfo.cards.length} cards
              </Text>
            )}
          </GlassCard>
        )}
      </ScrollView>
    </View>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statBoxValue, { color }]}>{value}</Text>
      <Text style={styles.statBoxLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  sectionDesc: {
    fontSize: 14,
  },
  subTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  deckChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statBox: {
    alignItems: "center",
    minWidth: 60,
    padding: 8,
  },
  statBoxValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  statBoxLabel: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  timeButtonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  timeButton: {
    flex: 1,
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  testDateInfo: {
    fontSize: 13,
    marginBottom: 8,
    fontWeight: "500",
  },
  helperText: {
    fontSize: 12,
    marginBottom: 8,
    fontStyle: "italic",
  },
  clearButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 12,
  },
  logEntry: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  logText: {
    fontFamily: "monospace",
    fontSize: 11,
    lineHeight: 16,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 12,
    fontSize: 14,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  cardFront: {
    flex: 1,
    fontSize: 14,
    marginRight: 8,
  },
  cardStats: {
    flexDirection: "row",
    gap: 8,
  },
  cardStat: {
    fontSize: 12,
    fontFamily: "monospace",
  },
});

