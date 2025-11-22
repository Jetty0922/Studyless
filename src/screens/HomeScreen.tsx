import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  Alert,
  Modal,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useFlashcardStore } from "../state/flashcardStore";
import { RootStackParamList } from "../navigation/RootNavigator";
import { format, differenceInDays } from "date-fns";
import { PostTestDialog, LongTermDialog } from "../components/PostTestDialog";
import { useTheme } from "../utils/useTheme";
import {
  generateFlashcardsFromImage,
  generateFlashcardsFromFile,
} from "../utils/aiFlashcardGenerator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const decks = useFlashcardStore((s) => s.decks);
  const flashcards = useFlashcardStore((s) => s.flashcards);
  const getDueCards = useFlashcardStore((s) => s.getDueCards);
  const getDecksNeedingPostTestDialog = useFlashcardStore((s) => s.getDecksNeedingPostTestDialog);
  const markPostTestDialogShown = useFlashcardStore((s) => s.markPostTestDialogShown);
  const toggleLongTermMode = useFlashcardStore((s) => s.toggleLongTermMode);

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingMessage, setGeneratingMessage] = useState("Processing...");
  const [showPostTestDialog, setShowPostTestDialog] = useState(false);
  const [showLongTermDialog, setShowLongTermDialog] = useState(false);
  const [currentPostTestDeck, setCurrentPostTestDeck] = useState<string | null>(null);
  const [testResponse, setTestResponse] = useState<string | null>(null);

  // Check for decks needing post-test dialog on mount
  useEffect(() => {
    const decksNeedingDialog = getDecksNeedingPostTestDialog();
    if (decksNeedingDialog.length > 0) {
      setCurrentPostTestDeck(decksNeedingDialog[0].id);
      setShowPostTestDialog(true);
    }
  }, []);

  const dueCards = getDueCards();

  // Get upcoming tests - only show TEST_PREP mode decks with future test dates
  const upcomingTests = decks
    .filter((d) => d.mode === "TEST_PREP" && d.testDate && new Date(d.testDate) >= new Date())
    .map((deck) => {
      const deckCards = flashcards.filter((card) => card.deckId === deck.id);

      const masteredCount = deckCards.filter(
        (c) => c.mastery === "MASTERED"
      ).length;
      const readyPercentage = deckCards.length > 0
        ? Math.round((masteredCount / deckCards.length) * 100)
        : 0;

      const daysLeft = differenceInDays(new Date(deck.testDate!), new Date());

      return {
        ...deck,
        readyPercentage,
        daysLeft,
        cardCount: deckCards.length,
      };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 3);

  const handleStartStudying = () => {
    if (dueCards.length === 0) {
      Alert.alert(
        "All Caught Up!",
        "You have no cards due for review right now. Great job!"
      );
      return;
    }

    navigation.navigate("Review", {
      cards: dueCards.map((c) => c.id),
    });
  };

  const processAndGenerateFlashcards = async (uri: string, mimeType?: string) => {
    try {
      setIsGenerating(true);
      setGeneratingMessage("Analyzing content with AI...");

      let flashcards;
      
      // Determine if it's an image or other file type
      if (mimeType?.startsWith("image/") || uri.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/)) {
        setGeneratingMessage("Reading image...");
        flashcards = await generateFlashcardsFromImage(uri);
      } else {
        setGeneratingMessage("Processing file...");
        flashcards = await generateFlashcardsFromFile(uri, mimeType);
      }

      setIsGenerating(false);

      if (flashcards.length === 0) {
        Alert.alert(
          "No Content Found",
          "Could not generate flashcards from this file. Please try a different file with clear study material."
        );
        return;
      }

      // Navigate to deck selection screen
      navigation.navigate("DeckSelection", {
        flashcards,
        sourceUri: uri,
      });
    } catch (error: any) {
      setIsGenerating(false);
      console.error("Error processing file:", error);
      Alert.alert(
        "Generation Failed",
        error.message || "Could not generate flashcards. Please try again or make sure you have set up your API key."
      );
    }
  };

  const handleTakePhoto = async () => {
    setShowGenerateModal(false);
    
    // Small delay to ensure modal closes before opening picker
    await new Promise(resolve => setTimeout(resolve, 300));
    
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Camera permission is required to take photos"
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await processAndGenerateFlashcards(result.assets[0].uri, result.assets[0].mimeType);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert("Error", "Failed to take photo. Please try again.");
    }
  };

  const handlePickImage = async () => {
    setShowGenerateModal(false);
    
    // Small delay to ensure modal closes before opening picker
    await new Promise(resolve => setTimeout(resolve, 300));
    
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"] as any,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await processAndGenerateFlashcards(result.assets[0].uri, result.assets[0].mimeType);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const handlePickFile = async () => {
    setShowGenerateModal(false);
    
    // Small delay to ensure modal closes before opening picker
    await new Promise(resolve => setTimeout(resolve, 300));
    
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        await processAndGenerateFlashcards(file.uri, file.mimeType);
      }
    } catch (error) {
      console.error("Error picking file:", error);
      Alert.alert("Error", "Failed to pick file. Please try again.");
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }} edges={["top"]}>
      <View className="flex-1">
        {/* Header */}
        <View className="px-6 pt-6 pb-4 border-b" style={{ backgroundColor: colors.surface, borderBottomColor: colors.border }}>
          <Text className="text-3xl font-bold" style={{ color: colors.text }}>Home</Text>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-6 py-6">
            {/* Start Studying Card */}
            {dueCards.length === 0 ? (
              <View
                className="rounded-3xl p-6 mb-4"
                style={{ backgroundColor: colors.success }}
              >
                <View className="items-center py-4">
                  <Text className="text-8xl mb-4">🎉</Text>
                  <Text className="text-white text-3xl font-bold mb-2">
                    All Caught Up!
                  </Text>
                  <Text className="text-white/90 text-lg text-center">
                    No cards due for review right now.
                  </Text>
                  <Text className="text-white/90 text-lg text-center">
                    Great job!
                  </Text>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={handleStartStudying}
                className="rounded-3xl p-6 mb-4 active:opacity-90"
                style={{ backgroundColor: colors.primary }}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-white/90 text-base font-medium mb-2">
                      Cards Due Today
                    </Text>
                    <Text className="text-white text-6xl font-bold mb-3">
                      {dueCards.length}
                    </Text>
                    <View className="bg-white rounded-xl py-3 px-4 self-start">
                      <Text className="text-lg font-bold" style={{ color: colors.primary }}>
                        Start Studying
                      </Text>
                    </View>
                  </View>
                  <View className="w-20 h-20 bg-white/20 rounded-full items-center justify-center">
                    <Ionicons name="book" size={40} color="white" />
                  </View>
                </View>
              </Pressable>
            )}

            {/* Generate Flashcards Button */}
            <Pressable
              onPress={() => setShowGenerateModal(true)}
              className="rounded-3xl p-5 mb-4 border active:opacity-90"
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}
            >
              <View className="flex-row items-center">
                <View className="w-14 h-14 rounded-2xl items-center justify-center mr-4" style={{ backgroundColor: colors.success }}>
                  <Ionicons name="sparkles" size={28} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-bold mb-1" style={{ color: colors.text }}>
                    Generate Flashcards
                  </Text>
                  <Text className="text-sm" style={{ color: colors.textSecondary }}>
                    Upload photos or files with AI
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
              </View>
            </Pressable>

            {/* Upcoming Tests */}
            {upcomingTests.length > 0 && (
              <View className="rounded-3xl p-5 mb-4" style={{ backgroundColor: colors.surface }}>
                <Text className="text-xl font-bold mb-4" style={{ color: colors.text }}>
                  Upcoming Tests
                </Text>
                <View className="gap-3">
                  {upcomingTests.map((test) => {
                    const urgencyColor = test.daysLeft <= 3 ? "#ef4444" : test.daysLeft <= 7 ? "#f97316" : colors.primary;

                    return (
                      <Pressable
                        key={test.id}
                        onPress={() => navigation.navigate("Deck", { deckId: test.id })}
                        className="rounded-2xl p-4 active:opacity-70"
                        style={{ backgroundColor: colors.surface }}
                      >
                        <View className="flex-row items-center justify-between">
                          <View className="flex-1 flex-row items-center">
                            <View
                              className="w-3 h-3 rounded-full mr-3"
                              style={{ backgroundColor: test.color }}
                            />
                            <View className="flex-1">
                              <Text className="font-bold text-base mb-0.5" style={{ color: colors.text }}>
                                {test.name}
                              </Text>
                              <Text className="text-xs" style={{ color: colors.textSecondary }}>
                                {format(new Date(test.testDate!), "MMM d, yyyy")}
                              </Text>
                            </View>
                          </View>
                          <View className="items-end">
                            <Text className="text-2xl font-bold mb-0.5" style={{ color: urgencyColor }}>
                              {test.daysLeft === 0 ? "Today" : test.daysLeft === 1 ? "1d" : `${test.daysLeft}d`}
                            </Text>
                            <Text className="text-xs" style={{ color: colors.textSecondary }}>
                              {test.readyPercentage}% ready
                            </Text>
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            <View className="h-8" />
          </View>
        </ScrollView>
      </View>

      {/* Generate Options Modal */}
      <Modal
        visible={showGenerateModal}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setShowGenerateModal(false)}
      >
        <SafeAreaView className="flex-1" style={{ backgroundColor: colors.surface }} edges={["top"]}>
          <View className="flex-1">
            <View className="flex-row items-center justify-between px-5 py-4 border-b" style={{ borderBottomColor: colors.border }}>
              <Text className="text-xl font-bold" style={{ color: colors.text }}>
                Generate Flashcards
              </Text>
              <Pressable
                onPress={() => setShowGenerateModal(false)}
                className="active:opacity-70"
              >
                <Ionicons name="close" size={28} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View className="px-5 py-6">
              <Text className="text-base mb-6" style={{ color: colors.textSecondary }}>
                Choose how you want to create flashcards
              </Text>

              <Pressable
                onPress={handleTakePhoto}
                className="border-2 rounded-3xl p-6 mb-4 active:opacity-70"
                style={{ backgroundColor: colors.blueLight, borderColor: colors.primary }}
              >
                <View className="flex-row items-center">
                  <View className="w-14 h-14 rounded-full items-center justify-center mr-4" style={{ backgroundColor: colors.primary }}>
                    <Ionicons name="camera" size={28} color="white" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-bold mb-1" style={{ color: colors.text }}>
                      Take Photo
                    </Text>
                    <Text className="text-sm" style={{ color: colors.textSecondary }}>
                      Capture your notes with camera
                    </Text>
                  </View>
                </View>
              </Pressable>

              <Pressable
                onPress={handlePickImage}
                className="border-2 rounded-3xl p-6 mb-4 active:opacity-70"
                style={{ backgroundColor: colors.purpleLight, borderColor: colors.purple }}
              >
                <View className="flex-row items-center">
                  <View className="w-14 h-14 rounded-full items-center justify-center mr-4" style={{ backgroundColor: colors.purple }}>
                    <Ionicons name="image" size={28} color="white" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-bold mb-1" style={{ color: colors.text }}>
                      Upload Image
                    </Text>
                    <Text className="text-sm" style={{ color: colors.textSecondary }}>
                      Choose from your photo library
                    </Text>
                  </View>
                </View>
              </Pressable>

              <Pressable
                onPress={handlePickFile}
                className="border-2 rounded-3xl p-6 active:opacity-70"
                style={{ backgroundColor: colors.orangeLight, borderColor: colors.orange }}
              >
                <View className="flex-row items-center">
                  <View className="w-14 h-14 rounded-full items-center justify-center mr-4" style={{ backgroundColor: colors.orange }}>
                    <Ionicons name="document" size={28} color="white" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-bold mb-1" style={{ color: colors.text }}>
                      Upload File
                    </Text>
                    <Text className="text-sm" style={{ color: colors.textSecondary }}>
                      PDF, Word, or text documents
                    </Text>
                  </View>
                </View>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Generating Flashcards Modal */}
      <Modal
        visible={isGenerating}
        transparent
        animationType="fade"
      >
        <View className="flex-1 justify-center items-center" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
          <View className="rounded-3xl p-8 mx-6" style={{ backgroundColor: colors.surface, minWidth: 280 }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text className="text-xl font-bold text-center mt-6" style={{ color: colors.text }}>
              Generating Flashcards
            </Text>
            <Text className="text-base text-center mt-2" style={{ color: colors.textSecondary }}>
              {generatingMessage}
            </Text>
            <Text className="text-sm text-center mt-4" style={{ color: colors.textSecondary }}>
              This may take 10-30 seconds...
            </Text>
          </View>
        </View>
      </Modal>

      {/* Post-Test Dialogs */}
      {currentPostTestDeck && (
        <>
          <PostTestDialog
            visible={showPostTestDialog}
            deckName={decks.find((d) => d.id === currentPostTestDeck)?.name || ""}
            onTestResponse={(response) => {
              setTestResponse(response);
              setShowPostTestDialog(false);
              setShowLongTermDialog(true);
            }}
            onClose={() => {
              setShowPostTestDialog(false);
              markPostTestDialogShown(currentPostTestDeck);
              setCurrentPostTestDeck(null);
            }}
          />

          <LongTermDialog
            visible={showLongTermDialog}
            deckName={decks.find((d) => d.id === currentPostTestDeck)?.name || ""}
            onYes={() => {
              toggleLongTermMode(currentPostTestDeck, "LONG_TERM");
              setShowLongTermDialog(false);
              setCurrentPostTestDeck(null);
              Alert.alert(
                "Long-term Mode Enabled",
                "You will review these cards every 2 weeks to maintain your knowledge."
              );
            }}
            onNo={() => {
              // Archive the deck by deleting it or marking as completed
              // For now, we'll just close the dialog - user can manage from deck settings
              setShowLongTermDialog(false);
              setCurrentPostTestDeck(null);
              Alert.alert(
                "Deck Unchanged",
                "You can switch to long-term mode anytime from deck settings."
              );
            }}
          />
        </>
      )}
    </SafeAreaView>
  );
}
