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
import { LinearGradient } from "expo-linear-gradient";
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
import { GlassCard } from "../components/ui";
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

  useEffect(() => {
    const decksNeedingDialog = getDecksNeedingPostTestDialog();
    if (decksNeedingDialog.length > 0) {
      setCurrentPostTestDeck(decksNeedingDialog[0].id);
      setShowPostTestDialog(true);
    }
  }, []);

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
    try {
      setIsGenerating(true);
      setGeneratingMessage("Analyzing content with AI...");
      let flashcards;
      if (mimeType?.startsWith("image/") || uri.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/)) {
        setGeneratingMessage("Reading image...");
        flashcards = await generateFlashcardsFromImage(uri);
      } else {
        setGeneratingMessage("Processing file...");
        flashcards = await generateFlashcardsFromFile(uri, mimeType);
      }
      setIsGenerating(false);
      if (flashcards.length === 0) {
        Alert.alert("No Content Found", "Could not generate flashcards from this file.");
        return;
      }
      navigation.navigate("DeckSelection", { flashcards, sourceUri: uri });
    } catch (error: any) {
      setIsGenerating(false);
      Alert.alert("Generation Failed", error.message || "Could not generate flashcards.");
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
      Alert.alert("Error", "Failed to pick file. Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={isDark ? ["#0f172a", "#1e1b4b"] : ["#f8fafc", "#eef2ff"]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Floating shapes */}
      <View style={[styles.floatingShape, styles.shape1, { backgroundColor: isDark ? "#667eea" : "#a5b4fc" }]} />
      <View style={[styles.floatingShape, styles.shape2, { backgroundColor: isDark ? "#f093fb" : "#c4b5fd" }]} />
      <View style={[styles.floatingShape, styles.shape3, { backgroundColor: isDark ? "#4facfe" : "#93c5fd" }]} />

      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Home</Text>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {/* Start Studying Card */}
            {dueCards.length === 0 ? (
              <GlassCard style={styles.heroCard}>
                <LinearGradient
                  colors={["#10b981", "#059669"]}
                  style={StyleSheet.absoluteFillObject}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  pointerEvents="none"
                />
                <View style={styles.heroContent}>
                  <View style={styles.heroIconContainer}>
                    <Ionicons name="checkmark-circle" size={48} color="#ffffff" />
                  </View>
                  <Text style={styles.heroTitle}>All Caught Up!</Text>
                  <Text style={styles.heroSubtitle}>No cards due for review right now. Great job!</Text>
                </View>
              </GlassCard>
            ) : (
              <Pressable onPress={handleStartStudying}>
                <GlassCard style={styles.heroCard}>
                  <LinearGradient
                    colors={["#667eea", "#764ba2"]}
                    style={StyleSheet.absoluteFillObject}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    pointerEvents="none"
                  />
                  <View style={styles.studyCardContent}>
                    <View style={styles.studyCardLeft}>
                      <Text style={styles.studyCardLabel}>Cards Due Today</Text>
                      <Text style={styles.studyCardCount}>{dueCards.length}</Text>
                      <View style={styles.studyButton}>
                        <Text style={styles.studyButtonText}>Start Studying</Text>
                        <Ionicons name="arrow-forward" size={18} color="#667eea" />
                      </View>
                    </View>
                    <View style={styles.studyCardIcon}>
                      <Ionicons name="book" size={44} color="rgba(255,255,255,0.9)" />
                    </View>
                  </View>
                </GlassCard>
              </Pressable>
            )}

            {/* Generate Flashcards */}
            <Pressable onPress={() => setShowGenerateModal(true)}>
              <GlassCard style={styles.actionCard}>
                <View style={styles.actionCardContent}>
                  <View style={[styles.actionIcon, { backgroundColor: isDark ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.15)" }]}>
                    <Ionicons name="sparkles" size={26} color="#10b981" />
                  </View>
                  <View style={styles.actionTextContainer}>
                    <Text style={[styles.actionTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Generate Flashcards</Text>
                    <Text style={[styles.actionSubtitle, { color: isDark ? "#94a3b8" : "#64748b" }]}>Upload photos or files with AI</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={22} color={isDark ? "#64748b" : "#94a3b8"} />
                </View>
              </GlassCard>
            </Pressable>

            {/* Upcoming Tests */}
            {upcomingTests.length > 0 && (
              <GlassCard style={styles.testsCard}>
                <Text style={[styles.sectionTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Upcoming Tests</Text>
                <View style={styles.testsList}>
                  {upcomingTests.map((test) => {
                    const urgencyColor = test.daysLeft <= 3 ? "#ef4444" : test.daysLeft <= 7 ? "#f97316" : "#667eea";
                    return (
                      <Pressable
                        key={test.id}
                        onPress={() => navigation.navigate("Deck", { deckId: test.id })}
                        style={[styles.testItem, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }]}
                      >
                        <View style={styles.testItemLeft}>
                          <View style={[styles.testDot, { backgroundColor: test.color }]} />
                          <View style={styles.testInfo}>
                            <Text style={[styles.testName, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>{test.name}</Text>
                            <Text style={[styles.testDate, { color: isDark ? "#64748b" : "#94a3b8" }]}>
                              {format(new Date(test.testDate!), "MMM d, yyyy")}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.testItemRight}>
                          <Text style={[styles.testDays, { color: urgencyColor }]}>
                            {test.daysLeft === 0 ? "Today" : test.daysLeft === 1 ? "1d" : `${test.daysLeft}d`}
                          </Text>
                          <Text style={[styles.testReady, { color: isDark ? "#64748b" : "#94a3b8" }]}>{test.readyPercentage}% ready</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </GlassCard>
            )}

            <View style={{ height: 32 }} />
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Generate Options Modal */}
      <Modal visible={showGenerateModal} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowGenerateModal(false)}>
        <View style={[styles.modalContainer, { backgroundColor: isDark ? "#1e293b" : "#ffffff" }]}>
          <View style={[styles.modalHeader, { borderBottomColor: isDark ? "#334155" : "#e2e8f0" }]}>
            <Text style={[styles.modalTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Generate Flashcards</Text>
            <Pressable onPress={() => setShowGenerateModal(false)}>
              <Ionicons name="close" size={28} color={isDark ? "#64748b" : "#94a3b8"} />
            </Pressable>
          </View>
          <View style={styles.modalContent}>
            <Text style={[styles.modalSubtitle, { color: isDark ? "#94a3b8" : "#64748b" }]}>Choose how you want to create flashcards</Text>
            
            <Pressable onPress={handleTakePhoto} style={[styles.modalOption, { backgroundColor: isDark ? "rgba(102, 126, 234, 0.15)" : "#eef2ff", borderColor: "#667eea" }]}>
              <View style={[styles.modalOptionIcon, { backgroundColor: "#667eea" }]}>
                <Ionicons name="camera" size={26} color="#ffffff" />
              </View>
              <View style={styles.modalOptionText}>
                <Text style={[styles.modalOptionTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Take Photo</Text>
                <Text style={[styles.modalOptionSubtitle, { color: isDark ? "#94a3b8" : "#64748b" }]}>Capture your notes with camera</Text>
              </View>
            </Pressable>

            <Pressable onPress={handlePickImage} style={[styles.modalOption, { backgroundColor: isDark ? "rgba(139, 92, 246, 0.15)" : "#f3e8ff", borderColor: "#8b5cf6" }]}>
              <View style={[styles.modalOptionIcon, { backgroundColor: "#8b5cf6" }]}>
                <Ionicons name="image" size={26} color="#ffffff" />
              </View>
              <View style={styles.modalOptionText}>
                <Text style={[styles.modalOptionTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Upload Image</Text>
                <Text style={[styles.modalOptionSubtitle, { color: isDark ? "#94a3b8" : "#64748b" }]}>Choose from your photo library</Text>
              </View>
            </Pressable>

            <Pressable onPress={handlePickFile} style={[styles.modalOption, { backgroundColor: isDark ? "rgba(249, 115, 22, 0.15)" : "#ffedd5", borderColor: "#f97316" }]}>
              <View style={[styles.modalOptionIcon, { backgroundColor: "#f97316" }]}>
                <Ionicons name="document" size={26} color="#ffffff" />
              </View>
              <View style={styles.modalOptionText}>
                <Text style={[styles.modalOptionTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Upload File</Text>
                <Text style={[styles.modalOptionSubtitle, { color: isDark ? "#94a3b8" : "#64748b" }]}>PDF, Word, or text documents</Text>
              </View>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Generating Modal */}
      <Modal visible={isGenerating} transparent animationType="fade">
        <View style={styles.loadingOverlay}>
          <View style={[styles.loadingCard, { backgroundColor: isDark ? "#1e293b" : "#ffffff" }]}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={[styles.loadingTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Generating Flashcards</Text>
            <Text style={[styles.loadingSubtitle, { color: isDark ? "#94a3b8" : "#64748b" }]}>{generatingMessage}</Text>
            <Text style={[styles.loadingNote, { color: isDark ? "#64748b" : "#94a3b8" }]}>This may take 10-30 seconds...</Text>
          </View>
        </View>
      </Modal>

      {/* Post-Test Dialogs */}
      {currentPostTestDeck && (
        <>
          <PostTestDialog
            visible={showPostTestDialog}
            deckName={decks.find((d) => d.id === currentPostTestDeck)?.name || ""}
            onTestResponse={(response) => { setTestResponse(response); setShowPostTestDialog(false); setShowLongTermDialog(true); }}
            onClose={() => { setShowPostTestDialog(false); markPostTestDialogShown(currentPostTestDeck); setCurrentPostTestDeck(null); }}
          />
          <LongTermDialog
            visible={showLongTermDialog}
            deckName={decks.find((d) => d.id === currentPostTestDeck)?.name || ""}
            onYes={() => { toggleLongTermMode(currentPostTestDeck, "LONG_TERM"); setShowLongTermDialog(false); setCurrentPostTestDeck(null); Alert.alert("Long-term Mode Enabled", "You will review these cards every 2 weeks."); }}
            onNo={() => { setShowLongTermDialog(false); setCurrentPostTestDeck(null); Alert.alert("Deck Unchanged", "You can switch to long-term mode anytime."); }}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12 },
  headerTitle: { fontSize: 34, fontWeight: "800", letterSpacing: -0.5 },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  heroCard: { marginBottom: 16, overflow: "hidden" },
  heroContent: { alignItems: "center", paddingVertical: 24 },
  heroIconContainer: { marginBottom: 12 },
  heroTitle: { fontSize: 26, fontWeight: "800", color: "#ffffff", marginBottom: 8 },
  heroSubtitle: { fontSize: 16, color: "rgba(255,255,255,0.9)", textAlign: "center" },
  studyCardContent: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  studyCardLeft: { flex: 1 },
  studyCardLabel: { fontSize: 15, color: "rgba(255,255,255,0.85)", fontWeight: "500", marginBottom: 4 },
  studyCardCount: { fontSize: 56, fontWeight: "800", color: "#ffffff", marginBottom: 12 },
  studyButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#ffffff", paddingVertical: 12, paddingHorizontal: 18, borderRadius: 14, alignSelf: "flex-start", gap: 6 },
  studyButtonText: { fontSize: 16, fontWeight: "700", color: "#667eea" },
  studyCardIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  actionCard: { marginBottom: 16 },
  actionCardContent: { flexDirection: "row", alignItems: "center" },
  actionIcon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center", marginRight: 14 },
  actionTextContainer: { flex: 1 },
  actionTitle: { fontSize: 17, fontWeight: "700", marginBottom: 2 },
  actionSubtitle: { fontSize: 14 },
  testsCard: { marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: "700", marginBottom: 16 },
  testsList: { gap: 10 },
  testItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 16 },
  testItemLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  testDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  testInfo: { flex: 1 },
  testName: { fontSize: 15, fontWeight: "600", marginBottom: 2 },
  testDate: { fontSize: 12 },
  testItemRight: { alignItems: "flex-end" },
  testDays: { fontSize: 22, fontWeight: "800", marginBottom: 2 },
  testReady: { fontSize: 11 },
  floatingShape: { position: "absolute", borderRadius: 100, opacity: 0.12 },
  shape1: { width: 180, height: 180, top: -60, right: -40 },
  shape2: { width: 120, height: 120, bottom: 200, left: -40 },
  shape3: { width: 80, height: 80, top: 300, right: -20 },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 20, fontWeight: "700" },
  modalContent: { padding: 20 },
  modalSubtitle: { fontSize: 15, marginBottom: 20 },
  modalOption: { flexDirection: "row", alignItems: "center", padding: 20, borderRadius: 20, borderWidth: 2, marginBottom: 12 },
  modalOptionIcon: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", marginRight: 16 },
  modalOptionText: { flex: 1 },
  modalOptionTitle: { fontSize: 17, fontWeight: "700", marginBottom: 4 },
  modalOptionSubtitle: { fontSize: 14 },
  loadingOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.7)" },
  loadingCard: { borderRadius: 24, padding: 32, marginHorizontal: 24, alignItems: "center", minWidth: 280 },
  loadingTitle: { fontSize: 20, fontWeight: "700", marginTop: 20 },
  loadingSubtitle: { fontSize: 15, marginTop: 8 },
  loadingNote: { fontSize: 13, marginTop: 16 },
});
