import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, Alert, TextInput, Modal, Image, Keyboard, TouchableWithoutFeedback } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useFlashcardStore } from "../state/flashcardStore";
import { RootStackParamList } from "../navigation/RootNavigator";
import { differenceInDays, format } from "date-fns";
import { SortMenu } from "../components/SortMenu";
import { useThemeStore, getThemedColors } from "../state/themeStore";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type DeckRouteProp = RouteProp<RootStackParamList, "Deck">;

export default function DeckScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<DeckRouteProp>();
  const { deckId } = route.params;

  // Use individual selectors to prevent infinite loops
  const decks = useFlashcardStore((s) => s.decks);
  const flashcards = useFlashcardStore((s) => s.flashcards);
  const addFlashcard = useFlashcardStore((s) => s.addFlashcard);
  const updateFlashcard = useFlashcardStore((s) => s.updateFlashcard);
  const deleteFlashcard = useFlashcardStore((s) => s.deleteFlashcard);

  const theme = useThemeStore((s) => s.theme);
  const colors = getThemedColors(theme);

  // Compute derived values outside the selector
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
        headerRight: () => (
          <View className="flex-row items-center gap-3">
            {!selectionMode && (
              <Pressable
                onPress={() => setSelectionMode(true)}
                className="active:opacity-70 mr-1"
              >
                <Ionicons name="checkbox-outline" size={24} color={colors.primary} />
              </Pressable>
            )}
            <Pressable
              onPress={() => navigation.navigate("DeckSettings", { deckId })}
              className="active:opacity-70 mr-2"
            >
              <Ionicons name="ellipsis-vertical" size={24} color={colors.primary} />
            </Pressable>
          </View>
        ),
      });
    }
  }, [navigation, deck, deckId, selectionMode, colors]);

  const handleStartReview = () => {
    if (deckCards.length === 0) {
      Alert.alert("No Cards", "Please create some flashcards first.");
      return;
    }

    const dueCards = deckCards.filter((card) => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const reviewDate = new Date(card.nextReviewDate);
      reviewDate.setHours(0, 0, 0, 0);
      return reviewDate <= now;
    });

    if (dueCards.length === 0) {
      Alert.alert(
        "All Caught Up!",
        "You have reviewed all cards. Come back tomorrow!"
      );
      return;
    }

    navigation.navigate("Review", {
      cards: dueCards.map((c) => c.id),
    });
  };

  const handleCreateCard = () => {
    if (!front.trim() || !back.trim()) {
      Alert.alert("Error", "Please fill in both question and answer");
      return;
    }

    // Check if deck is in TEST_PREP mode without a test date
    if (deck?.mode === "TEST_PREP" && !deck.testDate) {
      Alert.alert(
        "Test Date Required",
        "Please set a test date in deck settings before creating flashcards.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Set Test Date",
            onPress: () => {
              setShowCreateModal(false);
              navigation.navigate("DeckSettings", { deckId });
            },
          },
        ]
      );
      return;
    }

    addFlashcard(deckId, front.trim(), back.trim());
    setFront("");
    setBack("");
    setJustCreatedCard(true);
    // Don't close modal - allow continuous creation
  };

  const handleEditCard = () => {
    if (!selectedCard || !front.trim() || !back.trim()) {
      Alert.alert("Error", "Please fill in both question and answer");
      return;
    }
    updateFlashcard(selectedCard, front.trim(), back.trim());
    setShowEditModal(false);
    setSelectedCard(null);
    setFront("");
    setBack("");
  };

  const handleDeleteCard = (cardId: string) => {
    Alert.alert("Delete Card", "Are you sure you want to delete this card?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteFlashcard(cardId);
          setShowEditModal(false);
          setSelectedCard(null);
        },
      },
    ]);
  };

  const handleBulkDelete = () => {
    if (selectedCards.size === 0) return;

    Alert.alert(
      "Delete Cards",
      `Are you sure you want to delete ${selectedCards.size} card(s)?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            selectedCards.forEach((cardId) => deleteFlashcard(cardId));
            setSelectedCards(new Set());
            setSelectionMode(false);
          },
        },
      ]
    );
  };

  const toggleCardSelection = (cardId: string) => {
    const newSelection = new Set(selectedCards);
    if (newSelection.has(cardId)) {
      newSelection.delete(cardId);
    } else {
      newSelection.add(cardId);
    }
    setSelectedCards(newSelection);
  };

  const selectAll = () => {
    setSelectedCards(new Set(deckCards.map((c) => c.id)));
  };

  const deselectAll = () => {
    setSelectedCards(new Set());
  };

  const openEditModal = (card: typeof deckCards[0]) => {
    setSelectedCard(card.id);
    setFront(card.front);
    setBack(card.back);
    setShowEditModal(true);
  };

  if (!deck) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.background }}>
        <Text className="text-xl" style={{ color: colors.textSecondary }}>Deck not found</Text>
      </View>
    );
  }

  const dueCardsCount = deckCards.filter((card) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const reviewDate = new Date(card.nextReviewDate);
    reviewDate.setHours(0, 0, 0, 0);
    return reviewDate <= now;
  }).length;

  const masteredCount = deckCards.filter((c) => c.mastery === "MASTERED").length;
  const strugglingCount = deckCards.filter((c) => c.mastery === "STRUGGLING").length;
  const learningCount = deckCards.filter((c) => c.mastery === "LEARNING").length;

  // Calculate days until test
  const daysUntilTest = deck.testDate
    ? differenceInDays(new Date(deck.testDate), new Date())
    : null;

  // Sort flashcards based on selected option
  const sortedCards = [...deckCards].sort((a, b) => {
    if (sortBy === "date") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (sortBy === "mastery") {
      const masteryOrder = { STRUGGLING: 0, LEARNING: 1, MASTERED: 2 };
      return masteryOrder[a.mastery] - masteryOrder[b.mastery];
    } else {
      return a.front.localeCompare(b.front);
    }
  });

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <View className="flex-1">
        {/* Test Date Required Warning */}
        {deck.mode === "TEST_PREP" && !deck.testDate && (
          <View className="px-5 py-4 border-b" style={{ backgroundColor: colors.error, borderBottomColor: colors.border }}>
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-white font-bold text-base mb-1">Test Date Required</Text>
                <Text className="text-white/90 text-sm">
                  Set a test date to start creating flashcards
                </Text>
              </View>
              <Pressable
                onPress={() => navigation.navigate("DeckSettings", { deckId })}
                className="bg-white rounded-xl px-4 py-2 active:opacity-70"
              >
                <Text className="font-semibold" style={{ color: colors.error }}>Set Date</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Deck Info Banner */}
        {(deck.testDate || deckCards.length > 0) && (
          <View className="px-5 py-4 border-b" style={{ backgroundColor: colors.surface, borderBottomColor: colors.border }}>
            <View className="flex-row items-center justify-between">
              {deck.testDate && daysUntilTest !== null && (
                <View className="flex-1">
                  <Text className="text-sm" style={{ color: colors.textSecondary }}>Test Date</Text>
                  <Text className="font-bold text-base" style={{ color: colors.text }}>
                    {format(new Date(deck.testDate), "MMM d, yyyy")}
                  </Text>
                  <Text
                    className="text-sm font-medium mt-0.5"
                    style={{ color: daysUntilTest <= 3 ? colors.error : daysUntilTest <= 7 ? colors.orange : colors.primary }}
                  >
                    {daysUntilTest === 0
                      ? "Today!"
                      : daysUntilTest === 1
                      ? "Tomorrow"
                      : `${daysUntilTest} days left`}
                  </Text>
                </View>
              )}
              {deckCards.length > 0 && (
                <View className="items-end" style={{ marginLeft: "auto" }}>
                  <Text className="text-sm" style={{ color: colors.textSecondary }}>Progress</Text>
                  <Text className="font-bold text-xl" style={{ color: colors.text }}>
                    {masteredCount}/{deckCards.length}
                  </Text>
                  <Text className="text-sm font-medium" style={{ color: colors.green }}>
                    {Math.round((masteredCount / deckCards.length) * 100)}% mastered
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {dueCardsCount > 0 && (
          <View className="px-5 py-4 border-b" style={{ backgroundColor: colors.primaryLight, borderBottomColor: colors.border }}>
            <Text className="text-base font-semibold" style={{ color: colors.primary }}>
              {dueCardsCount} {dueCardsCount === 1 ? "card" : "cards"} ready to review
            </Text>
          </View>
        )}

        {/* Selection Mode Bar */}
        {selectionMode && (
          <View className="px-5 py-3 border-b flex-row items-center justify-between" style={{ backgroundColor: colors.surface, borderBottomColor: colors.border }}>
            <View className="flex-row items-center gap-3">
              <Pressable onPress={selectAll} className="active:opacity-70">
                <Text className="font-semibold" style={{ color: colors.primary }}>Select All</Text>
              </Pressable>
              <Pressable onPress={deselectAll} className="active:opacity-70">
                <Text className="font-semibold" style={{ color: colors.primary }}>Deselect All</Text>
              </Pressable>
            </View>
            <Pressable
              onPress={() => {
                setSelectionMode(false);
                setSelectedCards(new Set());
              }}
              className="active:opacity-70"
            >
              <Text className="font-semibold" style={{ color: colors.textSecondary }}>Cancel</Text>
            </Pressable>
          </View>
        )}

        <ScrollView className="flex-1 px-5 py-4">
          {deckCards.length === 0 ? (
            <View className="items-center justify-center mt-20">
              <Ionicons name="documents-outline" size={64} color={colors.border} />
              <Text className="text-xl mt-4 text-center" style={{ color: colors.textSecondary }}>
                No flashcards yet
              </Text>
              <Text className="text-base mt-2 text-center px-8" style={{ color: colors.textSecondary }}>
                Create flashcards to start studying
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {/* Sort Button */}
              <Pressable
                onPress={() => setShowSortMenu(true)}
                className="flex-row items-center justify-between rounded-xl p-3 border active:opacity-70"
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              >
                <View className="flex-row items-center">
                  <Ionicons name="funnel-outline" size={18} color={colors.textSecondary} />
                  <Text className="text-sm ml-2" style={{ color: colors.text }}>
                    Sort by: <Text className="font-semibold">{sortBy === "date" ? "Date Created" : sortBy === "mastery" ? "Mastery Level" : "Question (A-Z)"}</Text>
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
              </Pressable>

              {/* Mastery Summary */}
              {deckCards.length > 0 && (
                <View className="rounded-xl p-4 border" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                  <Text className="text-sm font-semibold mb-2" style={{ color: colors.text }}>Mastery Breakdown</Text>
                  <View className="flex-row items-center gap-4">
                    <View className="flex-row items-center">
                      <Text className="text-sm font-semibold" style={{ color: colors.green }}>{Math.round((masteredCount / deckCards.length) * 100)}%</Text>
                      <Text className="text-xs ml-1" style={{ color: colors.textSecondary }}>Mastered</Text>
                    </View>
                    <View className="flex-row items-center">
                      <Text className="text-sm font-semibold" style={{ color: colors.blue }}>{Math.round((learningCount / deckCards.length) * 100)}%</Text>
                      <Text className="text-xs ml-1" style={{ color: colors.textSecondary }}>Learning</Text>
                    </View>
                    <View className="flex-row items-center">
                      <Text className="text-sm font-semibold" style={{ color: colors.orange }}>{Math.round((strugglingCount / deckCards.length) * 100)}%</Text>
                      <Text className="text-xs ml-1" style={{ color: colors.textSecondary }}>Struggling</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Flashcard List */}
              {sortedCards.map((card) => {
                const isSelected = selectedCards.has(card.id);
                const masteryBorderColor =
                  card.mastery === "MASTERED"
                    ? colors.green
                    : card.mastery === "LEARNING"
                    ? colors.blue
                    : colors.orange;

                return (
                  <Pressable
                    key={card.id}
                    onPress={() => {
                      if (selectionMode) {
                        toggleCardSelection(card.id);
                      } else {
                        openEditModal(card);
                      }
                    }}
                    className="border-l-4 rounded-xl p-4 active:opacity-70"
                    style={{
                      backgroundColor: isSelected ? colors.primaryLight : colors.surface,
                      borderLeftColor: masteryBorderColor
                    }}
                  >
                    <View className="flex-row items-start">
                      {selectionMode && (
                        <View className="mr-3">
                          <Ionicons
                            name={isSelected ? "checkbox" : "square-outline"}
                            size={24}
                            color={isSelected ? colors.primary : colors.textSecondary}
                          />
                        </View>
                      )}
                      <View className="flex-1">
                        <Text className="text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>Question</Text>
                        <Text className="text-base font-semibold mb-3" style={{ color: colors.text }}>
                          {card.front}
                        </Text>
                        <Text className="text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>Answer</Text>
                        <Text className="text-base" style={{ color: colors.text }}>{card.back}</Text>
                        {card.imageUri && (
                          <Image
                            source={{ uri: card.imageUri }}
                            className="w-full h-40 rounded-lg mt-2"
                            resizeMode="cover"
                          />
                        )}
                        <View className="flex-row items-center justify-between mt-3 pt-2 border-t" style={{ borderTopColor: colors.border }}>
                          <Text className="text-xs" style={{ color: colors.textSecondary }}>
                            {format(new Date(card.createdAt), "MMM d, yyyy")}
                          </Text>
                          <View className="flex-row items-center gap-2">
                            <Text className="text-xs font-semibold" style={{
                              color: card.mastery === "MASTERED" ? colors.green : card.mastery === "LEARNING" ? colors.blue : colors.orange
                            }}>
                              {card.mastery}
                            </Text>
                            {card.mode === "TEST_PREP" && (
                              <Text className="text-xs" style={{ color: colors.textSecondary }}>
                                Step {card.currentStep + 1}/{card.schedule.length}
                              </Text>
                            )}
                          </View>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* Action Buttons */}
        <View className="px-5 pb-5 pt-3 border-t gap-3" style={{ borderTopColor: colors.border, backgroundColor: colors.background }}>
          {selectionMode && selectedCards.size > 0 ? (
            <Pressable
              onPress={handleBulkDelete}
              className="rounded-2xl py-4 items-center flex-row justify-center active:opacity-70"
              style={{ backgroundColor: colors.error }}
            >
              <Ionicons name="trash" size={20} color="white" />
              <Text className="text-white text-lg font-semibold ml-2">
                Delete {selectedCards.size} Card{selectedCards.size !== 1 ? "s" : ""}
              </Text>
            </Pressable>
          ) : (
            <>
              {deck.cardCount > 0 && (
                <Pressable
                  onPress={handleStartReview}
                  className="rounded-2xl py-4 items-center flex-row justify-center active:opacity-70"
                  style={{ backgroundColor: colors.primary }}
                >
                  <Ionicons name="play" size={20} color="white" />
                  <Text className="text-white text-lg font-semibold ml-2">
                    Start Review
                    {dueCardsCount > 0 && ` (${dueCardsCount})`}
                  </Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => setShowCreateModal(true)}
                className="rounded-2xl py-4 items-center flex-row justify-center active:opacity-70"
                style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
              >
                <Ionicons name="add" size={20} color={colors.text} />
                <Text className="text-lg font-semibold ml-2" style={{ color: colors.text }}>
                  Create Flashcard
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </View>

      {/* Sort Menu */}
      <SortMenu
        visible={showSortMenu}
        onClose={() => setShowSortMenu(false)}
        options={[
          { value: "date", label: "Date Created" },
          { value: "mastery", label: "Mastery Level" },
          { value: "question", label: "Question (A-Z)" }
        ]}
        selectedValue={sortBy}
        onSelect={(value) => setSortBy(value as "date" | "mastery" | "question")}
      />

      {/* Create Card Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View className="flex-1 bg-black/50 justify-center px-5">
            <TouchableWithoutFeedback>
              <View className="rounded-3xl p-6" style={{ backgroundColor: colors.surface, maxHeight: "70%" }}>
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-2xl font-bold" style={{ color: colors.text }}>Create Flashcard</Text>
                  <Pressable onPress={() => {
                    setShowCreateModal(false);
                    setFront("");
                    setBack("");
                    setJustCreatedCard(false);
                    Keyboard.dismiss();
                  }} className="active:opacity-70">
                    <Ionicons name="close" size={28} color={colors.textSecondary} />
                  </Pressable>
                </View>

                <ScrollView className="mb-4" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                  <Text className="text-sm font-semibold mb-2" style={{ color: colors.text }}>Question</Text>
                  <TextInput
                    value={front}
                    onChangeText={(text) => {
                      setFront(text);
                      setJustCreatedCard(false);
                    }}
                    placeholder="Enter question"
                    placeholderTextColor={colors.textSecondary}
                    className="rounded-xl px-4 py-3 text-base mb-4 border"
                    style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}
                    multiline
                    numberOfLines={3}
                  />

                  <Text className="text-sm font-semibold mb-2" style={{ color: colors.text }}>Answer</Text>
                  <TextInput
                    value={back}
                    onChangeText={(text) => {
                      setBack(text);
                      setJustCreatedCard(false);
                    }}
                    placeholder="Enter answer"
                    placeholderTextColor={colors.textSecondary}
                    className="rounded-xl px-4 py-3 text-base border"
                    style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}
                    multiline
                    numberOfLines={4}
                  />
                </ScrollView>

                <Pressable
                  onPress={handleCreateCard}
                  className="rounded-2xl py-4 items-center active:opacity-70 mb-2"
                  style={{ backgroundColor: colors.primary }}
                >
                  <Text className="text-white text-lg font-semibold">Add Card</Text>
                </Pressable>
                {justCreatedCard && (
                  <Text className="text-xs text-center" style={{ color: colors.success }}>
                    Card added! Create another or close to finish.
                  </Text>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Edit Card Modal */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View className="flex-1 bg-black/50 justify-end">
            <TouchableWithoutFeedback>
              <View className="rounded-t-3xl p-6" style={{ backgroundColor: colors.surface, maxHeight: "90%" }}>
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-2xl font-bold" style={{ color: colors.text }}>Edit Flashcard</Text>
                  <Pressable
                    onPress={() => {
                      setShowEditModal(false);
                      setSelectedCard(null);
                      setFront("");
                      setBack("");
                      Keyboard.dismiss();
                    }}
                    className="active:opacity-70"
                  >
                    <Ionicons name="close" size={28} color={colors.textSecondary} />
                  </Pressable>
                </View>

                <ScrollView className="mb-4" keyboardShouldPersistTaps="handled">
                  <Text className="text-sm font-semibold mb-2" style={{ color: colors.text }}>Question</Text>
                  <TextInput
                    value={front}
                    onChangeText={setFront}
                    placeholder="Enter question"
                    placeholderTextColor={colors.textSecondary}
                    className="rounded-xl px-4 py-3 text-base mb-4 border"
                    style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}
                    multiline
                    numberOfLines={3}
                  />

                  <Text className="text-sm font-semibold mb-2" style={{ color: colors.text }}>Answer</Text>
                  <TextInput
                    value={back}
                    onChangeText={setBack}
                    placeholder="Enter answer"
                    placeholderTextColor={colors.textSecondary}
                    className="rounded-xl px-4 py-3 text-base border"
                    style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}
                    multiline
                    numberOfLines={4}
                  />
                </ScrollView>

                <View className="gap-3">
                  <Pressable
                    onPress={handleEditCard}
                    className="rounded-2xl py-4 items-center active:opacity-70"
                    style={{ backgroundColor: colors.primary }}
                  >
                    <Text className="text-white text-lg font-semibold">Save Changes</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => selectedCard && handleDeleteCard(selectedCard)}
                    className="rounded-2xl py-4 items-center active:opacity-70"
                    style={{ backgroundColor: colors.error }}
                  >
                    <Text className="text-white text-lg font-semibold">Delete Card</Text>
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
