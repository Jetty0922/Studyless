import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Modal, TextInput, Alert, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useFlashcardStore } from "../state/flashcardStore";
import { RootStackParamList } from "../navigation/RootNavigator";
import { format, differenceInDays } from "date-fns";
import { useTheme } from "../utils/useTheme";
import { SortMenu } from "../components/SortMenu";
import DateTimePicker from "@react-native-community/datetimepicker";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type DeckSortOption = "testDate" | "name" | "progress";
type TabMode = "TEST_PREP" | "LONG_TERM";

const DECK_COLORS = [
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#f97316", // orange
  "#10b981", // green
  "#ef4444", // red
];

export default function DecksListScreen() {
  const { colors } = useTheme();
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
  const [testDate, setTestDate] = useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Get deck stats with urgency calculation
  const deckStats = decks.map((deck) => {
    const deckCards = flashcards.filter((card) => card.deckId === deck.id);

    const masteredCount = deckCards.filter(
      (c) => c.mastery === "MASTERED"
    ).length;
    const masteredPct = deckCards.length > 0
      ? Math.round((masteredCount / deckCards.length) * 100)
      : 0;

    const learningCount = deckCards.filter(
      (c) => c.mastery === "LEARNING"
    ).length;

    const strugglingCount = deckCards.filter(
      (c) => c.mastery === "STRUGGLING"
    ).length;

    const hasTest = deck.testDate && new Date(deck.testDate) > new Date();
    const testPassed = deck.testDate && new Date(deck.testDate) < new Date();
    const isLongTerm = deck.mode === "LONG_TERM";
    const isArchived = deck.status === "completed";
    const daysLeft = deck.testDate
      ? differenceInDays(new Date(deck.testDate), new Date())
      : null;

    // Determine urgency level based on days left
    let urgencyLevel: "critical" | "warning" | "normal" | "none" = "none";
    let urgencyColor = colors.border;
    let urgencyBg = colors.background;
    let urgencyText = colors.textSecondary;

    if (hasTest && daysLeft !== null) {
      if (daysLeft <= 3) {
        urgencyLevel = "critical";
        urgencyColor = "#ef4444"; // Red
        urgencyBg = "#fee2e2"; // Red light
        urgencyText = "#991b1b"; // Red dark
      } else if (daysLeft <= 7) {
        urgencyLevel = "warning";
        urgencyColor = "#f97316"; // Orange
        urgencyBg = "#ffedd5"; // Orange light
        urgencyText = "#9a3412"; // Orange dark
      } else {
        urgencyLevel = "normal";
        urgencyColor = colors.primary;
        urgencyBg = colors.primaryLight;
        urgencyText = colors.primary;
      }
    }

    return {
      ...deck,
      cardCount: deckCards.length,
      masteredPct,
      masteredCount,
      learningCount,
      strugglingCount,
      daysLeft,
      hasTest,
      testPassed,
      isLongTerm,
      isArchived,
      urgencyLevel,
      urgencyColor,
      urgencyBg,
      urgencyText,
    };
  });

  // Filter decks by active tab
  const filteredDecks = deckStats.filter((deck) => deck.mode === activeTab);

  // Sort decks based on selected option
  const sortedDecks = [...filteredDecks].sort((a, b) => {
    if (sortBy === "testDate") {
      // Decks with no test date go to the end
      if (!a.hasTest && !b.hasTest) return 0;
      if (!a.hasTest) return 1;
      if (!b.hasTest) return -1;
      // Sort by days left (soonest first)
      return (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity);
    } else if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    } else if (sortBy === "progress") {
      return b.masteredPct - a.masteredPct;
    } else {
      // createdDate - Since we don't have a createdAt field, sort by name as fallback
      return a.name.localeCompare(b.name);
    }
  });

  const getSortLabel = () => {
    if (sortBy === "testDate") return "Test Date";
    if (sortBy === "name") return "Name (A-Z)";
    if (sortBy === "progress") return "Progress";
    return "Test Date";
  };

  const handleCreateDeck = () => {
    if (!newDeckName.trim()) {
      Alert.alert("Error", "Deck name cannot be empty");
      return;
    }
    if (deckMode === "TEST_PREP" && !testDate) {
      Alert.alert("Error", "Please set a test date (even if it's just a guess)");
      return;
    }
    const deckId = addDeck(
      newDeckName.trim(),
      selectedColor,
      undefined,
      deckMode === "TEST_PREP" ? testDate : undefined,
      deckMode
    );
    setNewDeckName("");
    setSelectedColor(DECK_COLORS[0]);
    setDeckMode("TEST_PREP");
    setTestDate(undefined);
    setShowCreateModal(false);
    navigation.navigate("Deck", { deckId });
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setTestDate(selectedDate);
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }} edges={["top"]}>
      <View className="flex-1">
        {/* Header */}
        <View className="px-6 pt-6 pb-4 border-b flex-row items-center justify-between" style={{ backgroundColor: colors.surface, borderBottomColor: colors.border }}>
          <Text className="text-3xl font-bold" style={{ color: colors.text }}>Decks</Text>
          <Pressable
            onPress={() => setShowCreateModal(true)}
            className="w-11 h-11 rounded-full items-center justify-center active:opacity-70"
            style={{ backgroundColor: colors.primary }}
          >
            <Ionicons name="add" size={28} color="white" />
          </Pressable>
        </View>

        {/* Tab Navigation */}
        <View className="px-6 pt-4 pb-2" style={{ backgroundColor: colors.surface }}>
          <View className="flex-row rounded-xl p-1" style={{ backgroundColor: colors.background }}>
            <Pressable
              onPress={() => setActiveTab("TEST_PREP")}
              className="flex-1 rounded-lg py-2.5 active:opacity-70"
              style={{
                backgroundColor: activeTab === "TEST_PREP" ? colors.primary : "transparent",
              }}
            >
              <Text
                className="text-center text-sm font-semibold"
                style={{ color: activeTab === "TEST_PREP" ? "white" : colors.textSecondary }}
              >
                Test Preparation
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab("LONG_TERM")}
              className="flex-1 rounded-lg py-2.5 active:opacity-70"
              style={{
                backgroundColor: activeTab === "LONG_TERM" ? "#10b981" : "transparent",
              }}
            >
              <Text
                className="text-center text-sm font-semibold"
                style={{ color: activeTab === "LONG_TERM" ? "white" : colors.textSecondary }}
              >
                Long-Term Memory
              </Text>
            </Pressable>
          </View>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-6 py-6">
            {sortedDecks.length === 0 ? (
              <View className="items-center justify-center py-20">
                <Ionicons name="albums-outline" size={64} color={colors.textSecondary} />
                <Text className="text-xl font-semibold mt-4 mb-2" style={{ color: colors.text }}>
                  {activeTab === "TEST_PREP" ? "No Test Prep Decks" : "No Long-Term Decks"}
                </Text>
                <Text className="text-center" style={{ color: colors.textSecondary }}>
                  {activeTab === "TEST_PREP"
                    ? "Create a deck to prepare for your upcoming tests"
                    : "Convert test prep decks to long-term memory mode"}
                </Text>
              </View>
            ) : (
              <>
                {/* Sort Button */}
                <Pressable
                  onPress={() => setShowSortMenu(true)}
                  className="flex-row items-center justify-between rounded-xl p-3 mb-4 border active:opacity-70"
                  style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                >
                  <View className="flex-row items-center">
                    <Ionicons name="funnel-outline" size={18} color={colors.textSecondary} />
                    <Text className="text-sm ml-2" style={{ color: colors.text }}>
                      Sort by: <Text className="font-semibold">{getSortLabel()}</Text>
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                </Pressable>

                {/* Decks List */}
                <View className="gap-4">
                  {sortedDecks.map((deck) => (
                    <Pressable
                      key={deck.id}
                      onPress={() => navigation.navigate("Deck", { deckId: deck.id })}
                      className="rounded-3xl p-5 active:opacity-70"
                      style={{
                        backgroundColor: colors.surface,
                      }}
                    >
                      {/* Status Badges */}
                      {(deck.testPassed || deck.isLongTerm || deck.isArchived) && !deck.hasTest && (
                        <View className="absolute top-3 right-3 flex-row gap-2">
                          {deck.isLongTerm && (
                            <View
                              className="px-3 py-1 rounded-full flex-row items-center"
                              style={{ backgroundColor: "#d1fae5" }}
                            >
                              <Ionicons name="repeat" size={12} color="#10b981" />
                              <Text className="text-xs font-bold ml-1" style={{ color: "#10b981" }}>
                                LONG-TERM
                              </Text>
                            </View>
                          )}
                          {deck.testPassed && !deck.isLongTerm && !deck.isArchived && (
                            <View
                              className="px-3 py-1 rounded-full flex-row items-center"
                              style={{ backgroundColor: "#dbeafe" }}
                            >
                              <Ionicons name="checkmark-circle" size={12} color="#3b82f6" />
                              <Text className="text-xs font-bold ml-1" style={{ color: "#3b82f6" }}>
                                TEST PASSED
                              </Text>
                            </View>
                          )}
                          {deck.isArchived && (
                            <View
                              className="px-3 py-1 rounded-full flex-row items-center"
                              style={{ backgroundColor: colors.border }}
                            >
                              <Ionicons name="archive" size={12} color={colors.textSecondary} />
                              <Text className="text-xs font-bold ml-1" style={{ color: colors.textSecondary }}>
                                ARCHIVED
                              </Text>
                            </View>
                          )}
                        </View>
                      )}

                      {/* Urgency Badge - Only show if test is upcoming */}
                      {deck.hasTest && deck.urgencyLevel !== "none" && (
                        <View
                          className="absolute top-3 right-3 px-3 py-1 rounded-full flex-row items-center"
                          style={{ backgroundColor: deck.urgencyBg }}
                        >
                          <Ionicons
                            name={deck.urgencyLevel === "critical" ? "alert-circle" : "time-outline"}
                            size={14}
                            color={deck.urgencyText}
                          />
                          <Text
                            className="text-xs font-bold ml-1"
                            style={{ color: deck.urgencyText }}
                          >
                            {deck.daysLeft === 0
                              ? "TODAY"
                              : deck.daysLeft === 1
                              ? "TOMORROW"
                              : `${deck.daysLeft}d left`}
                          </Text>
                        </View>
                      )}

                      {/* Deck Header */}
                      <View className="flex-row items-center mb-3" style={{ paddingRight: deck.hasTest ? 80 : 0 }}>
                        <View
                          className="w-4 h-4 rounded-full mr-3"
                          style={{ backgroundColor: deck.color }}
                        />
                        <Text className="font-bold text-xl flex-1" style={{ color: colors.text }}>
                          {deck.name}
                        </Text>
                      </View>

                      {/* Card Count */}
                      <View className="flex-row items-center mb-3">
                        <Ionicons name="file-tray-full-outline" size={18} color={colors.textSecondary} />
                        <Text className="text-base ml-2" style={{ color: colors.textSecondary }}>
                          {deck.cardCount} {deck.cardCount === 1 ? "card" : "cards"}
                        </Text>
                      </View>

                      {/* Mastery Progress */}
                      <View className="mb-3">
                        <View className="flex-row justify-between mb-2">
                          <Text className="text-sm font-medium" style={{ color: colors.textSecondary }}>
                            Mastery Progress
                          </Text>
                          <Text className="text-sm font-bold" style={{ color: colors.text }}>
                            {deck.masteredPct}%
                          </Text>
                        </View>
                        <View className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: colors.border }}>
                          <View
                            className="h-full rounded-full"
                            style={{
                              width: `${deck.masteredPct}%`,
                              backgroundColor: deck.masteredPct >= 80 ? "#10b981" : deck.masteredPct >= 50 ? colors.primary : "#f97316"
                            }}
                          />
                        </View>
                      </View>

                      {/* Card Breakdown */}
                      <View className="flex-row gap-2">
                        <View className="flex-1 rounded-xl p-3" style={{ backgroundColor: colors.background }}>
                          <View className="flex-row items-center mb-1">
                            <View className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: "#10b981" }} />
                            <Text className="text-xs" style={{ color: colors.textSecondary }}>
                              Mastered
                            </Text>
                          </View>
                          <Text className="text-lg font-bold" style={{ color: "#10b981" }}>
                            {deck.masteredCount}
                          </Text>
                        </View>
                        <View className="flex-1 rounded-xl p-3" style={{ backgroundColor: colors.background }}>
                          <View className="flex-row items-center mb-1">
                            <View className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: colors.primary }} />
                            <Text className="text-xs" style={{ color: colors.textSecondary }}>
                              Learning
                            </Text>
                          </View>
                          <Text className="text-lg font-bold" style={{ color: colors.primary }}>
                            {deck.learningCount}
                          </Text>
                        </View>
                        <View className="flex-1 rounded-xl p-3" style={{ backgroundColor: colors.background }}>
                          <View className="flex-row items-center mb-1">
                            <View className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: "#f97316" }} />
                            <Text className="text-xs" style={{ color: colors.textSecondary }}>
                              Struggling
                            </Text>
                          </View>
                          <Text className="text-lg font-bold" style={{ color: "#f97316" }}>
                            {deck.strugglingCount}
                          </Text>
                        </View>
                      </View>

                      {/* Test Date Info */}
                      {deck.testDate && (
                        <View
                          className="rounded-xl p-3 flex-row items-center justify-between mt-3"
                          style={{ backgroundColor: deck.urgencyBg }}
                        >
                          <View className="flex-row items-center">
                            <Ionicons name="calendar-outline" size={16} color={deck.urgencyText} />
                            <Text className="text-sm font-medium ml-2" style={{ color: deck.urgencyText }}>
                              Test: {format(new Date(deck.testDate), "MMM d, yyyy")}
                            </Text>
                          </View>
                          {deck.hasTest && (
                            <Text className="text-sm font-bold" style={{ color: deck.urgencyText }}>
                              {deck.daysLeft === 0
                                ? "Today"
                                : deck.daysLeft === 1
                                ? "Tomorrow"
                                : `${deck.daysLeft} days`}
                            </Text>
                          )}
                        </View>
                      )}
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            <View className="h-8" />
          </View>
        </ScrollView>
      </View>

      {/* Sort Menu */}
      <SortMenu
        visible={showSortMenu}
        onClose={() => setShowSortMenu(false)}
        options={[
          { value: "testDate", label: "Test Date (Soonest First)" },
          { value: "progress", label: "Progress (High to Low)" },
          { value: "name", label: "Name (A-Z)" },
        ]}
        selectedValue={sortBy}
        onSelect={(value) => setSortBy(value as DeckSortOption)}
      />

      {/* Create Deck Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <SafeAreaView className="flex-1" style={{ backgroundColor: colors.surface }} edges={["top"]}>
          <View className="flex-1">
            <View className="flex-row items-center justify-between px-5 py-4 border-b" style={{ borderBottomColor: colors.border }}>
              <Pressable onPress={() => setShowCreateModal(false)} className="active:opacity-70">
                <Text className="text-lg" style={{ color: colors.primary }}>Cancel</Text>
              </Pressable>
              <Text className="text-xl font-bold" style={{ color: colors.text }}>New Deck</Text>
              <Pressable onPress={handleCreateDeck} className="active:opacity-70">
                <Text className="text-lg font-semibold" style={{ color: colors.primary }}>Create</Text>
              </Pressable>
            </View>

            <View className="px-5 py-6">
              <Text className="text-sm font-semibold mb-2" style={{ color: colors.textSecondary }}>
                Deck Name
              </Text>
              <TextInput
                value={newDeckName}
                onChangeText={setNewDeckName}
                placeholder="e.g., Biology Chapter 3"
                className="border rounded-xl px-4 py-3.5 text-base mb-6"
                style={{
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.text
                }}
                placeholderTextColor={colors.textSecondary}
                autoFocus
              />

              <Text className="text-sm font-semibold mb-3" style={{ color: colors.textSecondary }}>
                Study Mode
              </Text>
              <View className="flex-row gap-3 mb-6">
                <Pressable
                  onPress={() => setDeckMode("TEST_PREP")}
                  className="flex-1 rounded-xl p-4 border-2 active:opacity-70"
                  style={{
                    backgroundColor: deckMode === "TEST_PREP" ? colors.primaryLight : colors.background,
                    borderColor: deckMode === "TEST_PREP" ? colors.primary : colors.border,
                  }}
                >
                  <View className="flex-row items-center justify-center mb-2">
                    <Ionicons
                      name="calendar"
                      size={24}
                      color={deckMode === "TEST_PREP" ? colors.primary : colors.textSecondary}
                    />
                  </View>
                  <Text
                    className="text-base font-bold text-center mb-1"
                    style={{ color: deckMode === "TEST_PREP" ? colors.primary : colors.text }}
                  >
                    Test Prep
                  </Text>
                  <Text
                    className="text-xs text-center leading-4"
                    style={{ color: colors.textSecondary }}
                  >
                    Intensive review schedule based on test date. Final review day before exam.
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setDeckMode("LONG_TERM")}
                  className="flex-1 rounded-xl p-4 border-2 active:opacity-70"
                  style={{
                    backgroundColor: deckMode === "LONG_TERM" ? "#d1fae5" : colors.background,
                    borderColor: deckMode === "LONG_TERM" ? "#10b981" : colors.border,
                  }}
                >
                  <View className="flex-row items-center justify-center mb-2">
                    <Ionicons
                      name="repeat"
                      size={24}
                      color={deckMode === "LONG_TERM" ? "#10b981" : colors.textSecondary}
                    />
                  </View>
                  <Text
                    className="text-base font-bold text-center mb-1"
                    style={{ color: deckMode === "LONG_TERM" ? "#10b981" : colors.text }}
                  >
                    Long-Term
                  </Text>
                  <Text
                    className="text-xs text-center leading-4"
                    style={{ color: colors.textSecondary }}
                  >
                    Scientific spaced repetition for permanent memory retention.
                  </Text>
                </Pressable>
              </View>

              {/* Mode Description */}
              {deckMode === "TEST_PREP" && (
                <View className="mb-6 p-4 rounded-xl" style={{ backgroundColor: "#dbeafe" }}>
                  <View className="flex-row items-start mb-2">
                    <Ionicons name="information-circle" size={18} color="#2563eb" style={{ marginRight: 6, marginTop: 2 }} />
                    <Text className="text-sm font-semibold flex-1" style={{ color: "#2563eb" }}>
                      Test Prep Mode
                    </Text>
                  </View>
                  <Text className="text-xs leading-5" style={{ color: "#1e3a8a" }}>
                    • Smart review schedule based on days until test{'\n'}
                    • Tracks struggling cards with special attention{'\n'}
                    • Final review day before exam{'\n'}
                    • Emergency mode on test day{'\n'}
                    • Converts to long-term mode after exam
                  </Text>
                </View>
              )}

              {deckMode === "LONG_TERM" && (
                <View className="mb-6 p-4 rounded-xl" style={{ backgroundColor: "#d1fae5" }}>
                  <View className="flex-row items-start mb-2">
                    <Ionicons name="information-circle" size={18} color="#10b981" style={{ marginRight: 6, marginTop: 2 }} />
                    <Text className="text-sm font-semibold flex-1" style={{ color: "#10b981" }}>
                      Long-Term Mode
                    </Text>
                  </View>
                  <Text className="text-xs leading-5" style={{ color: "#064e3b" }}>
                    • Uses FSRS algorithm (scientifically proven){'\n'}
                    • Adapts to your memory performance{'\n'}
                    • Optimizes for 90% retention{'\n'}
                    • Perfect for building permanent knowledge{'\n'}
                    • No test date required
                  </Text>
                </View>
              )}

              <Text className="text-sm font-semibold mb-3" style={{ color: colors.textSecondary }}>
                Deck Color
              </Text>
              <View className="flex-row flex-wrap gap-3 mb-6">
                {DECK_COLORS.map((color) => (
                  <Pressable
                    key={color}
                    onPress={() => setSelectedColor(color)}
                    className="w-14 h-14 rounded-full items-center justify-center active:opacity-70"
                    style={{
                      backgroundColor: color,
                      borderWidth: selectedColor === color ? 3 : 0,
                      borderColor: colors.text,
                    }}
                  >
                    {selectedColor === color && (
                      <Ionicons name="checkmark" size={28} color="white" />
                    )}
                  </Pressable>
                ))}
              </View>

              {deckMode === "TEST_PREP" && (
                <>
                  <Text className="text-sm font-semibold mb-2" style={{ color: colors.text }}>
                    Test Date *
                  </Text>
                  <Text className="text-xs mb-3" style={{ color: colors.textSecondary }}>
                    Enter a test date or your best guess to help schedule reviews
                  </Text>
                  <Pressable
                    onPress={() => setShowDatePicker(true)}
                    className="rounded-xl px-4 py-3.5 border flex-row items-center justify-between"
                    style={{
                      backgroundColor: colors.background,
                      borderColor: colors.border
                    }}
                  >
                    <Text style={{ color: testDate ? colors.text : colors.textSecondary }}>
                      {testDate ? format(testDate, "MMM d, yyyy") : "Tap to set test date"}
                    </Text>
                    <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                  </Pressable>
                </>
              )}

              {/* Date Picker Modal */}
              {showDatePicker && Platform.OS === "ios" && (
                <Modal
                  visible={showDatePicker}
                  animationType="slide"
                  presentationStyle="formSheet"
                  onRequestClose={() => setShowDatePicker(false)}
                >
                  <SafeAreaView className="flex-1" style={{ backgroundColor: colors.surface }} edges={["top"]}>
                    <View className="flex-1">
                      <View className="flex-row items-center justify-between px-5 py-4 border-b" style={{ borderBottomColor: colors.border }}>
                        <Pressable onPress={() => setShowDatePicker(false)} className="active:opacity-70">
                          <Text className="text-lg" style={{ color: colors.primary }}>Cancel</Text>
                        </Pressable>
                        <Text className="text-xl font-bold" style={{ color: colors.text }}>Select Test Date</Text>
                        <Pressable onPress={() => setShowDatePicker(false)} className="active:opacity-70">
                          <Text className="text-lg font-semibold" style={{ color: colors.primary }}>Done</Text>
                        </Pressable>
                      </View>
                      <View className="flex-1 items-center justify-center">
                        <DateTimePicker
                          value={testDate || new Date()}
                          mode="date"
                          display="spinner"
                          onChange={handleDateChange}
                          minimumDate={new Date()}
                        />
                      </View>
                    </View>
                  </SafeAreaView>
                </Modal>
              )}

              {showDatePicker && Platform.OS === "android" && (
                <DateTimePicker
                  value={testDate || new Date()}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                />
              )}
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Date Picker Modal */}
      {showDatePicker && Platform.OS === "ios" && (
        <Modal
          visible={showDatePicker}
          animationType="slide"
          presentationStyle="formSheet"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <SafeAreaView className="flex-1" style={{ backgroundColor: colors.surface }} edges={["top"]}>
            <View className="flex-1">
              <View className="flex-row items-center justify-between px-5 py-4 border-b" style={{ borderBottomColor: colors.border }}>
                <Pressable onPress={() => setShowDatePicker(false)} className="active:opacity-70">
                  <Text className="text-lg" style={{ color: colors.primary }}>Cancel</Text>
                </Pressable>
                <Text className="text-xl font-bold" style={{ color: colors.text }}>Select Test Date</Text>
                <Pressable onPress={() => setShowDatePicker(false)} className="active:opacity-70">
                  <Text className="text-lg font-semibold" style={{ color: colors.primary }}>Done</Text>
                </Pressable>
              </View>
              <View className="flex-1 items-center justify-center">
                <DateTimePicker
                  value={testDate || new Date()}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                />
              </View>
            </View>
          </SafeAreaView>
        </Modal>
      )}

      {showDatePicker && Platform.OS === "android" && (
        <DateTimePicker
          value={testDate || new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}
    </SafeAreaView>
  );
}
