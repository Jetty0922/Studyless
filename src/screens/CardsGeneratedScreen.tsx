import React, { useState } from "react";
import { View, Text, Pressable, TextInput, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import { useFlashcardStore } from "../state/flashcardStore";
import { useTheme } from "../utils/useTheme";

type CardsGeneratedScreenProps = {
  navigation: any;
  route: {
    params: {
      photoUri: string;
      cardCount: number;
    };
  };
};

export default function CardsGeneratedScreen({ navigation, route }: CardsGeneratedScreenProps) {
  const { colors } = useTheme();
  const { cardCount } = route.params;
  const [testDate, setTestDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // Default 7 days from now
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [deckName, setDeckName] = useState("");

  const addDeck = useFlashcardStore((s) => s.addDeck);
  const completeOnboarding = useFlashcardStore((s) => s.completeOnboarding);

  const handleStartStudying = () => {
    // Create deck with color and emoji in TEST_PREP mode (onboarding default)
    addDeck(
      deckName || `Test - ${format(testDate, "MMM d, yyyy")}`,
      "#3b82f6", // Default blue color
      "📚", // Default book emoji
      testDate,
      "TEST_PREP" // Onboarding defaults to test prep mode
    );

    // Complete onboarding - this will cause the app to re-render and show MainTabs
    completeOnboarding();

    // Navigate to MainTabs (the deck will be visible in the Decks tab)
    navigation.navigate("MainTabs");
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setTestDate(selectedDate);
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
          <View className="flex-1 justify-center py-8">
            {/* Success Icon */}
            <View className="items-center mb-6">
              <Text className="text-7xl mb-4">✨</Text>
              <Text className="text-4xl font-bold text-center" style={{ color: colors.text }}>
                {cardCount} cards created!
              </Text>
            </View>

            {/* Preview Cards */}
            <View className="mb-6">
              <Text className="text-lg font-semibold mb-3" style={{ color: colors.text }}>
                Preview (first 3 cards):
              </Text>
              <PreviewCard front="What is photosynthesis?" back="The process by which plants convert light energy into chemical energy" />
              <PreviewCard front="What is the mitochondria?" back="The powerhouse of the cell" />
              <PreviewCard front="What is DNA?" back="Deoxyribonucleic acid, the molecule that carries genetic information" />
            </View>

            {/* Test Date */}
            <View className="mb-4">
              <Text className="text-base font-semibold mb-2" style={{ color: colors.text }}>
                When is your test for these?
              </Text>
              <Pressable
                onPress={() => setShowDatePicker(true)}
                className="rounded-xl px-4 py-4"
                style={{ backgroundColor: colors.surface }}
              >
                <Text className="text-base" style={{ color: colors.text }}>
                  {format(testDate, "MMMM d, yyyy")}
                </Text>
              </Pressable>

              {showDatePicker && (
                <DateTimePicker
                  value={testDate}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                />
              )}
            </View>

            {/* Deck Name */}
            <View className="mb-8">
              <Text className="text-base font-semibold mb-2" style={{ color: colors.text }}>
                What would you like to name this deck? (optional)
              </Text>
              <TextInput
                value={deckName}
                onChangeText={setDeckName}
                placeholder="Enter deck name or leave blank"
                placeholderTextColor={colors.textSecondary}
                className="rounded-xl px-4 py-4 text-base"
                style={{ backgroundColor: colors.surface, color: colors.text }}
              />
            </View>

            {/* Start Studying Button */}
            <Pressable
              onPress={handleStartStudying}
              className="bg-blue-600 rounded-2xl py-5"
            >
              <Text className="text-white text-xl font-bold text-center">
                Start Studying
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PreviewCard({ front, back }: { front: string; back: string }) {
  const { colors } = useTheme();
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <Pressable
      onPress={() => setIsFlipped(!isFlipped)}
      className="rounded-xl p-4 mb-3"
      style={{ backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border }}
    >
      <Text className="text-xs mb-2" style={{ color: colors.textSecondary }}>
        {isFlipped ? "Back:" : "Front:"}
      </Text>
      <Text className="text-base" style={{ color: colors.text }}>
        {isFlipped ? back : front}
      </Text>
      <Text className="text-xs mt-2" style={{ color: colors.primary }}>Tap to flip</Text>
    </Pressable>
  );
}
