import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, TextInput, Modal, Alert, ActivityIndicator, Platform, StyleSheet, KeyboardAvoidingView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import { useFlashcardStore } from "../state/flashcardStore";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useTheme } from "../utils/useTheme";
import { GeneratedFlashcard, generateFlashcardsFromImage, generateFlashcardsFromFile } from "../utils/aiFlashcardGenerator";
import { GlassCard, GradientButton } from "../components/ui";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type DeckSelectionScreenProps = { route: { params: { flashcards: GeneratedFlashcard[]; sourceUri?: string; }; }; };

const COLORS = [{ name: "Purple", value: "#667eea" }, { name: "Violet", value: "#8b5cf6" }, { name: "Green", value: "#10b981" }, { name: "Orange", value: "#f97316" }, { name: "Red", value: "#ef4444" }, { name: "Pink", value: "#ec4899" }];
const EMOJIS = ["📚", "🎯", "🧠", "✨", "🚀", "💡", "📝", "🎓", "🔬", "🎨"];

// Preview Card Component with Edit/Delete actions
interface PreviewCardProps {
  card: GeneratedFlashcard;
  index: number;
  isDark: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function PreviewCard({ card, index, isDark, onEdit, onDelete }: PreviewCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <GlassCard style={styles.previewCard} padding={0}>
      <Pressable onPress={() => setIsFlipped(!isFlipped)} style={styles.previewCardContent}>
        <View style={styles.previewCardHeader}>
          <Text style={[styles.cardNumber, { color: isDark ? "#64748b" : "#94a3b8" }]}>
            Card {index + 1} • {isFlipped ? "Answer" : "Question"}
          </Text>
          <View style={[styles.flipBadge, { backgroundColor: isDark ? "rgba(102, 126, 234, 0.2)" : "rgba(102, 126, 234, 0.1)" }]}>
            <Ionicons name="swap-horizontal" size={12} color="#667eea" />
            <Text style={{ color: "#667eea", fontSize: 11, fontWeight: "600", marginLeft: 4 }}>Tap</Text>
          </View>
        </View>
        <Text style={[styles.cardText, { color: isDark ? "#f1f5f9" : "#1e293b" }]} numberOfLines={4}>
          {isFlipped ? card.back : card.front}
        </Text>
      </Pressable>
      
      {/* Action Buttons */}
      <View style={[styles.cardActions, { borderTopColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]}>
        <Pressable 
          onPress={onEdit} 
          style={({ pressed }) => [styles.cardActionButton, pressed && { opacity: 0.6 }]}
        >
          <Ionicons name="pencil" size={18} color="#667eea" />
          <Text style={styles.cardActionText}>Edit</Text>
        </Pressable>
        <View style={[styles.actionDivider, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }]} />
        <Pressable 
          onPress={onDelete} 
          style={({ pressed }) => [styles.cardActionButton, pressed && { opacity: 0.6 }]}
        >
          <Ionicons name="trash-outline" size={18} color="#ef4444" />
          <Text style={[styles.cardActionText, { color: "#ef4444" }]}>Remove</Text>
        </Pressable>
      </View>
    </GlassCard>
  );
}

