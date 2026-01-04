import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Modal, TextInput, Alert, Platform, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useFlashcardStore } from "../state/flashcardStore";
import { RootStackParamList } from "../navigation/RootNavigator";
import { format, differenceInCalendarDays } from "date-fns";
import { useTheme } from "../utils/useTheme";
import { SortMenu } from "../components/SortMenu";
import { Card, Button } from "../components/ui";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { getMastery } from "../utils/spacedRepetition";
import { trackDeckCreated } from "../services/analytics";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type DeckSortOption = "testDate" | "name" | "progress";
type TabMode = "TEST_PREP" | "LONG_TERM";

const DECK_COLORS = ["#2563EB", "#7C3AED", "#EC4899", "#EA580C", "#059669", "#DC2626"];

export default function DecksListScreen() {
  const { colors, isDark } = useTheme();
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
    const getCardMastery = (c: typeof deckCards[0]) => isLongTerm ? getMastery(c) : (c.mastery || "LEARNING");
    const masteredCount = deckCards.filter((c) => getCardMastery(c) === "MASTERED").length;
    const masteredPct = deckCards.length > 0 ? Math.round((masteredCount / deckCards.length) * 100) : 0;
    const learningCount = deckCards.filter((c) => getCardMastery(c) === "LEARNING").length;
    const strugglingCount = deckCards.filter((c) => getCardMastery(c) === "STRUGGLING").length;
    const hasTest = deck.testDate && new Date(deck.testDate) > new Date();
    const daysLeft = deck.testDate ? differenceInCalendarDays(new Date(deck.testDate), new Date()) : null;

    return { ...deck, cardCount: deckCards.length, masteredPct, masteredCount, learningCount, strugglingCount, daysLeft, hasTest, isLongTerm };
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

  const handleCreateDeck = async () => {
    if (isCreating) return;
    if (!newDeckName.trim()) { Alert.alert("Error", "Deck name cannot be empty"); return; }
    if (deckMode === "TEST_PREP" && !testDate) { Alert.alert("Error", "Please set a test date"); return; }
    setIsCreating(true);
    try {
      const deckId = await addDeck(newDeckName.trim(), selectedColor, undefined, deckMode === "TEST_PREP" ? testDate : undefined, deckMode);
      
      // Track deck creation
      trackDeckCreated(deckId, deckMode === "TEST_PREP" && !!testDate);
      
      setNewDeckName(""); 
      setSelectedColor(DECK_COLORS[0]); 
      setDeckMode("TEST_PREP"); 
      setTestDate(defaultTestDate); 
      setPickerDate(defaultTestDate);
      setShowCreateModal(false);
      navigation.navigate("Deck", { deckId });
    } catch (error) { 
      console.error(error); 
      Alert.alert("Error", "Failed to create deck"); 
    } finally { 
      setIsCreating(false); 
    }
  };

  const handleDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) {
      setPickerDate(selectedDate);
      if (Platform.OS === "android") {
        setTestDate(selectedDate);
        setShowDatePicker(false);
      }
    }
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Decks</Text>
          <Pressable 
            onPress={() => setShowCreateModal(true)} 
            style={[styles.addButton, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <View style={[styles.tabBackground, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Pressable 
              onPress={() => setActiveTab("TEST_PREP")} 
              style={[styles.tab, activeTab === "TEST_PREP" && { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.tabText, { color: activeTab === "TEST_PREP" ? "#FFFFFF" : colors.textSecondary }]}>
                Test Prep
              </Text>
            </Pressable>
            <Pressable 
              onPress={() => setActiveTab("LONG_TERM")} 
              style={[styles.tab, activeTab === "LONG_TERM" && { backgroundColor: colors.success }]}
            >
              <Text style={[styles.tabText, { color: activeTab === "LONG_TERM" ? "#FFFFFF" : colors.textSecondary }]}>
                Long-Term
              </Text>
            </Pressable>
          </View>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {sortedDecks.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIcon, { backgroundColor: colors.surface }]}>
                  <Ionicons name="albums-outline" size={48} color={colors.textSecondary} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {activeTab === "TEST_PREP" ? "No Test Prep Decks" : "No Long-Term Decks"}
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  {activeTab === "TEST_PREP" 
                    ? "Create a deck to prepare for your tests" 
                    : "Convert test prep decks after your exam"}
                </Text>
                <Button
                  title="Create Deck"
                  onPress={() => setShowCreateModal(true)}
                  size="medium"
                  fullWidth={false}
                  style={{ marginTop: 16 }}
                />
              </View>
            ) : (
              <>
                {/* Sort Button */}
                <Pressable onPress={() => setShowSortMenu(true)} style={styles.sortRow}>
                  <Ionicons name="funnel-outline" size={16} color={colors.textSecondary} />
                  <Text style={[styles.sortText, { color: colors.textSecondary }]}>
                    Sort by: <Text style={{ color: colors.text, fontWeight: "600" }}>
                      {sortBy === "testDate" ? "Date" : sortBy === "name" ? "Name" : "Progress"}
                    </Text>
                  </Text>
                </Pressable>

                {/* Deck Cards */}
                <View style={styles.decksList}>
                  {sortedDecks.map((deck) => {
                    const urgencyColor = deck.daysLeft !== null && deck.daysLeft <= 3 
                      ? colors.error 
                      : deck.daysLeft !== null && deck.daysLeft <= 7 
                        ? colors.warning 
                        : colors.primary;

                    return (
                      <Card 
                        key={deck.id} 
                        variant="outlined" 
                        onPress={() => navigation.navigate("Deck", { deckId: deck.id })}
                      >
                        {/* Header Row */}
                        <View style={styles.deckHeader}>
                          <View style={[styles.deckDot, { backgroundColor: deck.color }]} />
                          <Text style={[styles.deckName, { color: colors.text }]} numberOfLines={1}>
                            {deck.name}
                          </Text>
                          {deck.hasTest && deck.daysLeft !== null && (
                            <View style={[styles.daysTag, { backgroundColor: `${urgencyColor}15` }]}>
                              <Text style={[styles.daysTagText, { color: urgencyColor }]}>
                                {deck.daysLeft === 0 ? "Today" : deck.daysLeft === 1 ? "1d" : `${deck.daysLeft}d`}
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Card count & Progress */}
                        <View style={styles.deckMeta}>
                          <Text style={[styles.cardCount, { color: colors.textSecondary }]}>
                            {deck.cardCount} cards
                          </Text>
                          <View style={styles.progressContainer}>
                            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                              <View 
                                style={[
                                  styles.progressFill, 
                                  { 
                                    width: `${deck.masteredPct}%`, 
                                    backgroundColor: deck.masteredPct >= 80 ? colors.success : colors.primary 
                                  }
                                ]} 
                              />
                            </View>
                            <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                              {deck.masteredPct}%
                            </Text>
                          </View>
                        </View>

                        {/* Test Date */}
                        {deck.testDate && (
                          <View style={styles.testDateRow}>
                            <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                            <Text style={[styles.testDateText, { color: colors.textSecondary }]}>
                              {format(new Date(deck.testDate), "MMM d, yyyy")}
                            </Text>
                          </View>
                        )}
                      </Card>
                    );
                  })}
                </View>
              </>
            )}
            <View style={{ height: 32 }} />
          </View>
        </ScrollView>
      </SafeAreaView>

      <SortMenu 
        visible={showSortMenu} 
        onClose={() => setShowSortMenu(false)} 
        options={[
          { value: "testDate", label: "Test Date" }, 
          { value: "progress", label: "Progress" }, 
          { value: "name", label: "Name" }
        ]} 
        selectedValue={sortBy} 
        onSelect={(v) => setSortBy(v as DeckSortOption)} 
      />

      {/* Create Modal */}
      <Modal visible={showCreateModal} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowCreateModal(false)}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowCreateModal(false)}>
              <Text style={[styles.modalCancel, { color: colors.primary }]}>Cancel</Text>
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New Deck</Text>
            <Pressable onPress={handleCreateDeck} disabled={isCreating}>
              <Text style={[styles.modalCreate, { color: isCreating ? colors.textSecondary : colors.primary }]}>
                {isCreating ? "..." : "Create"}
              </Text>
            </Pressable>
          </View>
          
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Name</Text>
            <TextInput 
              value={newDeckName} 
              onChangeText={setNewDeckName} 
              placeholder="e.g., Biology Chapter 3" 
              placeholderTextColor={colors.textSecondary} 
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} 
              autoFocus 
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Mode</Text>
            <View style={styles.modeRow}>
              <Pressable 
                onPress={() => setDeckMode("TEST_PREP")} 
                style={[
                  styles.modeOption, 
                  { 
                    backgroundColor: deckMode === "TEST_PREP" ? colors.primaryLight : colors.surface, 
                    borderColor: deckMode === "TEST_PREP" ? colors.primary : colors.border 
                  }
                ]}
              >
                <Ionicons name="calendar-outline" size={20} color={deckMode === "TEST_PREP" ? colors.primary : colors.textSecondary} />
                <Text style={[styles.modeLabel, { color: deckMode === "TEST_PREP" ? colors.primary : colors.text }]}>
                  Test Prep
                </Text>
              </Pressable>
              <Pressable 
                onPress={() => setDeckMode("LONG_TERM")} 
                style={[
                  styles.modeOption, 
                  { 
                    backgroundColor: deckMode === "LONG_TERM" ? colors.successLight : colors.surface, 
                    borderColor: deckMode === "LONG_TERM" ? colors.success : colors.border 
                  }
                ]}
              >
                <Ionicons name="repeat-outline" size={20} color={deckMode === "LONG_TERM" ? colors.success : colors.textSecondary} />
                <Text style={[styles.modeLabel, { color: deckMode === "LONG_TERM" ? colors.success : colors.text }]}>
                  Long-Term
                </Text>
              </Pressable>
            </View>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Color</Text>
            <View style={styles.colorRow}>
              {DECK_COLORS.map((c) => (
                <Pressable 
                  key={c} 
                  onPress={() => setSelectedColor(c)} 
                  style={[
                    styles.colorOption, 
                    { backgroundColor: c, borderWidth: selectedColor === c ? 3 : 0, borderColor: colors.text }
                  ]}
                >
                  {selectedColor === c && <Ionicons name="checkmark" size={20} color="#fff" />}
                </Pressable>
              ))}
            </View>

            {deckMode === "TEST_PREP" && (
              <>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Test Date</Text>
                <Pressable 
                  onPress={() => setShowDatePicker(true)} 
                  style={[styles.dateButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <Text style={[styles.dateButtonText, { color: colors.text }]}>
                    {testDate ? format(testDate, "MMM d, yyyy") : "Select date"}
                  </Text>
                  <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
                </Pressable>
              </>
            )}
          </ScrollView>

          {/* Date Picker - iOS */}
          {Platform.OS === 'ios' && showDatePicker && (
            <View style={[styles.datePickerOverlay, { backgroundColor: colors.background }]}>
              <View style={[styles.datePickerHeader, { borderBottomColor: colors.border }]}>
                <Pressable onPress={() => setShowDatePicker(false)}>
                  <Text style={[styles.modalCancel, { color: colors.primary }]}>Cancel</Text>
                </Pressable>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Test Date</Text>
                <Pressable onPress={() => { setTestDate(pickerDate); setShowDatePicker(false); }}>
                  <Text style={[styles.modalCreate, { color: colors.primary }]}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker 
                value={pickerDate} 
                mode="date" 
                display="spinner" 
                onChange={handleDateChange} 
                minimumDate={new Date()} 
                themeVariant={isDark ? "dark" : "light"}
                style={{ width: '100%' }}
              />
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
  header: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between", 
    paddingHorizontal: 20, 
    paddingTop: 16, 
    paddingBottom: 12 
  },
  headerTitle: { fontSize: 28, fontWeight: "700", letterSpacing: -0.5 },
  addButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 8, 
    alignItems: "center", 
    justifyContent: "center" 
  },
  tabContainer: { paddingHorizontal: 20, marginBottom: 16 },
  tabBackground: { 
    flexDirection: "row", 
    borderRadius: 8, 
    padding: 4, 
    borderWidth: 1 
  },
  tab: { 
    flex: 1, 
    paddingVertical: 8, 
    borderRadius: 6, 
    alignItems: "center" 
  },
  tabText: { fontSize: 14, fontWeight: "600" },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 4 },
  emptyState: { 
    alignItems: "center", 
    justifyContent: "center", 
    paddingVertical: 60 
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: "center", paddingHorizontal: 40 },
  sortRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 6, 
    marginBottom: 16 
  },
  sortText: { fontSize: 13 },
  decksList: { gap: 12 },
  deckHeader: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: 10 
  },
  deckDot: { 
    width: 10, 
    height: 10, 
    borderRadius: 5, 
    marginRight: 10 
  },
  deckName: { 
    fontSize: 16, 
    fontWeight: "600", 
    flex: 1 
  },
  daysTag: { 
    paddingHorizontal: 8, 
    paddingVertical: 3, 
    borderRadius: 4 
  },
  daysTagText: { 
    fontSize: 12, 
    fontWeight: "600" 
  },
  deckMeta: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cardCount: { fontSize: 13 },
  progressContainer: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 8 
  },
  progressBar: { 
    width: 80, 
    height: 4, 
    borderRadius: 2, 
    overflow: "hidden" 
  },
  progressFill: { 
    height: "100%", 
    borderRadius: 2 
  },
  progressText: { 
    fontSize: 12, 
    fontWeight: "500",
    width: 32,
    textAlign: "right",
  },
  testDateRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 6 
  },
  testDateText: { fontSize: 13 },
  modalContainer: { flex: 1 },
  modalHeader: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between", 
    paddingHorizontal: 20, 
    paddingVertical: 16, 
    borderBottomWidth: 1 
  },
  modalTitle: { fontSize: 17, fontWeight: "600" },
  modalCancel: { fontSize: 16 },
  modalCreate: { fontSize: 16, fontWeight: "600" },
  modalContent: { padding: 20 },
  inputLabel: { fontSize: 13, fontWeight: "500", marginBottom: 8, marginTop: 16 },
  input: { 
    borderWidth: 1, 
    borderRadius: 8, 
    paddingHorizontal: 14, 
    paddingVertical: 12, 
    fontSize: 16 
  },
  modeRow: { flexDirection: "row", gap: 12 },
  modeOption: { 
    flex: 1, 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center",
    padding: 14, 
    borderRadius: 8, 
    borderWidth: 1, 
    gap: 8 
  },
  modeLabel: { fontSize: 14, fontWeight: "600" },
  colorRow: { flexDirection: "row", gap: 12 },
  colorOption: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    alignItems: "center", 
    justifyContent: "center" 
  },
  dateButton: { 
    borderWidth: 1, 
    borderRadius: 8, 
    paddingHorizontal: 14, 
    paddingVertical: 12, 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between" 
  },
  dateButtonText: { fontSize: 16 },
  datePickerOverlay: { 
    ...StyleSheet.absoluteFillObject, 
    zIndex: 100 
  },
  datePickerHeader: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    paddingHorizontal: 20, 
    paddingVertical: 16, 
    borderBottomWidth: 1 
  },
});
