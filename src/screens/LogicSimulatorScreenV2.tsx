import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, Pressable, TouchableOpacity, Switch, Platform, Alert, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useTheme } from "../utils/useTheme";
import { 
  calculateTestPrepReview, 
  calculateLongTermReview,
  convertToLongTerm,
} from "../utils/spacedRepetition";
import { Flashcard, ReviewRating } from "../types/flashcard";
import { format, addDays, differenceInDays, startOfDay } from "date-fns";

const STORAGE_KEY = "LOGIC_SIMULATOR_STATE_V3";

interface SimulatorResult {
  nextReviewDate?: Date;
  rating?: ReviewRating;
  action?: string;
  interval?: number;
  error?: string;
}

type LogicSimulatorScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, "LogicSimulator">;
};

export default function LogicSimulatorScreen({ navigation }: LogicSimulatorScreenProps) {
  const { colors, isDark } = useTheme();
  
  // Simulation State
  const [isLoaded, setIsLoaded] = useState(false);
  const [mode, setMode] = useState<"TEST_PREP" | "LONG_TERM">("TEST_PREP");
  const [testDate, setTestDate] = useState(addDays(new Date(), 7));
  const [simulatedDays, setSimulatedDays] = useState(0); 
  const [autoAdvance, setAutoAdvance] = useState(true); 
  
  // Mock Card State
  const [mockCard, setMockCard] = useState<Partial<Flashcard>>({
    id: "mock-1",
    mode: "TEST_PREP",
  });

  const [lastResult, setLastResult] = useState<SimulatorResult | null>(null);

  const resetCard = useCallback((targetMode?: "TEST_PREP" | "LONG_TERM") => {
    const effectiveMode = targetMode || mode;
    const now = new Date();
    let newCard: Partial<Flashcard> = {
      id: "mock-" + Date.now(),
      mode: effectiveMode,
      createdAt: now,
      nextReviewDate: now,
      front: "Mock Question",
      back: "Mock Answer",
      learningState: 'LEARNING',
      learningStep: 0,
    };

    if (effectiveMode === "TEST_PREP") {
      newCard = {
        ...newCard,
        testDate: testDate,
        mastery: "LEARNING",
        againCount: 0,
      };
    } else {
      newCard = {
        ...newCard,
        state: 0,
        stability: 0,
        difficulty: 0,
        lastReview: undefined,
      };
    }
    setSimulatedDays(0);
    setMockCard(newCard);
    setLastResult(null);
  }, [mode, testDate]);

  const loadState = useCallback(async () => {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (json) {
        const data = JSON.parse(json);
        const revive = (d: string | null | undefined): Date | undefined => d ? new Date(d) : undefined;
        if (data.mockCard) {
            if (data.mockCard.createdAt) data.mockCard.createdAt = revive(data.mockCard.createdAt);
            if (data.mockCard.nextReviewDate) data.mockCard.nextReviewDate = revive(data.mockCard.nextReviewDate);
            if (data.mockCard.testDate) data.mockCard.testDate = revive(data.mockCard.testDate);
            if (data.mockCard.lastReview) data.mockCard.lastReview = revive(data.mockCard.lastReview);
            // Migrate old last_review to lastReview
            if (data.mockCard.last_review && !data.mockCard.lastReview) {
              data.mockCard.lastReview = revive(data.mockCard.last_review);
              delete data.mockCard.last_review;
            }
        }
        if (data.lastResult) {
             if (data.lastResult.nextReviewDate) data.lastResult.nextReviewDate = revive(data.lastResult.nextReviewDate);
        }
        if (data.testDate) setTestDate(new Date(data.testDate));

        setMode(data.mode || "TEST_PREP");
        setSimulatedDays(data.simulatedDays || 0);
        setMockCard(data.mockCard || {});
        setLastResult(data.lastResult || null);
        if (data.autoAdvance !== undefined) setAutoAdvance(data.autoAdvance);
      } else {
        resetCard();
      }
    } catch (e) {
      console.error("Failed to load simulator state", e);
      resetCard();
    } finally {
      setIsLoaded(true);
    }
  }, [resetCard]);

  const saveState = useCallback(async () => {
    try {
      const data = {
        mode,
        testDate,
        simulatedDays,
        mockCard,
        lastResult,
        autoAdvance
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Failed to save simulator state", e);
    }
  }, [autoAdvance, lastResult, mockCard, mode, simulatedDays, testDate]);

  // Load State on Mount
  useEffect(() => {
    loadState();
  }, [loadState]);

  // Save State on Change
  useEffect(() => {
    if (isLoaded) {
      saveState();
    }
  }, [isLoaded, saveState, mode, testDate, simulatedDays, mockCard, lastResult, autoAdvance]);

  // Update testDate on mock card when it changes
  useEffect(() => {
    if (!isLoaded) return;
    if (mode === "TEST_PREP") {
      setMockCard(prev => ({
        ...prev,
        testDate: testDate,
      }));
    }
  }, [isLoaded, mode, testDate]);

  const handleReview = (rating: ReviewRating) => {
    const card = mockCard as Flashcard;
    const simulatedNow = addDays(new Date(), simulatedDays);
    
    try {
        const result: Partial<Flashcard> & { action?: string; interval?: number } = mode === "TEST_PREP" 
            ? calculateTestPrepReview(card, rating, simulatedNow)
            : calculateLongTermReview(card, rating, simulatedNow);
    
        setLastResult({ ...result, rating });
    
        setMockCard(prev => ({
            ...prev,
            ...result,
        }));

        if (autoAdvance && result.nextReviewDate) {
            const today = startOfDay(new Date());
            const nextDate = startOfDay(result.nextReviewDate);
            const diff = differenceInDays(nextDate, today);
            if (diff >= simulatedDays) {
                setSimulatedDays(diff);
            }
        }
    } catch (e) {
        console.error("Logic Error:", e);
        setLastResult({ error: "Calculation Failed: " + (e as Error).message });
    }
  };

  const handleSimulateConversion = () => {
      try {
        // Use centralized conversion helper
        const now = addDays(new Date(), simulatedDays);
        const updates = convertToLongTerm([mockCard as Flashcard])[0];

        setMode("LONG_TERM");
        setMockCard(prev => ({
            ...prev,
            ...updates,
        }));
        
        const nextDueFormatted = updates.nextReviewDate ? format(updates.nextReviewDate, "MMM d") : "Now";
        Alert.alert("Converted", `Card converted to Long Term mode.\nStability: ${updates.stability ?? 0}\nNext Due: ${nextDueFormatted}`);

      } catch (e) {
          Alert.alert("Error", "Conversion failed: " + (e as Error).message);
      }
  };

  const handleDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (date) setTestDate(date);
  };

  const handleModeChange = (newMode: "TEST_PREP" | "LONG_TERM") => {
    setMode(newMode);
    resetCard(newMode);
  };

  const simulatedDate = addDays(new Date(), simulatedDays);
  const isTestFinished = mode === "TEST_PREP" && differenceInDays(startOfDay(testDate), startOfDay(simulatedDate)) <= 1;

  const InfoRow = ({ label, value }: { label: string, value: string }) => (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: isDark ? "#94a3b8" : "#6b7280" }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: isDark ? "#f1f5f9" : "#111827" }]}>{value}</Text>
    </View>
  );

  const RatingButton = ({ rating, color, bg }: { rating: ReviewRating, color: string, bg: string }) => (
    <TouchableOpacity 
        onPress={() => handleReview(rating)}
        style={[styles.ratingButton, { backgroundColor: bg }]}
    >
        <Text style={[styles.ratingButtonText, { color }]}>{rating}</Text>
    </TouchableOpacity>
  );

  if (!isLoaded) return <View style={[styles.container, { backgroundColor: colors.background }]} />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      <View style={styles.content}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
          <Pressable onPress={() => navigation?.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Logic Simulator V2</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollView}>
          {/* Mode Tabs */}
          <View style={[styles.tabContainer, { backgroundColor: colors.border }]}>
             {(["TEST_PREP", "LONG_TERM"] as const).map((m) => (
                 <TouchableOpacity 
                    key={m}
                    onPress={() => handleModeChange(m)}
                    style={[styles.tab, { backgroundColor: mode === m ? colors.surface : "transparent" }]}
                 >
                     <Text style={[styles.tabText, { color: mode === m ? colors.text : (isDark ? "#94a3b8" : "#6b7280") }]}>
                         {m.replace("_", " ")}
                     </Text>
                 </TouchableOpacity>
             ))}
          </View>

          {/* Simulation Controls */}
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
               <Text style={[styles.sectionTitle, { color: isDark ? "#94a3b8" : "#6b7280" }]}>Simulation Controls</Text>
               
               <View style={styles.controlRow}>
                   <View>
                       <Text style={[styles.controlLabel, { color: isDark ? "#94a3b8" : "#6b7280" }]}>Simulated Today</Text>
                       <Text style={[styles.controlValue, { color: colors.primary }]}>
                           {format(simulatedDate, "MMM d")}
                       </Text>
                   </View>
                   <View style={styles.dayControls}>
                       <TouchableOpacity onPress={() => setSimulatedDays(Math.max(0, simulatedDays - 1))} style={[styles.dayButton, { backgroundColor: colors.border }]}>
                           <Ionicons name="remove" size={20} color={colors.text} />
                       </TouchableOpacity>
                       <Text style={{ color: colors.text }}>{simulatedDays}d</Text>
                       <TouchableOpacity onPress={() => setSimulatedDays(simulatedDays + 1)} style={[styles.dayButton, { backgroundColor: colors.border }]}>
                           <Ionicons name="add" size={20} color={colors.text} />
                       </TouchableOpacity>
                   </View>
               </View>

               <View style={[styles.switchRow, { borderColor: colors.border }]}>
                   <Text style={{ color: colors.text }}>Auto-Advance to Due Date</Text>
                   <Switch 
                        value={autoAdvance} 
                        onValueChange={setAutoAdvance} 
                        trackColor={{ true: colors.primary, false: isDark ? "#334155" : "#e5e7eb" }}
                        thumbColor="#ffffff"
                   />
               </View>

               {mode === "TEST_PREP" && (
                    <View style={[styles.dateSection, { borderColor: colors.border }]}>
                        <View style={styles.dateRow}>
                            <Text style={{ color: colors.text }}>Test Date</Text>
                            <DateTimePicker
                                value={testDate}
                                mode="date"
                                display={Platform.OS === "ios" ? "compact" : "default"}
                                onChange={handleDateChange}
                                style={{ height: 40 }}
                            />
                        </View>
                    </View>
               )}
          </View>

          {/* Card Status */}
          <View style={[styles.cardSection, { backgroundColor: colors.surface }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Card Status</Text>
              <InfoRow label="Next Review" value={mockCard.nextReviewDate ? format(mockCard.nextReviewDate, "MMM d") : "N/A"} />
              
              {mode === "TEST_PREP" ? (
                  <>
                    <InfoRow label="Mastery" value={mockCard.mastery || "N/A"} />
                    <InfoRow label="Current Step" value={mockCard.currentStep?.toString() || "0"} />
                    <InfoRow label="Ladder" value={`[${mockCard.schedule?.join(", ")}]`} />
                  </>
              ) : (
                  <>
                    <InfoRow label="State" value={["New", "Learning", "Review", "Relearning"][mockCard.state || 0]} />
                    <InfoRow label="Stability" value={mockCard.stability?.toFixed(2) || "0.00"} />
                    <InfoRow label="Difficulty" value={mockCard.difficulty?.toFixed(2) || "0.00"} />
                  </>
              )}
          </View>

          {/* Action Buttons OR Test Completed Banner */}
          {isTestFinished ? (
              <View style={[styles.finishedBanner, { backgroundColor: isDark ? "#a78bfa" : "#8b5cf6" }]}>
                  <Text style={styles.finishedTitle}>
                      {differenceInDays(startOfDay(testDate), startOfDay(simulatedDate)) === 1 ? "Final Review Day" : "Test Date Reached!"}
                  </Text>
                  <Text style={styles.finishedSubtitle}>
                      You can switch to Long Term mode now to maintain your knowledge efficiently.
                  </Text>
                  <TouchableOpacity 
                      onPress={handleSimulateConversion}
                      style={styles.convertButton}
                  >
                      <Text style={[styles.convertButtonText, { color: isDark ? "#a78bfa" : "#8b5cf6" }]}>Switch to Long Term</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                      onPress={() => resetCard()}
                      style={styles.resetOutlineButton}
                  >
                      <Text style={styles.resetOutlineButtonText}>Reset Simulation</Text>
                  </TouchableOpacity>
              </View>
          ) : (
              <View style={styles.ratingRow}>
                  <RatingButton rating="AGAIN" color="white" bg={isDark ? "#f87171" : "#ef4444"} />
                  <RatingButton rating="HARD" color="white" bg={isDark ? "#fbbf24" : "#f59e0b"} />
                  <RatingButton rating="GOOD" color="white" bg={isDark ? "#34d399" : "#10b981"} />
                  <RatingButton rating="EASY" color="white" bg="#3b82f6" />
              </View>
          )}

          {/* Last Result */}
          {lastResult && (
              <View style={[styles.resultCard, { borderColor: colors.primary, backgroundColor: colors.surface }]}>
                  <Text style={[styles.resultTitle, { color: colors.primary }]}>
                      Result after pressing {lastResult.rating}
                  </Text>
                  <Text style={{ color: colors.text }}>
                      Next Review: {lastResult.nextReviewDate ? format(lastResult.nextReviewDate, "MMM d") : "None"}
                  </Text>
                  {lastResult.action === "REQUEUE" && (
                      <Text style={[styles.requeueText, { color: isDark ? "#f87171" : "#ef4444" }]}>REQUEUED (Due: {lastResult.nextReviewDate ? format(lastResult.nextReviewDate, "MMM d") : "N/A"})</Text>
                  )}
                  {lastResult.interval !== undefined && (
                      <Text style={{ color: colors.text }}>Interval: {lastResult.interval} days</Text>
                  )}
                  {autoAdvance && lastResult?.nextReviewDate && (
                      <Text style={[styles.advanceNote, { color: isDark ? "#94a3b8" : "#6b7280" }]}>Simulated time advanced to match due date.</Text>
                  )}
                  {lastResult.error && (
                      <Text style={[styles.errorText, { color: isDark ? "#f87171" : "#ef4444" }]}>{lastResult.error}</Text>
                  )}
              </View>
          )}

          {/* Reset Button */}
          <TouchableOpacity 
            onPress={() => resetCard()}
            style={[styles.resetButton, { backgroundColor: colors.surface }]}
          >
              <Text style={[styles.resetButtonText, { color: colors.primary }]}>Reset Simulation</Text>
          </TouchableOpacity>

        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backButton: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  headerSpacer: { width: 24 },
  scrollView: { flex: 1, padding: 16 },
  tabContainer: { flexDirection: "row", marginBottom: 16, padding: 4, borderRadius: 12 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
  tabText: { fontWeight: "700" },
  section: { marginBottom: 24, padding: 16, borderRadius: 16 },
  sectionTitle: { fontWeight: "700", marginBottom: 12 },
  controlRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  controlLabel: { fontSize: 12 },
  controlValue: { fontWeight: "700", fontSize: 18 },
  dayControls: { flexDirection: "row", alignItems: "center", gap: 12 },
  dayButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderTopWidth: 1, paddingTop: 16 },
  dateSection: { marginTop: 8, paddingTop: 8, borderTopWidth: 1 },
  dateRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  cardSection: { marginBottom: 24, padding: 20, borderRadius: 24 },
  cardTitle: { fontSize: 20, fontWeight: "700", marginBottom: 16 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  infoLabel: {},
  infoValue: { fontWeight: "700" },
  ratingRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  ratingButton: { flex: 1, paddingVertical: 16, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  ratingButtonText: { fontWeight: "700" },
  finishedBanner: { marginBottom: 24, padding: 24, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  finishedTitle: { color: "white", fontWeight: "700", fontSize: 20, marginBottom: 8 },
  finishedSubtitle: { color: "white", opacity: 0.9, textAlign: "center", marginBottom: 16 },
  convertButton: { backgroundColor: "white", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, width: "100%", alignItems: "center", marginBottom: 8 },
  convertButtonText: { fontWeight: "700" },
  resetOutlineButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, width: "100%", alignItems: "center", borderWidth: 1, borderColor: "white" },
  resetOutlineButtonText: { fontWeight: "700", color: "white" },
  resultCard: { padding: 16, borderRadius: 16, borderWidth: 2, marginBottom: 24 },
  resultTitle: { fontWeight: "700", marginBottom: 8 },
  requeueText: { fontWeight: "700" },
  advanceNote: { fontSize: 12, marginTop: 8, fontStyle: "italic" },
  errorText: { fontWeight: "700" },
  resetButton: { paddingVertical: 16, borderRadius: 12, alignItems: "center" },
  resetButtonText: { fontWeight: "700" },
});
