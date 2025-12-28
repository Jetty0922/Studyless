import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
  StyleSheet,
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
import { Card, Button } from "../components/ui";
import {
  generateFlashcardsFromImage,
  generateFlashcardsFromFile,
} from "../utils/aiFlashcardGenerator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const decks = useFlashcardStore((s) => s.decks);
  const flashcards = useFlashcardStore((s) => s.flashcards);
  const stats = useFlashcardStore((s) => s.stats);
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

  useEffect(() => {
    const decksNeedingDialog = getDecksNeedingPostTestDialog();
    if (decksNeedingDialog.length > 0) {
      setCurrentPostTestDeck(decksNeedingDialog[0].id);
      setShowPostTestDialog(true);
    }
  }, [getDecksNeedingPostTestDialog]);

  const dueCards = getDueCards();

  const upcomingTests = decks
    .filter((d) => d.mode === "TEST_PREP" && d.testDate && new Date(d.testDate) >= new Date())
    .map((deck) => {
      const deckCards = flashcards.filter((card) => card.deckId === deck.id);
      const masteredCount = deckCards.filter((c) => c.mastery === "MASTERED").length;
      const readyPercentage = deckCards.length > 0 ? Math.round((masteredCount / deckCards.length) * 100) : 0;
      const daysLeft = differenceInDays(new Date(deck.testDate!), new Date());
      return { ...deck, readyPercentage, daysLeft, cardCount: deckCards.length };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 3);

  const handleStartStudying = () => {
    if (dueCards.length === 0) {
      Alert.alert("All Caught Up!", "You have no cards due for review right now. Great job!");
      return;
    }
    navigation.navigate("Review", { cards: dueCards.map((c) => c.id) });
  };

  const processAndGenerateFlashcards = async (uri: string, mimeType?: string) => {
    setIsGenerating(true);
    setGeneratingMessage("Analyzing content with AI...");
    
    // Add timeout wrapper
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Request timed out. Please try again.")), 60000);
    });
    
    try {
      let generatedCards;
      if (mimeType?.startsWith("image/") || uri.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/)) {
        setGeneratingMessage("Reading image...");
        generatedCards = await Promise.race([generateFlashcardsFromImage(uri), timeoutPromise]);
      } else {
        setGeneratingMessage("Processing file...");
        generatedCards = await Promise.race([generateFlashcardsFromFile(uri, mimeType), timeoutPromise]);
      }
      if (generatedCards.length === 0) {
        Alert.alert("No Content Found", "Could not generate flashcards from this file.");
        return;
      }
      navigation.navigate("DeckSelection", { flashcards: generatedCards, sourceUri: uri });
    } catch (error: any) {
      Alert.alert("Generation Failed", error.message || "Could not generate flashcards. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTakePhoto = async () => {
    setShowGenerateModal(false);
    await new Promise(resolve => setTimeout(resolve, 300));
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Camera permission is required to take photos");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.8 });
      if (!result.canceled && result.assets[0]) {
        await processAndGenerateFlashcards(result.assets[0].uri, result.assets[0].mimeType);
      }
    } catch {
      Alert.alert("Error", "Failed to take photo. Please try again.");
    }
  };

  const handlePickImage = async () => {
    setShowGenerateModal(false);
    await new Promise(resolve => setTimeout(resolve, 300));
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"] as any, allowsEditing: false, quality: 0.8 });
      if (!result.canceled && result.assets[0]) {
        await processAndGenerateFlashcards(result.assets[0].uri, result.assets[0].mimeType);
      }
    } catch {
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const handlePickFile = async () => {
    setShowGenerateModal(false);
    await new Promise(resolve => setTimeout(resolve, 300));
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
      if (!result.canceled && result.assets[0]) {
        await processAndGenerateFlashcards(result.assets[0].uri, result.assets[0].mimeType);
      }
    } catch {
      Alert.alert("Error", "Failed to pick file. Please try again.");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Home</Text>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {/* Study Card */}
            {dueCards.length === 0 ? (
              <Card variant="outlined" style={styles.studyCard}>
                <View style={styles.studyCardEmpty}>
                  <View style={[styles.checkIcon, { backgroundColor: colors.successLight }]}>
                    <Ionicons name="checkmark-circle" size={32} color={colors.success} />
                  </View>
                  <Text style={[styles.studyCardEmptyTitle, { color: colors.text }]}>All Caught Up!</Text>
                  <Text style={[styles.studyCardEmptyText, { color: colors.textSecondary }]}>
                    No cards due for review. Great work!
                  </Text>
                </View>
              </Card>
            ) : (
              <Card variant="elevated" style={{ ...styles.studyCard, backgroundColor: colors.primary }}>
                <View style={styles.studyCardContent}>
                  <View style={styles.studyCardLeft}>
                    <Text style={styles.studyCardLabel}>Cards Due</Text>
                    <Text style={styles.studyCardCount}>{dueCards.length}</Text>
                  </View>
                  <Pressable 
                    onPress={handleStartStudying}
                    style={styles.studyButton}
                  >
                    <Text style={[styles.studyButtonText, { color: colors.primary }]}>Start Studying</Text>
                    <Ionicons name="arrow-forward" size={18} color={colors.primary} />
                  </Pressable>
                </View>
              </Card>
            )}

            {/* AI Generate Button */}
            <Button
              title="Generate with AI"
              onPress={() => setShowGenerateModal(true)}
              variant="secondary"
              size="large"
              icon={<Ionicons name="sparkles" size={20} color={colors.primary} />}
              style={styles.addButton}
            />

            {/* Upcoming Tests */}
            {upcomingTests.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Upcoming Tests</Text>
                <Card variant="outlined" padding={0}>
                  {upcomingTests.map((test, index) => {
                    const urgencyColor = test.daysLeft <= 3 ? colors.error : test.daysLeft <= 7 ? colors.warning : colors.primary;
                    const isLast = index === upcomingTests.length - 1;
                    return (
                      <Pressable
                        key={test.id}
                        onPress={() => navigation.navigate("Deck", { deckId: test.id })}
                        style={[
                          styles.testItem,
                          !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
                        ]}
                      >
                        <View style={styles.testItemLeft}>
                          <View style={[styles.testDot, { backgroundColor: test.color }]} />
                          <View style={styles.testInfo}>
                            <Text style={[styles.testName, { color: colors.text }]}>{test.name}</Text>
                            <Text style={[styles.testDate, { color: colors.textSecondary }]}>
                              {format(new Date(test.testDate!), "MMM d, yyyy")} • {test.readyPercentage}% ready
                            </Text>
                          </View>
                        </View>
                        <View style={[styles.testDays, { backgroundColor: isDark ? `${urgencyColor}20` : `${urgencyColor}15` }]}>
                          <Text style={[styles.testDaysText, { color: urgencyColor }]}>
                            {test.daysLeft === 0 ? "Today" : test.daysLeft === 1 ? "1 day" : `${test.daysLeft} days`}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </Card>
              </View>
            )}

            <View style={{ height: 32 }} />
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Generate Options Modal */}
      <Modal visible={showGenerateModal} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowGenerateModal(false)}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="sparkles" size={20} color={colors.primary} />
              <Text style={[styles.modalTitle, { color: colors.text }]}>AI Flashcard Generator</Text>
            </View>
            <Pressable onPress={() => setShowGenerateModal(false)} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>
          <View style={styles.modalContent}>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Upload your notes and AI will create flashcards automatically
            </Text>
            
            <Card variant="outlined" padding={0} style={styles.modalOption}>
              <Pressable onPress={handleTakePhoto} style={styles.modalOptionContent}>
                <View style={[styles.modalOptionIcon, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="camera-outline" size={24} color={colors.primary} />
                </View>
                <View style={styles.modalOptionText}>
                  <Text style={[styles.modalOptionTitle, { color: colors.text }]}>Take Photo</Text>
                  <Text style={[styles.modalOptionSubtitle, { color: colors.textSecondary }]}>
                    Capture your notes with camera
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </Pressable>
            </Card>

            <Card variant="outlined" padding={0} style={styles.modalOption}>
              <Pressable onPress={handlePickImage} style={styles.modalOptionContent}>
                <View style={[styles.modalOptionIcon, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="image-outline" size={24} color={colors.primary} />
                </View>
                <View style={styles.modalOptionText}>
                  <Text style={[styles.modalOptionTitle, { color: colors.text }]}>Upload Image</Text>
                  <Text style={[styles.modalOptionSubtitle, { color: colors.textSecondary }]}>
                    Choose from your photo library
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </Pressable>
            </Card>

            <Card variant="outlined" padding={0} style={styles.modalOption}>
              <Pressable onPress={handlePickFile} style={styles.modalOptionContent}>
                <View style={[styles.modalOptionIcon, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="document-outline" size={24} color={colors.primary} />
                </View>
                <View style={styles.modalOptionText}>
                  <Text style={[styles.modalOptionTitle, { color: colors.text }]}>Upload File</Text>
                  <Text style={[styles.modalOptionSubtitle, { color: colors.textSecondary }]}>
                    PDF, Word, or text documents
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </Pressable>
            </Card>
          </View>
        </View>
      </Modal>

      {/* Generating Modal */}
      <Modal visible={isGenerating} transparent animationType="fade">
        <View style={styles.loadingOverlay}>
          <Card variant="elevated" style={styles.loadingCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingTitle, { color: colors.text }]}>Generating Flashcards</Text>
            <Text style={[styles.loadingSubtitle, { color: colors.textSecondary }]}>{generatingMessage}</Text>
          </Card>
        </View>
      </Modal>

      {/* Post-Test Dialogs */}
      {currentPostTestDeck && (
        <>
          <PostTestDialog
            visible={showPostTestDialog}
            deckName={decks.find((d) => d.id === currentPostTestDeck)?.name || ""}
            onTestResponse={() => { setShowPostTestDialog(false); setShowLongTermDialog(true); }}
            onClose={() => { setShowPostTestDialog(false); markPostTestDialogShown(currentPostTestDeck); setCurrentPostTestDeck(null); }}
          />
          <LongTermDialog
            visible={showLongTermDialog}
            deckName={decks.find((d) => d.id === currentPostTestDeck)?.name || ""}
            onYes={() => { toggleLongTermMode(currentPostTestDeck, "LONG_TERM"); setShowLongTermDialog(false); setCurrentPostTestDeck(null); Alert.alert("Long-term Mode Enabled", "You will review these cards periodically."); }}
            onNo={() => { setShowLongTermDialog(false); setCurrentPostTestDeck(null); }}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  safeArea: { 
    flex: 1 
  },
  header: { 
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20, 
    paddingTop: 16, 
    paddingBottom: 12 
  },
  headerTitle: { 
    fontSize: 28, 
    fontWeight: "700", 
    letterSpacing: -0.5 
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  streakText: {
    fontSize: 14,
    fontWeight: "700",
  },
  scrollView: { 
    flex: 1 
  },
  content: { 
    paddingHorizontal: 20, 
    paddingTop: 8 
  },
  studyCard: { 
    marginBottom: 16 
  },
  studyCardEmpty: {
    alignItems: "center",
    paddingVertical: 24,
  },
  checkIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  studyCardEmptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  studyCardEmptyText: {
    fontSize: 14,
  },
  studyCardContent: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between" 
  },
  studyCardLeft: {},
  studyCardLabel: { 
    fontSize: 14, 
    color: "rgba(255,255,255,0.8)", 
    fontWeight: "500", 
    marginBottom: 2 
  },
  studyCardCount: { 
    fontSize: 48, 
    fontWeight: "700", 
    color: "#ffffff" 
  },
  studyButton: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#ffffff", 
    paddingVertical: 10, 
    paddingHorizontal: 16, 
    borderRadius: 8, 
    gap: 6 
  },
  studyButtonText: { 
    fontSize: 15, 
    fontWeight: "600" 
  },
  addButton: {
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: { 
    fontSize: 17, 
    fontWeight: "600", 
    marginBottom: 12 
  },
  testItem: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between", 
    padding: 14,
  },
  testItemLeft: { 
    flexDirection: "row", 
    alignItems: "center", 
    flex: 1 
  },
  testDot: { 
    width: 10, 
    height: 10, 
    borderRadius: 5, 
    marginRight: 12 
  },
  testInfo: { 
    flex: 1 
  },
  testName: { 
    fontSize: 15, 
    fontWeight: "600", 
    marginBottom: 2 
  },
  testDate: { 
    fontSize: 13 
  },
  testDays: { 
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  testDaysText: { 
    fontSize: 12, 
    fontWeight: "600" 
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  modalContainer: { 
    flex: 1 
  },
  modalHeader: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between", 
    paddingHorizontal: 20, 
    paddingVertical: 16, 
    borderBottomWidth: 1 
  },
  modalTitle: { 
    fontSize: 18, 
    fontWeight: "600" 
  },
  modalContent: { 
    padding: 20 
  },
  modalSubtitle: { 
    fontSize: 14, 
    marginBottom: 20 
  },
  modalOption: { 
    marginBottom: 12 
  },
  modalOptionContent: {
    flexDirection: "row", 
    alignItems: "center", 
    padding: 16,
  },
  modalOptionIcon: { 
    width: 48, 
    height: 48, 
    borderRadius: 12, 
    alignItems: "center", 
    justifyContent: "center", 
    marginRight: 14 
  },
  modalOptionText: { 
    flex: 1 
  },
  modalOptionTitle: { 
    fontSize: 16, 
    fontWeight: "600", 
    marginBottom: 2 
  },
  modalOptionSubtitle: { 
    fontSize: 13 
  },
  loadingOverlay: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    backgroundColor: "rgba(0,0,0,0.5)" 
  },
  loadingCard: { 
    padding: 32, 
    alignItems: "center", 
    minWidth: 260,
    marginHorizontal: 40,
  },
  loadingTitle: { 
    fontSize: 18, 
    fontWeight: "600", 
    marginTop: 16 
  },
  loadingSubtitle: { 
    fontSize: 14, 
    marginTop: 8 
  },
});
