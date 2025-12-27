import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Modal, TextInput, Alert, Platform, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useFlashcardStore } from "../state/flashcardStore";
import { RootStackParamList } from "../navigation/RootNavigator";
import { format, differenceInDays } from "date-fns";
import { useTheme } from "../utils/useTheme";
import { SortMenu } from "../components/SortMenu";
import { GlassCard } from "../components/ui";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { getMastery } from "../utils/spacedRepetition";

// Force reload - getMastery function now available
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type DeckSortOption = "testDate" | "name" | "progress";
type TabMode = "TEST_PREP" | "LONG_TERM";

const DECK_COLORS = ["#667eea", "#8b5cf6", "#ec4899", "#f97316", "#10b981", "#ef4444"];

export default function DecksListScreen() {
  const { isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const decks = useFlashcardStore((s) => s.decks);
  const flashcards = useFlashcardStore((s) => s.flashcards);
  const addDeck = useFlashcardStore((s) => s.addDeck);

  const [activeTab, setActiveTab] = useState<TabMode>("TEST_PREP");
  const [sortBy, setSortBy] = useState<DeckSortOption>("testDate");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDeckName, setNewDeckName] = useState("");
  const [selectedColor, setSelectedColor] = useState(DECK_COLORS[0]);
  const [deckMode, setDeckMode] = useState<"TEST_PREP" | "LONG_TERM">("TEST_PREP");
  const defaultTestDate = React.useMemo(() => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), []);
  const [testDate, setTestDate] = useState<Date | undefined>(defaultTestDate);
  const [pickerDate, setPickerDate] = useState<Date>(defaultTestDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const deckStats = decks.map((deck) => {
    const deckCards = flashcards.filter((card) => card.deckId === deck.id);
    const isLongTerm = deck.mode === "LONG_TERM";
    // Use getMastery for LONG_TERM cards (considers state, stability, lapses)
    const getCardMastery = (c: typeof deckCards[0]) => isLongTerm ? getMastery(c) : (c.mastery || "LEARNING");
    const masteredCount = deckCards.filter((c) => getCardMastery(c) === "MASTERED").length;
    const masteredPct = deckCards.length > 0 ? Math.round((masteredCount / deckCards.length) * 100) : 0;
    const learningCount = deckCards.filter((c) => getCardMastery(c) === "LEARNING").length;
    const strugglingCount = deckCards.filter((c) => getCardMastery(c) === "STRUGGLING").length;
    const hasTest = deck.testDate && new Date(deck.testDate) > new Date();
    const testPassed = deck.testDate && new Date(deck.testDate) < new Date();
    const isArchived = deck.status === "completed";
    const daysLeft = deck.testDate ? differenceInDays(new Date(deck.testDate), new Date()) : null;

    let urgencyLevel: "critical" | "warning" | "normal" | "none" = "none";
    let urgencyBg = isDark ? "rgba(102, 126, 234, 0.2)" : "#eef2ff";
    let urgencyText = "#667eea";

    if (hasTest && daysLeft !== null) {
      if (daysLeft <= 3) {
        urgencyLevel = "critical";
        urgencyBg = isDark ? "rgba(239, 68, 68, 0.2)" : "#fee2e2";
        urgencyText = "#ef4444";
      } else if (daysLeft <= 7) {
        urgencyLevel = "warning";
        urgencyBg = isDark ? "rgba(249, 115, 22, 0.2)" : "#ffedd5";
        urgencyText = "#f97316";
      } else {
        urgencyLevel = "normal";
      }
    }

    return { ...deck, cardCount: deckCards.length, masteredPct, masteredCount, learningCount, strugglingCount, daysLeft, hasTest, testPassed, isLongTerm, isArchived, urgencyLevel, urgencyBg, urgencyText };
  });

  const filteredDecks = deckStats.filter((deck) => deck.mode === activeTab);
  const sortedDecks = [...filteredDecks].sort((a, b) => {
    if (sortBy === "testDate") {
      if (!a.hasTest && !b.hasTest) return 0;
      if (!a.hasTest) return 1;
      if (!b.hasTest) return -1;
      return (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity);
    } else if (sortBy === "name") return a.name.localeCompare(b.name);
    else if (sortBy === "progress") return b.masteredPct - a.masteredPct;
    return a.name.localeCompare(b.name);
  });

  const getSortLabel = () => {
    if (sortBy === "testDate") return "Test Date";
    if (sortBy === "name") return "Name (A-Z)";
    if (sortBy === "progress") return "Progress";
    return "Test Date";
  };

  const handleCreateDeck = async () => {
    if (isCreating) return; // Prevent duplicate submissions
    if (!newDeckName.trim()) { Alert.alert("Error", "Deck name cannot be empty"); return; }
    if (deckMode === "TEST_PREP" && !testDate) { Alert.alert("Error", "Please set a test date"); return; }
    setIsCreating(true);
    try {
      const deckId = await addDeck(newDeckName.trim(), selectedColor, undefined, deckMode === "TEST_PREP" ? testDate : undefined, deckMode);
      const resetDate = defaultTestDate;
      setNewDeckName(""); 
      setSelectedColor(DECK_COLORS[0]); 
      setDeckMode("TEST_PREP"); 
      setTestDate(resetDate); 
      setPickerDate(resetDate);
      setShowCreateModal(false);
      navigation.navigate("Deck", { deckId });
    } catch (error) { console.error(error); Alert.alert("Error", "Failed to create deck"); } finally { setIsCreating(false); }
  };

  const handleDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    // Keep pickerDate in sync for both platforms
    if (selectedDate) {
      setPickerDate(selectedDate);
      // Android only fires onChange when a value is confirmed
      if (Platform.OS === "android") {
        setTestDate(selectedDate);
      }
    }
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
  };

  const openDatePicker = () => {
    const initial = testDate || defaultTestDate;
    setPickerDate(initial);
    setShowDatePicker(true);
  };

  const handleDateConfirm = () => {
    setTestDate(pickerDate || defaultTestDate);
    setShowDatePicker(false);
  };

  const handleDateCancel = () => {
    setShowDatePicker(false);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={isDark ? ["#0f172a", "#1e1b4b"] : ["#f8fafc", "#eef2ff"]} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <View style={[styles.floatingShape, styles.shape1, { backgroundColor: isDark ? "#667eea" : "#a5b4fc" }]} />
      <View style={[styles.floatingShape, styles.shape2, { backgroundColor: isDark ? "#f093fb" : "#c4b5fd" }]} />

      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Decks</Text>
          <Pressable onPress={() => setShowCreateModal(true)} style={styles.addButton}>
            <LinearGradient colors={["#667eea", "#764ba2"]} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} pointerEvents="none" />
            <Ionicons name="add" size={26} color="white" />
          </Pressable>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <GlassCard padding={4} borderRadius={16}>
            <View style={styles.tabRow}>
              <Pressable onPress={() => setActiveTab("TEST_PREP")} style={[styles.tab, activeTab === "TEST_PREP" && styles.tabActive]}>
                {activeTab === "TEST_PREP" && <LinearGradient colors={["#667eea", "#764ba2"]} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} pointerEvents="none" />}
                <Text style={[styles.tabText, { color: activeTab === "TEST_PREP" ? "#ffffff" : isDark ? "#94a3b8" : "#64748b" }]}>Test Prep</Text>
              </Pressable>
              <Pressable onPress={() => setActiveTab("LONG_TERM")} style={[styles.tab, activeTab === "LONG_TERM" && styles.tabActiveLongTerm]}>
                {activeTab === "LONG_TERM" && <LinearGradient colors={["#10b981", "#059669"]} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} pointerEvents="none" />}
                <Text style={[styles.tabText, { color: activeTab === "LONG_TERM" ? "#ffffff" : isDark ? "#94a3b8" : "#64748b" }]}>Long-Term</Text>
              </Pressable>
            </View>
          </GlassCard>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {sortedDecks.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="albums-outline" size={64} color={isDark ? "#64748b" : "#94a3b8"} />
                <Text style={[styles.emptyTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>
                  {activeTab === "TEST_PREP" ? "No Test Prep Decks" : "No Long-Term Decks"}
                </Text>
                <Text style={[styles.emptySubtitle, { color: isDark ? "#64748b" : "#94a3b8" }]}>
                  {activeTab === "TEST_PREP" ? "Create a deck to prepare for your tests" : "Convert test prep decks to long-term mode"}
                </Text>
              </View>
            ) : (
              <>
                {/* Sort Button */}
                <Pressable onPress={() => setShowSortMenu(true)}>
                  <GlassCard style={styles.sortButton} padding={12}>
                    <View style={styles.sortButtonContent}>
                      <View style={styles.sortButtonLeft}>
                        <Ionicons name="funnel-outline" size={16} color={isDark ? "#94a3b8" : "#64748b"} />
                        <Text style={[styles.sortButtonText, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>
                          Sort: <Text style={styles.sortButtonValue}>{getSortLabel()}</Text>
                        </Text>
                      </View>
                      <Ionicons name="chevron-down" size={16} color={isDark ? "#64748b" : "#94a3b8"} />
                    </View>
                  </GlassCard>
                </Pressable>

                {/* Deck Cards */}
                <View style={styles.decksList}>
                  {sortedDecks.map((deck) => (
                    <Pressable key={deck.id} onPress={() => navigation.navigate("Deck", { deckId: deck.id })}>
                      <GlassCard style={styles.deckCard}>
                        {/* Badge */}
                        {deck.hasTest && deck.urgencyLevel !== "none" && (
                          <View style={[styles.urgencyBadge, { backgroundColor: deck.urgencyBg }]}>
                            <Ionicons name={deck.urgencyLevel === "critical" ? "alert-circle" : "time-outline"} size={12} color={deck.urgencyText} />
                            <Text style={[styles.urgencyText, { color: deck.urgencyText }]}>
                              {deck.daysLeft === 0 ? "TODAY" : deck.daysLeft === 1 ? "TOMORROW" : `${deck.daysLeft}d`}
                            </Text>
                          </View>
                        )}
                        {deck.isLongTerm && !deck.hasTest && (
                          <View style={[styles.urgencyBadge, { backgroundColor: isDark ? "rgba(16, 185, 129, 0.2)" : "#d1fae5" }]}>
                            <Ionicons name="repeat" size={12} color="#10b981" />
                            <Text style={[styles.urgencyText, { color: "#10b981" }]}>LONG-TERM</Text>
                          </View>
                        )}

                        {/* Header */}
                        <View style={styles.deckHeader}>
                          <View style={[styles.deckDot, { backgroundColor: deck.color }]} />
                          <Text style={[styles.deckName, { color: isDark ? "#f1f5f9" : "#1e293b" }]} numberOfLines={1}>{deck.name}</Text>
                        </View>

                        {/* Card count */}
                        <View style={styles.cardCountRow}>
                          <Ionicons name="layers-outline" size={16} color={isDark ? "#64748b" : "#94a3b8"} />
                          <Text style={[styles.cardCountText, { color: isDark ? "#94a3b8" : "#64748b" }]}>{deck.cardCount} cards</Text>
                        </View>

                        {/* Progress */}
                        <View style={styles.progressSection}>
                          <View style={styles.progressHeader}>
                            <Text style={[styles.progressLabel, { color: isDark ? "#94a3b8" : "#64748b" }]}>Progress</Text>
                            <Text style={[styles.progressValue, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>{deck.masteredPct}%</Text>
                          </View>
                          <View style={[styles.progressBar, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)" }]}>
                            <View style={[styles.progressFill, { width: `${deck.masteredPct}%`, backgroundColor: deck.masteredPct >= 80 ? "#10b981" : deck.masteredPct >= 50 ? "#667eea" : "#f97316" }]} />
                          </View>
                        </View>

                        {/* Stats */}
                        <View style={styles.statsRow}>
                          <View style={[styles.statItem, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }]}>
                            <View style={[styles.statDot, { backgroundColor: "#10b981" }]} />
                            <Text style={[styles.statLabel, { color: isDark ? "#64748b" : "#94a3b8" }]}>Mastered</Text>
                            <Text style={[styles.statValue, { color: "#10b981" }]}>{deck.masteredCount}</Text>
                          </View>
                          <View style={[styles.statItem, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }]}>
                            <View style={[styles.statDot, { backgroundColor: "#667eea" }]} />
                            <Text style={[styles.statLabel, { color: isDark ? "#64748b" : "#94a3b8" }]}>Learning</Text>
                            <Text style={[styles.statValue, { color: "#667eea" }]}>{deck.learningCount}</Text>
                          </View>
                          <View style={[styles.statItem, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }]}>
                            <View style={[styles.statDot, { backgroundColor: "#f97316" }]} />
                            <Text style={[styles.statLabel, { color: isDark ? "#64748b" : "#94a3b8" }]}>Struggling</Text>
                            <Text style={[styles.statValue, { color: "#f97316" }]}>{deck.strugglingCount}</Text>
                          </View>
                        </View>

                        {/* Test Date */}
                        {deck.testDate && (
                          <View style={[styles.testDateRow, { backgroundColor: deck.urgencyBg }]}>
                            <View style={styles.testDateLeft}>
                              <Ionicons name="calendar-outline" size={14} color={deck.urgencyText} />
                              <Text style={[styles.testDateText, { color: deck.urgencyText }]}>
                                Test: {format(new Date(deck.testDate), "MMM d, yyyy")}
                              </Text>
                            </View>
                            {deck.hasTest && <Text style={[styles.testDateDays, { color: deck.urgencyText }]}>{deck.daysLeft === 0 ? "Today" : deck.daysLeft === 1 ? "Tomorrow" : `${deck.daysLeft} days`}</Text>}
                          </View>
                        )}
                      </GlassCard>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
            <View style={{ height: 32 }} />
          </View>
        </ScrollView>
      </SafeAreaView>

      <SortMenu visible={showSortMenu} onClose={() => setShowSortMenu(false)} options={[{ value: "testDate", label: "Test Date" }, { value: "progress", label: "Progress" }, { value: "name", label: "Name" }]} selectedValue={sortBy} onSelect={(v) => setSortBy(v as DeckSortOption)} />

      {/* Create Modal */}
      <Modal visible={showCreateModal} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowCreateModal(false)}>
        <View style={[styles.modalContainer, { backgroundColor: isDark ? "#1e293b" : "#ffffff" }]}>
          <View style={[styles.modalHeader, { borderBottomColor: isDark ? "#334155" : "#e2e8f0" }]}>
            <Pressable onPress={() => setShowCreateModal(false)}><Text style={{ color: "#667eea", fontSize: 17 }}>Cancel</Text></Pressable>
            <Text style={[styles.modalTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>New Deck</Text>
            <Pressable onPress={handleCreateDeck} disabled={isCreating}><Text style={{ color: isCreating ? "#94a3b8" : "#667eea", fontSize: 17, fontWeight: "600" }}>{isCreating ? "Creating..." : "Create"}</Text></Pressable>
          </View>
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={[styles.inputLabel, { color: isDark ? "#94a3b8" : "#64748b" }]}>Deck Name</Text>
            <TextInput value={newDeckName} onChangeText={setNewDeckName} placeholder="e.g., Biology Chapter 3" placeholderTextColor={isDark ? "#64748b" : "#94a3b8"} style={[styles.input, { backgroundColor: isDark ? "#0f172a" : "#f8fafc", borderColor: isDark ? "#334155" : "#e2e8f0", color: isDark ? "#f1f5f9" : "#1e293b" }]} autoFocus />

            <Text style={[styles.inputLabel, { color: isDark ? "#94a3b8" : "#64748b", marginTop: 20 }]}>Study Mode</Text>
            <View style={styles.modeRow}>
              <Pressable onPress={() => setDeckMode("TEST_PREP")} style={[styles.modeOption, { backgroundColor: deckMode === "TEST_PREP" ? (isDark ? "rgba(102,126,234,0.2)" : "#eef2ff") : (isDark ? "#0f172a" : "#f8fafc"), borderColor: deckMode === "TEST_PREP" ? "#667eea" : (isDark ? "#334155" : "#e2e8f0") }]}>
                <Ionicons name="calendar" size={24} color={deckMode === "TEST_PREP" ? "#667eea" : (isDark ? "#64748b" : "#94a3b8")} />
                <Text style={[styles.modeTitle, { color: deckMode === "TEST_PREP" ? "#667eea" : (isDark ? "#f1f5f9" : "#1e293b") }]}>Test Prep</Text>
                <Text style={[styles.modeDesc, { color: isDark ? "#64748b" : "#94a3b8" }]}>Schedule based on test date</Text>
              </Pressable>
              <Pressable onPress={() => setDeckMode("LONG_TERM")} style={[styles.modeOption, { backgroundColor: deckMode === "LONG_TERM" ? (isDark ? "rgba(16,185,129,0.2)" : "#d1fae5") : (isDark ? "#0f172a" : "#f8fafc"), borderColor: deckMode === "LONG_TERM" ? "#10b981" : (isDark ? "#334155" : "#e2e8f0") }]}>
                <Ionicons name="repeat" size={24} color={deckMode === "LONG_TERM" ? "#10b981" : (isDark ? "#64748b" : "#94a3b8")} />
                <Text style={[styles.modeTitle, { color: deckMode === "LONG_TERM" ? "#10b981" : (isDark ? "#f1f5f9" : "#1e293b") }]}>Long-Term</Text>
                <Text style={[styles.modeDesc, { color: isDark ? "#64748b" : "#94a3b8" }]}>Spaced repetition forever</Text>
              </Pressable>
            </View>

            <Text style={[styles.inputLabel, { color: isDark ? "#94a3b8" : "#64748b", marginTop: 20 }]}>Color</Text>
            <View style={styles.colorRow}>
              {DECK_COLORS.map((c) => (
                <Pressable key={c} onPress={() => setSelectedColor(c)} style={[styles.colorOption, { backgroundColor: c, borderWidth: selectedColor === c ? 3 : 0, borderColor: isDark ? "#f1f5f9" : "#1e293b" }]}>
                  {selectedColor === c && <Ionicons name="checkmark" size={24} color="#fff" />}
                </Pressable>
              ))}
            </View>

            {deckMode === "TEST_PREP" && (
              <>
                <Text style={[styles.inputLabel, { color: isDark ? "#94a3b8" : "#64748b", marginTop: 20 }]}>Test Date *</Text>
                <Pressable 
                  onPress={openDatePicker} 
                  style={[styles.dateButton, { backgroundColor: isDark ? "#0f172a" : "#f8fafc", borderColor: testDate ? (isDark ? "#334155" : "#e2e8f0") : "#ef4444" }]}
                >
                  <Text style={{ color: testDate ? (isDark ? "#f1f5f9" : "#1e293b") : (isDark ? "#64748b" : "#94a3b8"), fontSize: 16 }}>{testDate ? format(testDate, "MMM d, yyyy") : "Select test date"}</Text>
                  <Ionicons name="calendar-outline" size={20} color={isDark ? "#64748b" : "#94a3b8"} />
                </Pressable>
              </>
            )}
            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Date Picker Overlay - iOS only - Renders inside Create Modal */}
          {Platform.OS === 'ios' && showDatePicker && (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? "#1e293b" : "#ffffff", zIndex: 100 }]}>
              <View style={[styles.datePickerHeader, { borderBottomColor: isDark ? "#334155" : "#e2e8f0" }]}>
                <Pressable onPress={handleDateCancel} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={styles.datePickerButton}>Cancel</Text>
                </Pressable>
                <Text style={[styles.datePickerTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Test Date</Text>
                <Pressable onPress={handleDateConfirm} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={[styles.datePickerButton, { fontWeight: "600" }]}>Done</Text>
                </Pressable>
              </View>
              <View style={styles.datePickerContainer}>
                <DateTimePicker 
                  value={pickerDate} 
                  mode="date" 
                  display="spinner" 
                  onChange={handleDateChange} 
                  minimumDate={new Date()} 
                  themeVariant={isDark ? "dark" : "light"}
                  textColor={isDark ? "#f1f5f9" : "#1e293b"}
                  style={{ width: '100%', height: 300 }}
                />
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* Android Date Picker */}
      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker 
          value={pickerDate} 
          mode="date" 
          display="default"
          onChange={handleDateChange} 
          minimumDate={new Date()}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  headerTitle: { fontSize: 34, fontWeight: "800", letterSpacing: -0.5 },
  addButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  tabContainer: { paddingHorizontal: 20, marginBottom: 8 },
  tabRow: { flexDirection: "row" },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", overflow: "hidden" },
  tabActive: { overflow: "hidden" },
  tabActiveLongTerm: { overflow: "hidden" },
  tabText: { fontSize: 14, fontWeight: "600" },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 80 },
  emptyTitle: { fontSize: 20, fontWeight: "700", marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 15, textAlign: "center" },
  sortButton: { marginBottom: 16 },
  sortButtonContent: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sortButtonLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  sortButtonText: { fontSize: 14 },
  sortButtonValue: { fontWeight: "600" },
  decksList: { gap: 16 },
  deckCard: { marginBottom: 0 },
  urgencyBadge: { position: "absolute", top: 16, right: 16, flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4, zIndex: 1 },
  urgencyText: { fontSize: 11, fontWeight: "700" },
  deckHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8, paddingRight: 80 },
  deckDot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  deckName: { fontSize: 18, fontWeight: "700", flex: 1 },
  cardCountRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  cardCountText: { fontSize: 14 },
  progressSection: { marginBottom: 14 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  progressLabel: { fontSize: 13, fontWeight: "500" },
  progressValue: { fontSize: 13, fontWeight: "700" },
  progressBar: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  statsRow: { flexDirection: "row", gap: 8 },
  statItem: { flex: 1, padding: 10, borderRadius: 12, alignItems: "center" },
  statDot: { width: 6, height: 6, borderRadius: 3, marginBottom: 4 },
  statLabel: { fontSize: 10, marginBottom: 2 },
  statValue: { fontSize: 16, fontWeight: "700" },
  testDateRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, borderRadius: 12, marginTop: 12 },
  testDateLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  testDateText: { fontSize: 13, fontWeight: "500" },
  testDateDays: { fontSize: 13, fontWeight: "700" },
  floatingShape: { position: "absolute", borderRadius: 100, opacity: 0.12 },
  shape1: { width: 180, height: 180, top: -60, right: -40 },
  shape2: { width: 120, height: 120, bottom: 200, left: -40 },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  modalContent: { padding: 20 },
  inputLabel: { fontSize: 13, fontWeight: "600", marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  modeRow: { flexDirection: "row", gap: 12 },
  modeOption: { flex: 1, padding: 16, borderRadius: 16, borderWidth: 2, alignItems: "center" },
  modeTitle: { fontSize: 15, fontWeight: "700", marginTop: 8, marginBottom: 4 },
  modeDesc: { fontSize: 11, textAlign: "center" },
  colorRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  colorOption: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  dateButton: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  datePickerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  datePickerTitle: { fontSize: 17, fontWeight: "600" },
  datePickerButton: { color: "#667eea", fontSize: 17 },
  datePickerContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 20 },
});
