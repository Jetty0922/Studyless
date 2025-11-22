import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import { useFlashcardStore } from "../state/flashcardStore";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useTheme } from "../utils/useTheme";
import {
  GeneratedFlashcard,
  generateFlashcardsFromImage,
  generateFlashcardsFromFile,
} from "../utils/aiFlashcardGenerator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type DeckSelectionScreenProps = {
  route: {
    params: {
      flashcards: GeneratedFlashcard[];
      sourceUri?: string;
    };
  };
};

const COLORS = [
  { name: "Blue", value: "#3b82f6" },
  { name: "Purple", value: "#a855f7" },
  { name: "Green", value: "#22c55e" },
  { name: "Orange", value: "#f97316" },
  { name: "Red", value: "#ef4444" },
  { name: "Pink", value: "#ec4899" },
];

const EMOJIS = ["📚", "🎯", "🧠", "✨", "🚀", "💡", "📝", "🎓", "🔬", "🎨"];

export default function DeckSelectionScreen({ route }: DeckSelectionScreenProps) {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { flashcards: generatedFlashcards, sourceUri } = route.params;

  const decks = useFlashcardStore((s) => s.decks);
  const addDeck = useFlashcardStore((s) => s.addDeck);
  const addFlashcardsBatch = useFlashcardStore((s) => s.addFlashcardsBatch);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDeckName, setNewDeckName] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLORS[0].value);
  const [selectedEmoji, setSelectedEmoji] = useState(EMOJIS[0]);
  const [deckMode, setDeckMode] = useState<"TEST_PREP" | "LONG_TERM">("LONG_TERM");
  const [testDate, setTestDate] = useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [flashcardsList, setFlashcardsList] = useState<GeneratedFlashcard[]>(generatedFlashcards);

  const handleSelectDeck = async (deckId: string) => {
    try {
      setIsAdding(true);
      
      // Add all flashcards to the selected deck
      addFlashcardsBatch(
        deckId,
        flashcardsList.map((card) => ({
          front: card.front,
          back: card.back,
          imageUri: sourceUri,
        }))
      );

      Alert.alert(
        "Success!",
        `Added ${flashcardsList.length} flashcards to the deck.`,
        [
          {
            text: "OK",
            onPress: () => navigation.navigate("MainTabs"),
          },
        ]
      );
    } catch (error) {
      console.error("Error adding flashcards:", error);
      Alert.alert(
        "Error",
        "Failed to add flashcards to deck. Please try again."
      );
    } finally {
      setIsAdding(false);
    }
  };

  const handleCreateDeck = async () => {
    if (!newDeckName.trim()) {
      Alert.alert("Error", "Please enter a deck name");
      return;
    }

    if (deckMode === "TEST_PREP" && !testDate) {
      Alert.alert("Error", "Please select a test date for Test Prep mode");
      return;
    }

    try {
      setIsAdding(true);
      
      // Create new deck
      const deckId = addDeck(
        newDeckName,
        selectedColor,
        selectedEmoji,
        deckMode === "TEST_PREP" ? testDate : undefined,
        deckMode
      );

      // Add all flashcards to the new deck
      addFlashcardsBatch(
        deckId,
        flashcardsList.map((card) => ({
          front: card.front,
          back: card.back,
          imageUri: sourceUri,
        }))
      );

      setShowCreateModal(false);
      
      Alert.alert(
        "Success!",
        `Created deck "${newDeckName}" with ${flashcardsList.length} flashcards.`,
        [
          {
            text: "OK",
            onPress: () => navigation.navigate("MainTabs"),
          },
        ]
      );
    } catch (error) {
      console.error("Error creating deck:", error);
      Alert.alert(
        "Error",
        "Failed to create deck. Please try again."
      );
    } finally {
      setIsAdding(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setTestDate(selectedDate);
    }
  };

  const handleRegenerateAll = async () => {
    Alert.alert(
      "Regenerate All Flashcards",
      "This will regenerate all flashcards from the source. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Regenerate",
          onPress: async () => {
            try {
              setIsRegenerating(true);

              let newFlashcards;
              const mimeType = sourceUri?.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/i) 
                ? "image/jpeg" 
                : undefined;

              if (mimeType || sourceUri?.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                newFlashcards = await generateFlashcardsFromImage(sourceUri!);
              } else {
                newFlashcards = await generateFlashcardsFromFile(sourceUri!, mimeType);
              }

              setFlashcardsList(newFlashcards);
              Alert.alert("Success", `Regenerated ${newFlashcards.length} flashcards!`);
            } catch (error: any) {
              Alert.alert("Regeneration Failed", error.message || "Could not regenerate flashcards");
            } finally {
              setIsRegenerating(false);
            }
          },
        },
      ]
    );
  };

  const handleRegenerateCard = async (index: number) => {
    Alert.alert(
      "Regenerate Card",
      "This will create a new flashcard to replace this one. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Regenerate",
          onPress: async () => {
            try {
              setIsRegenerating(true);

              // Generate a new set and pick a random one that's different
              let newFlashcards;
              const mimeType = sourceUri?.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/i)
                ? "image/jpeg"
                : undefined;

              if (mimeType || sourceUri?.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                newFlashcards = await generateFlashcardsFromImage(sourceUri!);
              } else {
                newFlashcards = await generateFlashcardsFromFile(sourceUri!, mimeType);
              }

              // Pick a card that's different from the current one
              const currentCard = flashcardsList[index];
              const differentCards = newFlashcards.filter(
                card => card.front !== currentCard.front
              );

              if (differentCards.length > 0) {
                const randomCard = differentCards[Math.floor(Math.random() * differentCards.length)];
                const updatedList = [...flashcardsList];
                updatedList[index] = randomCard;
                setFlashcardsList(updatedList);
                Alert.alert("Success", "Card regenerated!");
              } else {
                Alert.alert("Info", "No alternative card found. Try regenerating all cards.");
              }
            } catch (error: any) {
              Alert.alert("Regeneration Failed", error.message || "Could not regenerate card");
            } finally {
              setIsRegenerating(false);
            }
          },
        },
      ]
    );
  };

  if (isAdding) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="text-lg mt-4" style={{ color: colors.text }}>
            Adding flashcards...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }} edges={["top"]}>
      <View className="flex-1">
        {/* Header */}
        <View className="px-6 pt-6 pb-4 border-b" style={{ backgroundColor: colors.surface, borderBottomColor: colors.border }}>
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-2xl font-bold" style={{ color: colors.text }}>
                Select a Deck
              </Text>
              <Text className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                {flashcardsList.length} flashcards generated
              </Text>
            </View>
            <View className="flex-row gap-2">
              {sourceUri && (
                <Pressable
                  onPress={handleRegenerateAll}
                  disabled={isRegenerating}
                  className="w-10 h-10 rounded-full items-center justify-center active:opacity-70"
                  style={{ backgroundColor: colors.primary }}
                >
                  {isRegenerating ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons name="refresh" size={20} color="white" />
                  )}
                </Pressable>
              )}
              <Pressable
                onPress={() => navigation.goBack()}
                className="w-10 h-10 rounded-full items-center justify-center active:opacity-70"
                style={{ backgroundColor: colors.background }}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>
          </View>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-6 py-6">
            {/* All Flashcards */}
            <View className="mb-6">
              <Text className="text-base font-semibold mb-3" style={{ color: colors.text }}>
                All Generated Flashcards ({flashcardsList.length}):
              </Text>
              {flashcardsList.map((card, index) => (
                <View
                  key={index}
                  className="rounded-xl p-4 mb-3 border"
                  style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-xs font-bold" style={{ color: colors.textSecondary }}>
                      Card {index + 1}
                    </Text>
                    {sourceUri && (
                      <Pressable
                        onPress={() => handleRegenerateCard(index)}
                        disabled={isRegenerating}
                        className="flex-row items-center px-3 py-1.5 rounded-full active:opacity-70"
                        style={{ backgroundColor: colors.primary + "20" }}
                      >
                        <Ionicons name="refresh" size={14} color={colors.primary} />
                        <Text className="text-xs font-semibold ml-1" style={{ color: colors.primary }}>
                          Regenerate
                        </Text>
                      </Pressable>
                    )}
                  </View>
                  <Text className="text-xs mb-2" style={{ color: colors.textSecondary }}>
                    Front:
                  </Text>
                  <Text className="text-sm mb-3" style={{ color: colors.text }}>
                    {card.front}
                  </Text>
                  <Text className="text-xs mb-2" style={{ color: colors.textSecondary }}>
                    Back:
                  </Text>
                  <Text className="text-sm" style={{ color: colors.text }}>
                    {card.back}
                  </Text>
                </View>
              ))}
            </View>

            {/* Create New Deck Button */}
            <Pressable
              onPress={() => setShowCreateModal(true)}
              className="rounded-2xl p-5 mb-4 border-2 active:opacity-70"
              style={{ backgroundColor: colors.primary, borderColor: colors.primary }}
            >
              <View className="flex-row items-center justify-center">
                <Ionicons name="add-circle" size={24} color="white" />
                <Text className="text-white text-lg font-bold ml-2">
                  Create New Deck
                </Text>
              </View>
            </Pressable>

            {/* Existing Decks */}
            {decks.length > 0 && (
              <>
                <Text className="text-lg font-bold mb-3" style={{ color: colors.text }}>
                  Or add to existing deck:
                </Text>
                <View className="gap-3">
                  {decks.map((deck) => (
                    <Pressable
                      key={deck.id}
                      onPress={() => handleSelectDeck(deck.id)}
                      className="rounded-2xl p-5 border active:opacity-70"
                      style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                    >
                      <View className="flex-row items-center">
                        <View
                          className="w-12 h-12 rounded-xl items-center justify-center mr-3"
                          style={{ backgroundColor: deck.color }}
                        >
                          <Text className="text-2xl">{deck.emoji || "📚"}</Text>
                        </View>
                        <View className="flex-1">
                          <Text className="text-lg font-bold" style={{ color: colors.text }}>
                            {deck.name}
                          </Text>
                          <Text className="text-sm" style={{ color: colors.textSecondary }}>
                            {deck.cardCount} cards • {deck.mode === "LONG_TERM" ? "Long-term" : "Test Prep"}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
                      </View>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            <View className="h-8" />
          </View>
        </ScrollView>
      </View>

      {/* Create Deck Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }} edges={["top"]}>
          <View className="flex-1">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between px-5 py-4 border-b" style={{ borderBottomColor: colors.border }}>
              <Text className="text-xl font-bold" style={{ color: colors.text }}>
                Create New Deck
              </Text>
              <Pressable
                onPress={() => setShowCreateModal(false)}
                className="active:opacity-70"
              >
                <Ionicons name="close" size={28} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView className="flex-1 px-5 py-6" showsVerticalScrollIndicator={false}>
              {/* Deck Name */}
              <View className="mb-6">
                <Text className="text-base font-semibold mb-2" style={{ color: colors.text }}>
                  Deck Name
                </Text>
                <TextInput
                  value={newDeckName}
                  onChangeText={setNewDeckName}
                  placeholder="e.g., Biology Chapter 3"
                  placeholderTextColor={colors.textSecondary}
                  className="rounded-xl px-4 py-4 text-base"
                  style={{ backgroundColor: colors.surface, color: colors.text }}
                />
              </View>

              {/* Mode Selection */}
              <View className="mb-6">
                <Text className="text-base font-semibold mb-2" style={{ color: colors.text }}>
                  Study Mode
                </Text>
                <View className="flex-row gap-3">
                  <Pressable
                    onPress={() => setDeckMode("TEST_PREP")}
                    className="flex-1 rounded-xl p-4 border-2"
                    style={{
                      backgroundColor: deckMode === "TEST_PREP" ? colors.primary + "20" : colors.surface,
                      borderColor: deckMode === "TEST_PREP" ? colors.primary : colors.border,
                    }}
                  >
                    <View className="items-center justify-center mb-2">
                      <Ionicons
                        name="calendar"
                        size={20}
                        color={deckMode === "TEST_PREP" ? colors.primary : colors.textSecondary}
                      />
                    </View>
                    <Text className="text-center font-bold mb-1" style={{ color: deckMode === "TEST_PREP" ? colors.primary : colors.text }}>
                      Test Prep
                    </Text>
                    <Text className="text-xs text-center leading-4" style={{ color: colors.textSecondary }}>
                      Intensive schedule based on test date
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setDeckMode("LONG_TERM")}
                    className="flex-1 rounded-xl p-4 border-2"
                    style={{
                      backgroundColor: deckMode === "LONG_TERM" ? colors.success + "20" : colors.surface,
                      borderColor: deckMode === "LONG_TERM" ? colors.success : colors.border,
                    }}
                  >
                    <View className="items-center justify-center mb-2">
                      <Ionicons
                        name="repeat"
                        size={20}
                        color={deckMode === "LONG_TERM" ? colors.success : colors.textSecondary}
                      />
                    </View>
                    <Text className="text-center font-bold mb-1" style={{ color: deckMode === "LONG_TERM" ? colors.success : colors.text }}>
                      Long-term
                    </Text>
                    <Text className="text-xs text-center leading-4" style={{ color: colors.textSecondary }}>
                      Scientific spaced repetition for memory
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Mode Description */}
              {deckMode === "TEST_PREP" && (
                <View className="mb-6 p-4 rounded-xl" style={{ backgroundColor: "#dbeafe" }}>
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="information-circle" size={18} color="#2563eb" style={{ marginRight: 6 }} />
                    <Text className="text-sm font-semibold" style={{ color: "#2563eb" }}>
                      Test Prep Details
                    </Text>
                  </View>
                  <Text className="text-xs leading-5" style={{ color: "#1e3a8a" }}>
                    Smart scheduling adapts to days until test. Includes final review day before exam and emergency mode on test day. Tracks struggling cards with extra attention.
                  </Text>
                </View>
              )}

              {deckMode === "LONG_TERM" && (
                <View className="mb-6 p-4 rounded-xl" style={{ backgroundColor: colors.success + "15" }}>
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="information-circle" size={18} color={colors.success} style={{ marginRight: 6 }} />
                    <Text className="text-sm font-semibold" style={{ color: colors.success }}>
                      Long-Term Details
                    </Text>
                  </View>
                  <Text className="text-xs leading-5" style={{ color: "#064e3b" }}>
                    Uses FSRS algorithm (scientifically proven) to optimize reviews. Adapts intervals based on your memory performance to achieve 90% retention efficiently.
                  </Text>
                </View>
              )}

              {/* Test Date (only for TEST_PREP) */}
              {deckMode === "TEST_PREP" && (
                <View className="mb-6">
                  <Text className="text-base font-semibold mb-2" style={{ color: colors.text }}>
                    Test Date *
                  </Text>
                  <Pressable
                    onPress={() => setShowDatePicker(true)}
                    className="rounded-xl px-4 py-4 border"
                    style={{ 
                      backgroundColor: colors.surface,
                      borderColor: testDate ? colors.border : colors.error,
                    }}
                  >
                    <Text className="text-base" style={{ color: testDate ? colors.text : colors.textSecondary }}>
                      {testDate ? format(testDate, "MMMM d, yyyy") : "Select test date"}
                    </Text>
                  </Pressable>
                  {showDatePicker && (
                    <DateTimePicker
                      value={testDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)}
                      mode="date"
                      display="spinner"
                      onChange={handleDateChange}
                      minimumDate={new Date()}
                    />
                  )}
                </View>
              )}

              {/* Color Selection */}
              <View className="mb-6">
                <Text className="text-base font-semibold mb-2" style={{ color: colors.text }}>
                  Color
                </Text>
                <View className="flex-row flex-wrap gap-3">
                  {COLORS.map((color) => (
                    <Pressable
                      key={color.value}
                      onPress={() => setSelectedColor(color.value)}
                      className="w-14 h-14 rounded-full items-center justify-center border-2"
                      style={{
                        backgroundColor: color.value,
                        borderColor: selectedColor === color.value ? colors.text : "transparent",
                      }}
                    >
                      {selectedColor === color.value && (
                        <Ionicons name="checkmark" size={24} color="white" />
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Emoji Selection */}
              <View className="mb-6">
                <Text className="text-base font-semibold mb-2" style={{ color: colors.text }}>
                  Icon
                </Text>
                <View className="flex-row flex-wrap gap-3">
                  {EMOJIS.map((emoji) => (
                    <Pressable
                      key={emoji}
                      onPress={() => setSelectedEmoji(emoji)}
                      className="w-14 h-14 rounded-xl items-center justify-center border-2"
                      style={{
                        backgroundColor: colors.surface,
                        borderColor: selectedEmoji === emoji ? colors.primary : colors.border,
                      }}
                    >
                      <Text className="text-2xl">{emoji}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </ScrollView>

            {/* Create Button */}
            <View className="px-5 pb-5">
              <Pressable
                onPress={handleCreateDeck}
                className="rounded-2xl py-5 active:opacity-80"
                style={{ backgroundColor: colors.primary }}
              >
                <Text className="text-white text-lg font-bold text-center">
                  Create Deck & Add Flashcards
                </Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