export default function DeckSelectionScreen({ route }: DeckSelectionScreenProps) {
  const { isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { flashcards: generatedFlashcards, sourceUri } = route.params;

  const decks = useFlashcardStore((s) => s.decks);
  const addDeck = useFlashcardStore((s) => s.addDeck);
  const addFlashcardsBatch = useFlashcardStore((s) => s.addFlashcardsBatch);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDeckName, setNewDeckName] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLORS[0].value);
  const [selectedEmoji] = useState(EMOJIS[0]);
  const [deckMode, setDeckMode] = useState<"TEST_PREP" | "LONG_TERM">("LONG_TERM");
  const defaultTestDate = React.useMemo(() => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), []);
  const [testDate, setTestDate] = useState<Date | undefined>(defaultTestDate);
  const [pickerDate, setPickerDate] = useState<Date>(defaultTestDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [flashcardsList, setFlashcardsList] = useState<GeneratedFlashcard[]>(generatedFlashcards);
  const [showAllCards, setShowAllCards] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");

  const handleSelectDeck = async (deckId: string) => {
    try {
      setIsAdding(true);
      await addFlashcardsBatch(deckId, flashcardsList.map((card) => ({ front: card.front, back: card.back, imageUri: sourceUri })));
      Alert.alert("Success!", `Added ${flashcardsList.length} flashcards to the deck.`, [{ 
        text: "OK", 
        onPress: () => navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] })
      }]);
    } catch { Alert.alert("Error", "Failed to add flashcards to deck."); } finally { setIsAdding(false); }
  };

  const handleCreateDeck = async () => {
    if (!newDeckName.trim()) { Alert.alert("Error", "Please enter a deck name"); return; }
    if (deckMode === "TEST_PREP" && !testDate) { Alert.alert("Error", "Please select a test date for Test Prep mode"); return; }
    try {
      setIsAdding(true);
      const deckId = await addDeck(newDeckName, selectedColor, selectedEmoji, deckMode === "TEST_PREP" ? testDate : undefined, deckMode);
      await addFlashcardsBatch(deckId, flashcardsList.map((card) => ({ front: card.front, back: card.back, imageUri: sourceUri })));
      setShowCreateModal(false);
      const resetDate = defaultTestDate;
      setTestDate(resetDate);
      setPickerDate(resetDate);
      Alert.alert("Success!", `Created deck "${newDeckName}" with ${flashcardsList.length} flashcards.`, [{ 
        text: "OK", 
        onPress: () => navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] })
      }]);
    } catch { Alert.alert("Error", "Failed to create deck."); } finally { setIsAdding(false); }
  };

  const handleDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) {
      setPickerDate(selectedDate);
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

  // Ensure a default date exists when switching to Test Prep
  React.useEffect(() => {
    if (deckMode === "TEST_PREP" && !testDate) {
      setTestDate(defaultTestDate);
      setPickerDate(defaultTestDate);
    }
  }, [deckMode, testDate, defaultTestDate]);

  const handleRegenerateAll = async () => {
    Alert.alert("Regenerate All", "This will regenerate all flashcards. Continue?", [
      { text: "Cancel", style: "cancel" },
      { text: "Regenerate", onPress: async () => {
        try {
          setIsRegenerating(true);
          const mimeType = sourceUri?.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/i) ? "image/jpeg" : undefined;
          const newFlashcards = mimeType ? await generateFlashcardsFromImage(sourceUri!) : await generateFlashcardsFromFile(sourceUri!, mimeType);
          setFlashcardsList(newFlashcards);
          Alert.alert("Success", `Regenerated ${newFlashcards.length} flashcards!`);
        } catch (error: any) { Alert.alert("Failed", error.message); } finally { setIsRegenerating(false); }
      }},
    ]);
  };

  const handleDeleteCard = (index: number) => {
    Alert.alert(
      "Delete Card",
      "Are you sure you want to remove this card?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: () => {
            setFlashcardsList(prev => prev.filter((_, i) => i !== index));
          }
        }
      ]
    );
  };

  const handleEditCard = (index: number) => {
    setEditingIndex(index);
    setEditFront(flashcardsList[index].front);
    setEditBack(flashcardsList[index].back);
  };

  const handleSaveEdit = () => {
    if (editingIndex === null) return;
    if (!editFront.trim() || !editBack.trim()) {
      Alert.alert("Error", "Both question and answer are required");
      return;
    }
    setFlashcardsList(prev => prev.map((card, i) => 
      i === editingIndex ? { front: editFront.trim(), back: editBack.trim() } : card
    ));
    setEditingIndex(null);
    setEditFront("");
    setEditBack("");
  };

  const displayedCards = showAllCards ? flashcardsList : flashcardsList.slice(0, 3);
  const hasMoreCards = flashcardsList.length > 3;

  if (isAdding) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={isDark ? ["#0f172a", "#1e1b4b"] : ["#f8fafc", "#eef2ff"]} style={StyleSheet.absoluteFillObject} />
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#667eea" /><Text style={[styles.loadingText, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Adding flashcards...</Text></View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={isDark ? ["#0f172a", "#1e1b4b"] : ["#f8fafc", "#eef2ff"]} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <View style={[styles.floatingShape, styles.shape1, { backgroundColor: isDark ? "#667eea" : "#a5b4fc" }]} />
      <View style={[styles.floatingShape, styles.shape2, { backgroundColor: isDark ? "#f093fb" : "#c4b5fd" }]} />

      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Select a Deck</Text>
            <Text style={[styles.headerSubtitle, { color: isDark ? "#94a3b8" : "#64748b" }]}>{flashcardsList.length} flashcards generated</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {sourceUri && (
              <Pressable onPress={handleRegenerateAll} disabled={isRegenerating} style={styles.headerButton}>
                <LinearGradient colors={["#667eea", "#764ba2"]} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} pointerEvents="none" />
                {isRegenerating ? <ActivityIndicator size="small" color="white" /> : <Ionicons name="refresh" size={20} color="white" />}
              </Pressable>
            )}
            <Pressable onPress={() => navigation.goBack()} style={[styles.headerButton, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]}>
              <Ionicons name="close" size={24} color={isDark ? "#f1f5f9" : "#1e293b"} />
            </Pressable>
          </View>
        </View>

        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Generated Flashcards Preview */}
            <View style={styles.previewHeader}>
              <Text style={[styles.sectionTitle, { color: isDark ? "#f1f5f9" : "#1e293b", marginBottom: 0 }]}>Preview</Text>
              <Text style={[styles.cardCountBadge, { color: isDark ? "#64748b" : "#94a3b8" }]}>{flashcardsList.length} cards</Text>
            </View>
            {displayedCards.map((card, index) => (
              <PreviewCard
                key={index}
                card={card}
                index={index}
                isDark={isDark}
                onEdit={() => handleEditCard(index)}
                onDelete={() => handleDeleteCard(index)}
              />
            ))}
            {hasMoreCards && (
              <Pressable 
                onPress={() => setShowAllCards(prev => !prev)} 
                style={({ pressed }) => [styles.showMoreButton, pressed && { opacity: 0.6 }]}
              >
                <Text style={styles.showMoreText}>
                  {showAllCards ? "Show Less" : `Show All ${flashcardsList.length} Cards`}
                </Text>
                <Ionicons 
                  name={showAllCards ? "chevron-up" : "chevron-down"} 
                  size={18} 
                  color="#667eea" 
                />
              </Pressable>
            )}

            {/* Create New Deck */}
            <GradientButton title="Create New Deck" onPress={() => setShowCreateModal(true)} size="large" icon={<Ionicons name="add-circle" size={22} color="white" />} style={{ marginTop: 24, marginBottom: 16 }} />

            {/* Existing Decks */}
            {decks.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: isDark ? "#f1f5f9" : "#1e293b", marginTop: 16 }]}>Or add to existing deck:</Text>
                <View style={{ gap: 12 }}>
                  {decks.map((deck) => (
                    <Pressable key={deck.id} onPress={() => handleSelectDeck(deck.id)}>
                      <GlassCard padding={16}>
                        <View style={styles.deckRow}>
                          <View style={[styles.deckIcon, { backgroundColor: deck.color }]}><Text style={{ fontSize: 24 }}>{deck.emoji || "📚"}</Text></View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.deckName, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>{deck.name}</Text>
                            <Text style={[styles.deckMeta, { color: isDark ? "#64748b" : "#94a3b8" }]}>{deck.cardCount} cards • {deck.mode === "LONG_TERM" ? "Long-term" : "Test Prep"}</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={24} color={isDark ? "#64748b" : "#94a3b8"} />
                        </View>
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

      {/* Create Deck Modal - Matching DecksListScreen exactly */}
      <Modal visible={showCreateModal} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowCreateModal(false)}>
        <View style={[styles.modalContainer, { backgroundColor: isDark ? "#1e293b" : "#ffffff" }]}>
          <View style={[styles.modalHeader, { borderBottomColor: isDark ? "#334155" : "#e2e8f0" }]}>
            <Pressable onPress={() => setShowCreateModal(false)}><Text style={{ color: "#667eea", fontSize: 17 }}>Cancel</Text></Pressable>
            <Text style={[styles.modalTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>New Deck</Text>
            <Pressable onPress={handleCreateDeck}><Text style={{ color: "#667eea", fontSize: 17, fontWeight: "600" }}>Create</Text></Pressable>
          </View>
          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <Text style={[styles.inputLabel, { color: isDark ? "#94a3b8" : "#64748b" }]}>Deck Name</Text>
            <TextInput value={newDeckName} onChangeText={setNewDeckName} placeholder="e.g., Biology Chapter 3" placeholderTextColor={isDark ? "#64748b" : "#94a3b8"} style={[styles.textInput, { backgroundColor: isDark ? "#0f172a" : "#f8fafc", borderColor: isDark ? "#334155" : "#e2e8f0", color: isDark ? "#f1f5f9" : "#1e293b" }]} />

            <Text style={[styles.inputLabel, { color: isDark ? "#94a3b8" : "#64748b", marginTop: 20 }]}>Study Mode</Text>
            <View style={styles.modeRow}>
              <Pressable onPress={() => setDeckMode("TEST_PREP")} style={[styles.modeButton, { backgroundColor: deckMode === "TEST_PREP" ? (isDark ? "rgba(102,126,234,0.2)" : "#eef2ff") : (isDark ? "#0f172a" : "#f8fafc"), borderColor: deckMode === "TEST_PREP" ? "#667eea" : (isDark ? "#334155" : "#e2e8f0") }]}>
                <Ionicons name="calendar" size={24} color={deckMode === "TEST_PREP" ? "#667eea" : (isDark ? "#64748b" : "#94a3b8")} />
                <Text style={[styles.modeTitle, { color: deckMode === "TEST_PREP" ? "#667eea" : (isDark ? "#f1f5f9" : "#1e293b") }]}>Test Prep</Text>
                <Text style={[styles.modeDesc, { color: isDark ? "#64748b" : "#94a3b8" }]}>Schedule based on test date</Text>
              </Pressable>
              <Pressable onPress={() => setDeckMode("LONG_TERM")} style={[styles.modeButton, { backgroundColor: deckMode === "LONG_TERM" ? (isDark ? "rgba(16,185,129,0.2)" : "#d1fae5") : (isDark ? "#0f172a" : "#f8fafc"), borderColor: deckMode === "LONG_TERM" ? "#10b981" : (isDark ? "#334155" : "#e2e8f0") }]}>
                <Ionicons name="repeat" size={24} color={deckMode === "LONG_TERM" ? "#10b981" : (isDark ? "#64748b" : "#94a3b8")} />
                <Text style={[styles.modeTitle, { color: deckMode === "LONG_TERM" ? "#10b981" : (isDark ? "#f1f5f9" : "#1e293b") }]}>Long-Term</Text>
                <Text style={[styles.modeDesc, { color: isDark ? "#64748b" : "#94a3b8" }]}>Spaced repetition forever</Text>
              </Pressable>
            </View>

            <Text style={[styles.inputLabel, { color: isDark ? "#94a3b8" : "#64748b", marginTop: 20 }]}>Color</Text>
            <View style={styles.colorRow}>
              {COLORS.map((c) => (
                <Pressable key={c.value} onPress={() => setSelectedColor(c.value)} style={[styles.colorOption, { backgroundColor: c.value, borderWidth: selectedColor === c.value ? 3 : 0, borderColor: isDark ? "#f1f5f9" : "#1e293b" }]}>
                  {selectedColor === c.value && <Ionicons name="checkmark" size={24} color="white" />}
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

      {/* Edit Card Modal */}
      <Modal visible={editingIndex !== null} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.editModalOverlay}>
          <View style={[styles.editModalContent, { backgroundColor: isDark ? "#1e293b" : "#ffffff" }]}>
            <View style={styles.editModalHeader}>
              <Text style={[styles.editModalTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Edit Card</Text>
              <Pressable onPress={() => { setEditingIndex(null); setEditFront(""); setEditBack(""); }}>
                <Ionicons name="close" size={28} color={isDark ? "#64748b" : "#94a3b8"} />
              </Pressable>
            </View>
            
            <Text style={[styles.editInputLabel, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Question</Text>
            <TextInput
              value={editFront}
              onChangeText={setEditFront}
              placeholder="Enter question"
              placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
              multiline
              numberOfLines={3}
              style={[styles.editTextInput, { 
                backgroundColor: isDark ? "#0f172a" : "#f8fafc", 
                borderColor: isDark ? "#334155" : "#e2e8f0",
                color: isDark ? "#f1f5f9" : "#1e293b"
              }]}
            />
            
            <Text style={[styles.editInputLabel, { color: isDark ? "#f1f5f9" : "#1e293b", marginTop: 16 }]}>Answer</Text>
            <TextInput
              value={editBack}
              onChangeText={setEditBack}
              placeholder="Enter answer"
              placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
              multiline
              numberOfLines={4}
              style={[styles.editTextInput, { 
                backgroundColor: isDark ? "#0f172a" : "#f8fafc", 
                borderColor: isDark ? "#334155" : "#e2e8f0",
                color: isDark ? "#f1f5f9" : "#1e293b"
              }]}
            />
            
            <Pressable onPress={handleSaveEdit} style={styles.saveEditButton}>
              <LinearGradient colors={["#667eea", "#764ba2"]} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} pointerEvents="none" />
              <Text style={styles.saveEditButtonText}>Save Changes</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { fontSize: 17, marginTop: 16 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  headerTitle: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, marginTop: 4 },
  headerButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  previewHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  cardCountBadge: { fontSize: 14, fontWeight: "500" },
  previewCard: { marginBottom: 12 },
  previewCardContent: { padding: 16 },
  previewCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cardNumber: { fontSize: 11, fontWeight: "700", marginBottom: 8 },
  cardLabel: { fontSize: 11, fontWeight: "600", marginBottom: 4 },
  cardText: { fontSize: 14, lineHeight: 20 },
  flipBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  cardActions: { flexDirection: "row", borderTopWidth: 1, paddingVertical: 12, paddingHorizontal: 16 },
  cardActionButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 4 },
  cardActionText: { fontSize: 14, fontWeight: "600", color: "#667eea" },
  actionDivider: { width: 1, height: 20 },
  showMoreButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, paddingHorizontal: 20, marginTop: 4, marginBottom: 16, gap: 6, backgroundColor: "rgba(102, 126, 234, 0.1)", borderRadius: 12 },
  showMoreText: { color: "#667eea", fontSize: 15, fontWeight: "600" },
  moreText: { textAlign: "center", fontSize: 14, marginTop: 4, marginBottom: 8 },
  deckRow: { flexDirection: "row", alignItems: "center" },
  deckIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: 12 },
  deckName: { fontSize: 17, fontWeight: "700", marginBottom: 4 },
  deckMeta: { fontSize: 13 },
  floatingShape: { position: "absolute", borderRadius: 100, opacity: 0.12 },
  shape1: { width: 180, height: 180, top: -60, right: -40 },
  shape2: { width: 120, height: 120, bottom: 200, left: -40 },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 20, fontWeight: "700" },
  modalScroll: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  modalFooter: { paddingHorizontal: 20, paddingBottom: 24 },
  inputLabel: { fontSize: 15, fontWeight: "600", marginBottom: 8 },
  textInput: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  modeRow: { flexDirection: "row", gap: 12 },
  modeButton: { flex: 1, padding: 14, borderRadius: 14, borderWidth: 2, alignItems: "center" },
  modeTitle: { fontSize: 14, fontWeight: "700", marginTop: 6, marginBottom: 2 },
  modeDesc: { fontSize: 11, textAlign: "center" },
  dateButton: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  colorRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  colorOption: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  emojiRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  emojiOption: { width: 52, height: 52, borderRadius: 14, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  datePickerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  datePickerTitle: { fontSize: 17, fontWeight: "600" },
  datePickerButton: { color: "#667eea", fontSize: 17 },
  datePickerContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 20 },
  // Edit Modal styles
  editModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  editModalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "80%" },
  editModalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  editModalTitle: { fontSize: 24, fontWeight: "700" },
  editInputLabel: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  editTextInput: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, textAlignVertical: "top", minHeight: 80 },
  saveEditButton: { paddingVertical: 16, borderRadius: 14, alignItems: "center", marginTop: 20, overflow: "hidden" },
  saveEditButtonText: { color: "#ffffff", fontSize: 17, fontWeight: "600" },
});
