import React, { useState, useMemo } from "react";
import { View, Text, Pressable, ScrollView, Alert, TextInput, Modal, Keyboard, TouchableWithoutFeedback, StyleSheet } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useFlashcardStore } from "../state/flashcardStore";
import { RootStackParamList } from "../navigation/RootNavigator";
import { differenceInCalendarDays, format } from "date-fns";
import { SortMenu } from "../components/SortMenu";
import { useTheme } from "../utils/useTheme";
import { Card } from "../components/ui";
import { getDueCards, isTestDay as checkIsTestDay } from "../utils/spacedRepetition";
import { useSettingsStore } from "../state/settingsStore";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type DeckRouteProp = RouteProp<RootStackParamList, "Deck">;

export default function DeckScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<DeckRouteProp>();
  const { deckId } = route.params;

  const decks = useFlashcardStore((s) => s.decks);
  const flashcards = useFlashcardStore((s) => s.flashcards);
  const addFlashcard = useFlashcardStore((s) => s.addFlashcard);
  const updateFlashcard = useFlashcardStore((s) => s.updateFlashcard);
  const deleteFlashcard = useFlashcardStore((s) => s.deleteFlashcard);
  const convertToLongTerm = useFlashcardStore((s) => s.convertToLongTerm);

  const { colors, isDark } = useTheme();

  const deck = decks.find((d) => d.id === deckId);
  const deckCards = flashcards.filter((card) => card.deckId === deckId);

  const [sortBy, setSortBy] = useState<"date" | "mastery" | "question">("date");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [justCreatedCard, setJustCreatedCard] = useState(false);

  React.useLayoutEffect(() => {
    if (deck) {
      navigation.setOptions({
        title: deck.name,
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerRight: () => (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            {!selectionMode && (
              <Pressable onPress={() => setSelectionMode(true)} style={{ marginRight: 4 }}>
                <Ionicons name="checkbox-outline" size={24} color={colors.primary} />
              </Pressable>
            )}
            <Pressable onPress={() => navigation.navigate("DeckSettings", { deckId })} style={{ marginRight: 8 }}>
              <Ionicons name="ellipsis-vertical" size={24} color={colors.primary} />
            </Pressable>
          </View>
        ),
      });
    }
  }, [navigation, deck, deckId, selectionMode, isDark]);

  // Use the proper getDueCards function for correct INTRADAY/INTERDAY handling
  const settings = useSettingsStore((s) => s.settings);
  const allDecks = decks;
  
  const dueCards = useMemo(() => {
    if (!deck) return [];
    const allDue = getDueCards(deckCards, [deck], settings.testDayLockoutEnabled);
    return allDue;
  }, [deckCards, deck, settings.testDayLockoutEnabled]);
  
  const dueCardsCount = dueCards.length;
  const isTestDayFlag = deck?.mode === 'TEST_PREP' && deck?.testDate && checkIsTestDay(new Date(deck.testDate));

  const handleStartReview = () => {
    if (deckCards.length === 0) { Alert.alert("No Cards", "Please create some flashcards first."); return; }
    if (dueCards.length === 0) { Alert.alert("All Caught Up!", "You have reviewed all cards. Come back later!"); return; }
    navigation.navigate("Review", { cards: dueCards.map((c) => c.id) });
  };
  
  const handleOptionalReview = () => {
    navigation.navigate("OptionalReview", { deckId });
  };

  const handleCreateCard = async () => {
    if (!front.trim() || !back.trim()) { Alert.alert("Error", "Please fill in both question and answer"); return; }
    if (deck?.mode === "TEST_PREP" && !deck.testDate) {
      Alert.alert("Test Date Required", "Please set a test date in deck settings before creating flashcards.", [
        { text: "Cancel", style: "cancel" },
        { text: "Set Test Date", onPress: () => { setShowCreateModal(false); navigation.navigate("DeckSettings", { deckId }); } },
      ]);
      return;
    }
    try {
      await addFlashcard(deckId, front.trim(), back.trim());
      setFront(""); setBack(""); setJustCreatedCard(true);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to create flashcard");
    }
  };

  const handleEditCard = async () => {
    if (!selectedCard || !front.trim() || !back.trim()) { Alert.alert("Error", "Please fill in both question and answer"); return; }
    try {
      await updateFlashcard(selectedCard, front.trim(), back.trim());
      setShowEditModal(false); setSelectedCard(null); setFront(""); setBack("");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update flashcard");
    }
  };

  const handleDeleteCard = (cardId: string) => {
    Alert.alert("Delete Card", "Are you sure you want to delete this card?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => { deleteFlashcard(cardId); setShowEditModal(false); setSelectedCard(null); } },
    ]);
  };

  const handleBulkDelete = () => {
    if (selectedCards.size === 0) return;
    Alert.alert("Delete Cards", `Are you sure you want to delete ${selectedCards.size} card(s)?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => { selectedCards.forEach((cardId) => deleteFlashcard(cardId)); setSelectedCards(new Set()); setSelectionMode(false); } },
    ]);
  };

  const handleSwitchToLongTerm = () => {
    Alert.alert("Test Date Reached!", "Would you like to switch this deck to Long Term mode?", [
      { text: "Keep Test Prep", style: "cancel" },
      { text: "Switch to Long Term", onPress: async () => { await convertToLongTerm(deckId); Alert.alert("Success", "Deck converted to Long Term mode."); } }
    ]);
  };

  const toggleCardSelection = (cardId: string) => { const newSelection = new Set(selectedCards); if (newSelection.has(cardId)) newSelection.delete(cardId); else newSelection.add(cardId); setSelectedCards(newSelection); };
  const selectAll = () => setSelectedCards(new Set(deckCards.map((c) => c.id)));
  const deselectAll = () => setSelectedCards(new Set());
  const openEditModal = (card: typeof deckCards[0]) => { navigation.navigate("FlashcardEditor", { deckId, cardId: card.id }); };

  if (!deck) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyContainer}><Text style={[styles.emptyText, { color: colors.textSecondary }]}>Deck not found</Text></View>
      </View>
    );
  }

  // dueCardsCount is now calculated via useMemo above with proper learning step handling
  const masteredCount = deckCards.filter((c) => c.mastery === "MASTERED").length;
  const strugglingCount = deckCards.filter((c) => c.mastery === "STRUGGLING").length;
  const learningCount = deckCards.filter((c) => c.mastery === "LEARNING").length;
  const daysUntilTest = deck.testDate ? differenceInCalendarDays(new Date(deck.testDate), new Date()) : null;
  const isTestFinished = deck.mode === "TEST_PREP" && daysUntilTest !== null && daysUntilTest < 0;

  const sortedCards = [...deckCards].sort((a, b) => {
    if (sortBy === "date") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    else if (sortBy === "mastery") { const masteryOrder = { STRUGGLING: 0, LEARNING: 1, MASTERED: 2 }; return masteryOrder[a.mastery || "LEARNING"] - masteryOrder[b.mastery || "LEARNING"]; }
    else return a.front.localeCompare(b.front);
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Test Date Warning */}
        {deck.mode === "TEST_PREP" && !deck.testDate && (
          <View style={[styles.warningBanner, { backgroundColor: "#ef4444" }]}>
            <View style={styles.warningContent}>
              <View style={{ flex: 1 }}>
                <Text style={styles.warningTitle}>Test Date Required</Text>
                <Text style={styles.warningSubtitle}>Set a test date to start creating flashcards</Text>
              </View>
              <Pressable onPress={() => navigation.navigate("DeckSettings", { deckId })} style={styles.warningButton}>
                <Text style={{ color: "#ef4444", fontWeight: "600" }}>Set Date</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Test Day Banner */}
        {isTestDayFlag && settings.testDayLockoutEnabled && (
          <View style={[styles.warningBanner, { backgroundColor: "#8b5cf6" }]}>
            <View style={styles.warningContent}>
              <View style={{ flex: 1, marginRight: 16 }}>
                <Text style={styles.warningTitle}>Test Day!</Text>
                <Text style={styles.warningSubtitle}>Scheduled reviews are paused. Use Practice Mode if you want to study.</Text>
              </View>
            </View>
          </View>
        )}
        {/* Test Completed Banner (after test day) */}
        {deck.mode === "TEST_PREP" && deck.testDate && daysUntilTest !== null && daysUntilTest < 0 && (
          <View style={[styles.warningBanner, { backgroundColor: "#8b5cf6" }]}>
            <View style={styles.warningContent}>
              <View style={{ flex: 1, marginRight: 16 }}>
                <Text style={styles.warningTitle}>Test Date Passed!</Text>
                <Text style={styles.warningSubtitle}>Switch to Long Term mode for continued learning.</Text>
              </View>
              <Pressable onPress={handleSwitchToLongTerm} style={styles.warningButton}>
                <Text style={{ color: "#8b5cf6", fontWeight: "600" }}>Switch</Text>
              </Pressable>
            </View>
          </View>
        )}
        {/* Day Before Test reminder */}
        {deck.mode === "TEST_PREP" && deck.testDate && daysUntilTest === 1 && (
          <View style={[styles.warningBanner, { backgroundColor: "#f97316" }]}>
            <View style={styles.warningContent}>
              <View style={{ flex: 1, marginRight: 16 }}>
                <Text style={styles.warningTitle}>Test Tomorrow!</Text>
                <Text style={styles.warningSubtitle}>Review your due cards and get some rest. Good luck!</Text>
              </View>
            </View>
          </View>
        )}

        {/* Progress & Stats Section */}
        <View style={styles.statsSection}>
          {/* Test Date - shown first if available */}
          {deck.testDate && daysUntilTest !== null && daysUntilTest >= 0 && (
            <View style={styles.testDateRow}>
              <Ionicons name="calendar-outline" size={16} color={daysUntilTest <= 3 ? colors.error : colors.textSecondary} />
              <Text style={[styles.testDateLabel, { color: daysUntilTest <= 3 ? colors.error : colors.textSecondary }]}>
                {daysUntilTest === 0 ? "Test is today!" : daysUntilTest === 1 ? "Test tomorrow" : `${daysUntilTest} days until test`}
              </Text>
            </View>
          )}
          
          {/* Progress Bar */}
          {deckCards.length > 0 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                  {masteredCount} of {deckCards.length} mastered
                </Text>
                <Text style={[styles.progressPercent, { color: colors.primary }]}>
                  {Math.round((masteredCount / deckCards.length) * 100)}%
                </Text>
              </View>
              <View style={[styles.progressBarBg, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)" }]}>
                <View style={[styles.progressBarFill, { width: `${(masteredCount / deckCards.length) * 100}%`, backgroundColor: colors.success }]} />
              </View>
            </View>
          )}
        </View>

        {/* Primary Action Button */}
        {!selectionMode && deckCards.length > 0 && !isTestFinished && (
          <View style={styles.primaryActionSection}>
            {isTestDayFlag && settings.testDayLockoutEnabled ? (
              <Pressable onPress={handleOptionalReview} style={[styles.primaryActionButton, { backgroundColor: colors.purple }]}>
                <Ionicons name="infinite" size={24} color="white" />
                <Text style={styles.primaryActionText}>Practice Mode</Text>
              </Pressable>
            ) : dueCardsCount > 0 ? (
              <Pressable onPress={handleStartReview} style={[styles.primaryActionButton, { backgroundColor: colors.primary }]}>
                <Ionicons name="play" size={24} color="white" />
                <Text style={styles.primaryActionText}>Start Review ({dueCardsCount})</Text>
              </Pressable>
            ) : (
              <View style={[styles.allCaughtUpBanner, { backgroundColor: colors.successLight }]}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <Text style={[styles.allCaughtUpText, { color: colors.success }]}>All caught up! No cards due.</Text>
              </View>
            )}
          </View>
        )}

        {/* Secondary Actions Row */}
        {!selectionMode && (
          <View style={styles.secondaryActionsRow}>
            <Pressable onPress={() => navigation.navigate("FlashcardEditor", { deckId })} style={[styles.secondaryActionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="add" size={20} color={colors.text} />
              <Text style={[styles.secondaryActionText, { color: colors.text }]}>Add Card</Text>
            </Pressable>
            {deckCards.length > 0 && !isTestDayFlag && (
              <Pressable onPress={handleOptionalReview} style={[styles.secondaryActionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="infinite" size={20} color={colors.purple} />
                <Text style={[styles.secondaryActionText, { color: colors.purple }]}>Practice All</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Selection Mode */}
        {selectionMode && (
          <Card style={styles.selectionBar} padding={12}>
            <View style={styles.selectionBarRow}>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <Pressable onPress={selectAll}><Text style={{ color: "#667eea", fontWeight: "600" }}>Select All</Text></Pressable>
                <Pressable onPress={deselectAll}><Text style={{ color: "#667eea", fontWeight: "600" }}>Deselect All</Text></Pressable>
              </View>
              <Pressable onPress={() => { setSelectionMode(false); setSelectedCards(new Set()); }}><Text style={{ color: isDark ? "#64748b" : "#94a3b8", fontWeight: "600" }}>Cancel</Text></Pressable>
            </View>
          </Card>
        )}

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.scrollContent}>
            {deckCards.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <Ionicons name="documents-outline" size={64} color={isDark ? "#334155" : "#cbd5e1"} />
                <Text style={[styles.emptyTitle, { color: isDark ? "#64748b" : "#94a3b8" }]}>No flashcards yet</Text>
                <Text style={[styles.emptySubtitle, { color: isDark ? "#475569" : "#94a3b8" }]}>Create flashcards to start studying</Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {/* Sort Button */}
                <Pressable onPress={() => setShowSortMenu(true)}>
                  <Card padding={12}>
                    <View style={styles.sortButtonContent}>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Ionicons name="funnel-outline" size={16} color={isDark ? "#64748b" : "#94a3b8"} />
                        <Text style={[styles.sortText, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Sort: <Text style={{ fontWeight: "600" }}>{sortBy === "date" ? "Date" : sortBy === "mastery" ? "Mastery" : "Question"}</Text></Text>
                      </View>
                      <Ionicons name="chevron-down" size={16} color={isDark ? "#64748b" : "#94a3b8"} />
                    </View>
                  </Card>
                </Pressable>

                {/* Mastery Summary */}
                <Card padding={14}>
                  <Text style={[styles.summaryTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Mastery Breakdown</Text>
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryItem}><Text style={{ color: "#10b981", fontWeight: "600" }}>{Math.round((masteredCount / deckCards.length) * 100)}%</Text><Text style={[styles.summaryLabel, { color: isDark ? "#64748b" : "#94a3b8" }]}>Mastered</Text></View>
                    <View style={styles.summaryItem}><Text style={{ color: "#667eea", fontWeight: "600" }}>{Math.round((learningCount / deckCards.length) * 100)}%</Text><Text style={[styles.summaryLabel, { color: isDark ? "#64748b" : "#94a3b8" }]}>Learning</Text></View>
                    <View style={styles.summaryItem}><Text style={{ color: "#f97316", fontWeight: "600" }}>{Math.round((strugglingCount / deckCards.length) * 100)}%</Text><Text style={[styles.summaryLabel, { color: isDark ? "#64748b" : "#94a3b8" }]}>Struggling</Text></View>
                  </View>
                </Card>

                {/* Cards List */}
                {sortedCards.map((card) => {
                  const isSelected = selectedCards.has(card.id);
                  const masteryColor = card.mastery === "MASTERED" ? "#10b981" : card.mastery === "LEARNING" ? "#667eea" : "#f97316";
                  return (
                    <Pressable key={card.id} onPress={() => selectionMode ? toggleCardSelection(card.id) : openEditModal(card)}>
                      <Card style={isSelected ? { ...styles.cardItem, backgroundColor: isDark ? "rgba(102, 126, 234, 0.15)" : "rgba(102, 126, 234, 0.1)" } : styles.cardItem}>
                        <View style={[styles.cardBorder, { backgroundColor: masteryColor }]} />
                        <View style={styles.cardContent}>
                          {selectionMode && <Ionicons name={isSelected ? "checkbox" : "square-outline"} size={24} color={isSelected ? "#667eea" : (isDark ? "#64748b" : "#94a3b8")} style={{ marginRight: 12 }} />}
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.cardLabel, { color: isDark ? "#64748b" : "#94a3b8" }]}>Question</Text>
                            <Text style={[styles.cardFront, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>{card.front}</Text>
                            <Text style={[styles.cardLabel, { color: isDark ? "#64748b" : "#94a3b8", marginTop: 12 }]}>Answer</Text>
                            <Text style={[styles.cardBack, { color: isDark ? "#e2e8f0" : "#374151" }]}>{card.back}</Text>
                            <View style={[styles.cardFooter, { borderTopColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]}>
                              <Text style={[styles.cardDate, { color: isDark ? "#64748b" : "#94a3b8" }]}>{format(new Date(card.createdAt), "MMM d, yyyy")}</Text>
                              <Text style={[styles.cardMastery, { color: masteryColor }]}>{card.mastery || "LEARNING"}</Text>
                            </View>
                          </View>
                        </View>
                      </Card>
                    </Pressable>
                  );
                })}
              </View>
            )}
            <View style={{ height: 120 }} />
          </View>
        </ScrollView>

        {/* Selection Mode Action Bar */}
        {selectionMode && selectedCards.size > 0 && (
          <View style={[styles.selectionActionBar, { backgroundColor: colors.error }]}>
            <Pressable onPress={handleBulkDelete} style={styles.selectionDeleteBtn}>
              <Ionicons name="trash" size={20} color="white" />
              <Text style={styles.selectionDeleteText}>Delete {selectedCards.size} Card{selectedCards.size !== 1 ? "s" : ""}</Text>
            </Pressable>
          </View>
        )}
      </View>

      <SortMenu visible={showSortMenu} onClose={() => setShowSortMenu(false)} options={[{ value: "date", label: "Date Created" }, { value: "mastery", label: "Mastery Level" }, { value: "question", label: "Question (A-Z)" }]} selectedValue={sortBy} onSelect={(value) => setSortBy(value as "date" | "mastery" | "question")} />

      {/* Create Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: isDark ? "#1e293b" : "#ffffff" }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Create Flashcard</Text>
                  <Pressable onPress={() => { setShowCreateModal(false); setFront(""); setBack(""); setJustCreatedCard(false); Keyboard.dismiss(); }}><Ionicons name="close" size={28} color={isDark ? "#64748b" : "#94a3b8"} /></Pressable>
                </View>
                <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                  <Text style={[styles.inputLabel, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Question</Text>
                  <TextInput value={front} onChangeText={(t) => { setFront(t); setJustCreatedCard(false); }} placeholder="Enter question" placeholderTextColor={isDark ? "#64748b" : "#94a3b8"} multiline numberOfLines={3} style={[styles.textInput, { backgroundColor: isDark ? "#0f172a" : "#f8fafc", borderColor: isDark ? "#334155" : "#e2e8f0", color: isDark ? "#f1f5f9" : "#1e293b" }]} />
                  <Text style={[styles.inputLabel, { color: isDark ? "#f1f5f9" : "#1e293b", marginTop: 16 }]}>Answer</Text>
                  <TextInput value={back} onChangeText={(t) => { setBack(t); setJustCreatedCard(false); }} placeholder="Enter answer" placeholderTextColor={isDark ? "#64748b" : "#94a3b8"} multiline numberOfLines={4} style={[styles.textInput, { backgroundColor: isDark ? "#0f172a" : "#f8fafc", borderColor: isDark ? "#334155" : "#e2e8f0", color: isDark ? "#f1f5f9" : "#1e293b" }]} />
                </ScrollView>
                <Pressable onPress={handleCreateCard} style={[styles.modalButton, { backgroundColor: colors.primary }]}>
                  <Text style={styles.modalButtonText}>Add Card</Text>
                </Pressable>
                {justCreatedCard && <Text style={[styles.successText, { color: "#10b981" }]}>Card added! Create another or close to finish.</Text>}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={[styles.modalOverlay, { justifyContent: "flex-end" }]}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, styles.modalContentBottom, { backgroundColor: isDark ? "#1e293b" : "#ffffff" }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Edit Flashcard</Text>
                  <Pressable onPress={() => { setShowEditModal(false); setSelectedCard(null); setFront(""); setBack(""); Keyboard.dismiss(); }}><Ionicons name="close" size={28} color={isDark ? "#64748b" : "#94a3b8"} /></Pressable>
                </View>
                <ScrollView keyboardShouldPersistTaps="handled">
                  <Text style={[styles.inputLabel, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Question</Text>
                  <TextInput value={front} onChangeText={setFront} placeholder="Enter question" placeholderTextColor={isDark ? "#64748b" : "#94a3b8"} multiline numberOfLines={3} style={[styles.textInput, { backgroundColor: isDark ? "#0f172a" : "#f8fafc", borderColor: isDark ? "#334155" : "#e2e8f0", color: isDark ? "#f1f5f9" : "#1e293b" }]} />
                  <Text style={[styles.inputLabel, { color: isDark ? "#f1f5f9" : "#1e293b", marginTop: 16 }]}>Answer</Text>
                  <TextInput value={back} onChangeText={setBack} placeholder="Enter answer" placeholderTextColor={isDark ? "#64748b" : "#94a3b8"} multiline numberOfLines={4} style={[styles.textInput, { backgroundColor: isDark ? "#0f172a" : "#f8fafc", borderColor: isDark ? "#334155" : "#e2e8f0", color: isDark ? "#f1f5f9" : "#1e293b" }]} />
                </ScrollView>
                <View style={{ gap: 12 }}>
                  <Pressable onPress={handleEditCard} style={[styles.modalButton, { backgroundColor: colors.primary }]}>
                    <Text style={styles.modalButtonText}>Save Changes</Text>
                  </Pressable>
                  <Pressable onPress={() => selectedCard && handleDeleteCard(selectedCard)} style={[styles.modalButton, { backgroundColor: colors.error }]}>
                    <Text style={styles.modalButtonText}>Delete Card</Text>
                  </Pressable>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 18 },
  floatingShape: { position: "absolute", borderRadius: 100, opacity: 0.12 },
  shape1: { width: 180, height: 180, top: -60, right: -40 },
  shape2: { width: 120, height: 120, bottom: 200, left: -40 },
  warningBanner: { paddingHorizontal: 20, paddingVertical: 16 },
  warningContent: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  warningTitle: { color: "#ffffff", fontWeight: "700", fontSize: 16, marginBottom: 4 },
  warningSubtitle: { color: "rgba(255,255,255,0.9)", fontSize: 13 },
  warningButton: { backgroundColor: "#ffffff", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 },
  infoBanner: { marginHorizontal: 20, marginTop: 16 },
  infoBannerRow: { flexDirection: "row", justifyContent: "space-between" },
  infoLabel: { fontSize: 13, marginBottom: 4 },
  infoValue: { fontWeight: "700", fontSize: 16 },
  infoValueLarge: { fontWeight: "700", fontSize: 22 },
  infoHighlight: { fontSize: 13, fontWeight: "500", marginTop: 2 },
  dueBanner: { marginHorizontal: 20, marginTop: 12 },
  selectionBar: { marginHorizontal: 20, marginTop: 12 },
  selectionBarRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16 },
  emptyStateContainer: { alignItems: "center", justifyContent: "center", paddingTop: 80 },
  emptyTitle: { fontSize: 20, fontWeight: "600", marginTop: 16 },
  emptySubtitle: { fontSize: 15, marginTop: 8, textAlign: "center", paddingHorizontal: 32 },
  sortButtonContent: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sortText: { fontSize: 14, marginLeft: 8 },
  summaryTitle: { fontSize: 14, fontWeight: "600", marginBottom: 12 },
  summaryRow: { flexDirection: "row", gap: 16 },
  summaryItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  summaryLabel: { fontSize: 12 },
  cardItem: { overflow: "hidden" },
  cardBorder: { position: "absolute", left: 0, top: 0, bottom: 0, width: 4 },
  cardContent: { flexDirection: "row", padding: 16 },
  cardLabel: { fontSize: 12, fontWeight: "500", marginBottom: 4 },
  cardFront: { fontSize: 16, fontWeight: "600" },
  cardBack: { fontSize: 15 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  cardDate: { fontSize: 12 },
  cardMastery: { fontSize: 12, fontWeight: "600" },
  actionBar: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20, gap: 12 },
  primaryButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, borderRadius: 16, overflow: "hidden", gap: 8 },
  secondaryButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, borderRadius: 16, borderWidth: 1, gap: 8 },
  deleteButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, borderRadius: 16, overflow: "hidden", gap: 8 },
  actionButtonText: { color: "#ffffff", fontSize: 17, fontWeight: "600" },
  secondaryButtonText: { fontSize: 17, fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", paddingHorizontal: 20 },
  modalContent: { borderRadius: 24, padding: 24, maxHeight: "70%" },
  modalContentBottom: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, maxHeight: "90%" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  modalTitle: { fontSize: 24, fontWeight: "700" },
  inputLabel: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  textInput: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, textAlignVertical: "top", minHeight: 80 },
  modalButton: { paddingVertical: 16, borderRadius: 14, alignItems: "center", marginTop: 16, overflow: "hidden" },
  modalButtonText: { color: "#ffffff", fontSize: 17, fontWeight: "600" },
  successText: { textAlign: "center", fontSize: 13, marginTop: 8 },
  
  // New redesigned styles
  statsSection: { paddingHorizontal: 20, paddingTop: 16, gap: 12 },
  progressContainer: { gap: 8 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressLabel: { fontSize: 14 },
  progressPercent: { fontSize: 14, fontWeight: "600" },
  progressBarBg: { height: 8, borderRadius: 4, overflow: "hidden" },
  progressBarFill: { height: "100%", borderRadius: 4 },
  testDateRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  testDateLabel: { fontSize: 13, fontWeight: "500" },
  
  primaryActionSection: { paddingHorizontal: 20, paddingTop: 16 },
  primaryActionButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 18, borderRadius: 14 },
  primaryActionText: { color: "#ffffff", fontSize: 18, fontWeight: "600" },
  allCaughtUpBanner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12 },
  allCaughtUpText: { fontSize: 15, fontWeight: "500" },
  
  secondaryActionsRow: { flexDirection: "row", gap: 12, paddingHorizontal: 20, paddingTop: 12 },
  secondaryActionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
  secondaryActionText: { fontSize: 15, fontWeight: "500" },
  
  selectionActionBar: { paddingHorizontal: 20, paddingVertical: 16 },
  selectionDeleteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  selectionDeleteText: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
});
