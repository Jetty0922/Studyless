import React, { useState } from "react";
import { View, Text, Pressable, TextInput, ScrollView, Platform, Alert, StyleSheet, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import { OnboardingStackParamList } from "../navigation/RootNavigator";
import { useFlashcardStore } from "../state/flashcardStore";
import { useTheme } from "../utils/useTheme";
import { Card } from "../components/ui";
import { trackFlashcardsCreated, trackDeckCreated } from "../services/analytics";

// Same colors as DecksListScreen
const DECK_COLORS = ["#667eea", "#8b5cf6", "#ec4899", "#f97316", "#10b981", "#ef4444"];

type CardsGeneratedScreenProps = {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, "CardsGenerated">;
  route: RouteProp<OnboardingStackParamList, "CardsGenerated">;
};

export default function CardsGeneratedScreen({ navigation, route }: CardsGeneratedScreenProps) {
  const { isDark } = useTheme();
  const { cards: initialCards, sourceUri, type } = route.params;
  
  // Editable cards state
  const [editableCards, setEditableCards] = useState(initialCards);
  const [showAllCards, setShowAllCards] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");
  
  // Deck creation - EXACTLY like DecksListScreen
  const [newDeckName, setNewDeckName] = useState("");
  const [selectedColor, setSelectedColor] = useState(DECK_COLORS[0]);
  const [deckMode, setDeckMode] = useState<"TEST_PREP" | "LONG_TERM">("TEST_PREP");
  const defaultTestDate = React.useMemo(() => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), []);
  const [testDate, setTestDate] = useState<Date | undefined>(defaultTestDate);
  const [pickerDate, setPickerDate] = useState<Date>(defaultTestDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const addDeck = useFlashcardStore((s) => s.addDeck);
  const addFlashcardsBatch = useFlashcardStore((s) => s.addFlashcardsBatch);
  const completeOnboarding = useFlashcardStore((s) => s.completeOnboarding);

  const displayedCards = showAllCards ? editableCards : editableCards.slice(0, 3);
  const hasMoreCards = editableCards.length > 3;

  const handleDeleteCard = (index: number) => {
    Alert.alert("Delete Card", "Are you sure you want to remove this card?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => setEditableCards(prev => prev.filter((_, i) => i !== index)) }
    ]);
  };

  const handleEditCard = (index: number) => {
    setEditingIndex(index);
    setEditFront(editableCards[index].front);
    setEditBack(editableCards[index].back);
  };

  const handleSaveEdit = () => {
    if (editingIndex === null) return;
    if (!editFront.trim() || !editBack.trim()) {
      Alert.alert("Error", "Both question and answer are required");
      return;
    }
    setEditableCards(prev => prev.map((card, i) => i === editingIndex ? { front: editFront.trim(), back: editBack.trim() } : card));
    setEditingIndex(null);
    setEditFront("");
    setEditBack("");
  };

  // Cancel - same behavior as DecksListScreen
  const handleCancel = () => {
    Alert.alert("Discard Cards?", "Are you sure you want to discard these generated cards?", [
      { text: "Keep Editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: () => navigation.goBack() }
    ]);
  };

  // Create - same as DecksListScreen handleCreateDeck
  const handleCreateDeck = async () => {
    if (!newDeckName.trim()) { Alert.alert("Error", "Deck name cannot be empty"); return; }
    if (deckMode === "TEST_PREP" && !testDate) { Alert.alert("Error", "Please set a test date"); return; }
    if (editableCards.length === 0) { Alert.alert("No Cards", "Please add at least one card"); return; }
    
    setIsSaving(true);
    try {
      const deckId = await addDeck(
        newDeckName.trim(), 
        selectedColor, 
        type === 'pdf' ? "📄" : "📸", 
        deckMode === "TEST_PREP" ? testDate : undefined, 
        deckMode
      );
      const finalCards = editableCards.map(c => ({ 
        ...c, 
        fileUri: type === 'pdf' ? sourceUri : undefined, 
        imageUri: undefined
      }));
      await addFlashcardsBatch(deckId, finalCards);
      
      // Track analytics
      trackDeckCreated(deckId, deckMode === "TEST_PREP" && !!testDate);
      const aiSource = type === 'pdf' ? 'ai_pdf' : 'ai_image';
      trackFlashcardsCreated(editableCards.length, aiSource);
      
      await completeOnboarding();
    } catch {
      Alert.alert("Error", "Failed to create deck");
      setIsSaving(false);
    }
  };

  // Date picker functions - same as DecksListScreen
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

  return (
    <View style={[styles.modalContainer, { backgroundColor: isDark ? "#1e293b" : "#ffffff" }]}>
      {/* Header - EXACTLY like DecksListScreen */}
      <SafeAreaView edges={["top"]} style={{ backgroundColor: isDark ? "#1e293b" : "#ffffff" }}>
        <View style={[styles.modalHeader, { borderBottomColor: isDark ? "#334155" : "#e2e8f0" }]}>
          <Pressable onPress={handleCancel}><Text style={{ color: "#667eea", fontSize: 17 }}>Cancel</Text></Pressable>
          <Text style={[styles.modalTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>New Deck</Text>
          <Pressable onPress={handleCreateDeck} disabled={isSaving}>
            <Text style={{ color: isSaving ? "#94a3b8" : "#667eea", fontSize: 17, fontWeight: "600" }}>
              {isSaving ? "Saving..." : "Create"}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
        {/* Deck Name - EXACTLY like DecksListScreen */}
        <Text style={[styles.inputLabel, { color: isDark ? "#94a3b8" : "#64748b" }]}>Deck Name</Text>
        <TextInput 
          value={newDeckName} 
          onChangeText={setNewDeckName} 
          placeholder="e.g., Biology Chapter 3" 
          placeholderTextColor={isDark ? "#64748b" : "#94a3b8"} 
          style={[styles.input, { backgroundColor: isDark ? "#0f172a" : "#f8fafc", borderColor: isDark ? "#334155" : "#e2e8f0", color: isDark ? "#f1f5f9" : "#1e293b" }]} 
        />

        {/* Study Mode - EXACTLY like DecksListScreen */}
        <Text style={[styles.inputLabel, { color: isDark ? "#94a3b8" : "#64748b", marginTop: 20 }]}>Study Mode</Text>
        <View style={styles.modeRow}>
          <Pressable onPress={() => setDeckMode("TEST_PREP")} style={[styles.modeOption, { backgroundColor: deckMode === "TEST_PREP" ? (isDark ? "rgba(102,126,234,0.2)" : "#eef2ff") : (isDark ? "#0f172a" : "#f8fafc"), borderColor: deckMode === "TEST_PREP" ? "#667eea" : (isDark ? "#334155" : "#e2e8f0") }]}>
            <Ionicons name="calendar" size={24} color={deckMode === "TEST_PREP" ? "#667eea" : (isDark ? "#64748b" : "#94a3b8")} />
            <Text style={[styles.modeTitle, { color: deckMode === "TEST_PREP" ? "#667eea" : (isDark ? "#f1f5f9" : "#1e293b") }]}>Test Prep</Text>
            <Text style={[styles.modeDesc, { color: isDark ? "#64748b" : "#94a3b8" }]}>Schedule based on test date</Text>
          </Pressable>
          <Pressable onPress={() => setDeckMode("LONG_TERM")} style={[styles.modeOption, { backgroundColor: deckMode === "LONG_TERM" ? (isDark ? "rgba(16,185,129,0.2)" : "#d1fae5") : (isDark ? "#0f172a" : "#f8fafc"), borderColor: deckMode === "LONG_TERM" ? "#10b981" : (isDark ? "#334155" : "#e2e8f0") }]}>
            <Ionicons name="repeat" size={24} color={deckMode === "LONG_TERM" ? "#10b981" : (isDark ? "#64748b" : "#94a3b8")} />
            <Text style={[styles.modeTitle, { color: deckMode === "LONG_TERM" ? "#10b981" : (isDark ? "#f1f5f9" : "#1e293b") }]}>Long-Term</Text>
            <Text style={[styles.modeDesc, { color: isDark ? "#64748b" : "#94a3b8" }]}>Spaced repetition forever</Text>
          </Pressable>
        </View>

        {/* Color - EXACTLY like DecksListScreen */}
        <Text style={[styles.inputLabel, { color: isDark ? "#94a3b8" : "#64748b", marginTop: 20 }]}>Color</Text>
        <View style={styles.colorRow}>
          {DECK_COLORS.map((c) => (
            <Pressable key={c} onPress={() => setSelectedColor(c)} style={[styles.colorOption, { backgroundColor: c, borderWidth: selectedColor === c ? 3 : 0, borderColor: isDark ? "#f1f5f9" : "#1e293b" }]}>
              {selectedColor === c && <Ionicons name="checkmark" size={24} color="#fff" />}
            </Pressable>
          ))}
        </View>

        {/* Test Date - EXACTLY like DecksListScreen */}
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

        {/* Cards Preview Section */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Generated Cards</Text>
          <Text style={[styles.cardCount, { color: isDark ? "#64748b" : "#94a3b8" }]}>{editableCards.length} total</Text>
        </View>
        
        {displayedCards.map((card, index) => (
          <PreviewCard 
            key={index} 
            front={card.front} 
            back={card.back} 
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
              {showAllCards ? "Show Less" : `Show All ${editableCards.length} Cards`}
            </Text>
            <Ionicons name={showAllCards ? "chevron-up" : "chevron-down"} size={18} color="#667eea" />
          </Pressable>
        )}
        
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Date Picker Overlay - iOS only - EXACTLY like DecksListScreen */}
      {Platform.OS === 'ios' && showDatePicker && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? "#1e293b" : "#ffffff", zIndex: 100 }]}>
          <SafeAreaView edges={["top"]} style={{ backgroundColor: isDark ? "#1e293b" : "#ffffff" }}>
            <View style={[styles.datePickerHeader, { borderBottomColor: isDark ? "#334155" : "#e2e8f0" }]}>
              <Pressable onPress={handleDateCancel} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.datePickerButton}>Cancel</Text>
              </Pressable>
              <Text style={[styles.datePickerTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Test Date</Text>
              <Pressable onPress={handleDateConfirm} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={[styles.datePickerButton, { fontWeight: "600" }]}>Done</Text>
              </Pressable>
            </View>
          </SafeAreaView>
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
        <View style={styles.editModalOverlay}>
          <View style={[styles.editModalContent, { backgroundColor: isDark ? "#1e293b" : "#ffffff" }]}>
            <View style={styles.editModalHeader}>
              <Text style={[styles.editModalTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Edit Card</Text>
              <Pressable onPress={() => { setEditingIndex(null); setEditFront(""); setEditBack(""); }}>
                <Ionicons name="close" size={28} color={isDark ? "#64748b" : "#94a3b8"} />
              </Pressable>
            </View>
            
            <Text style={[styles.editLabel, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Question</Text>
            <TextInput
              value={editFront}
              onChangeText={setEditFront}
              placeholder="Enter question"
              placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
              multiline
              numberOfLines={3}
              style={[styles.editInput, { backgroundColor: isDark ? "#0f172a" : "#f8fafc", borderColor: isDark ? "#334155" : "#e2e8f0", color: isDark ? "#f1f5f9" : "#1e293b" }]}
            />
            
            <Text style={[styles.editLabel, { color: isDark ? "#f1f5f9" : "#1e293b", marginTop: 16 }]}>Answer</Text>
            <TextInput
              value={editBack}
              onChangeText={setEditBack}
              placeholder="Enter answer"
              placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
              multiline
              numberOfLines={4}
              style={[styles.editInput, { backgroundColor: isDark ? "#0f172a" : "#f8fafc", borderColor: isDark ? "#334155" : "#e2e8f0", color: isDark ? "#f1f5f9" : "#1e293b" }]}
            />
            
            <Pressable onPress={handleSaveEdit} style={[styles.saveButton, { backgroundColor: "#2563EB" }]}>
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

interface PreviewCardProps {
  front: string;
  back: string;
  isDark: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function PreviewCard({ front, back, isDark, onEdit, onDelete }: PreviewCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <Card style={styles.previewCard} padding={0}>
      <Pressable onPress={() => setIsFlipped(!isFlipped)} style={styles.previewCardContent}>
        <View style={styles.previewCardHeader}>
          <Text style={[styles.previewCardLabel, { color: isDark ? "#64748b" : "#94a3b8" }]}>
            {isFlipped ? "Answer" : "Question"}
          </Text>
          <View style={[styles.flipBadge, { backgroundColor: isDark ? "rgba(102, 126, 234, 0.2)" : "rgba(102, 126, 234, 0.1)" }]}>
            <Ionicons name="swap-horizontal" size={12} color="#667eea" />
            <Text style={{ color: "#667eea", fontSize: 11, fontWeight: "600", marginLeft: 4 }}>Tap</Text>
          </View>
        </View>
        <Text style={[styles.previewCardText, { color: isDark ? "#f1f5f9" : "#1e293b" }]} numberOfLines={3}>
          {isFlipped ? back : front}
        </Text>
      </Pressable>
      
      <View style={[styles.cardActions, { borderTopColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]}>
        <Pressable onPress={onEdit} style={({ pressed }) => [styles.cardActionButton, pressed && { opacity: 0.6 }]}>
          <Ionicons name="pencil" size={18} color="#667eea" />
          <Text style={styles.cardActionText}>Edit</Text>
        </Pressable>
        <View style={[styles.actionDivider, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }]} />
        <Pressable onPress={onDelete} style={({ pressed }) => [styles.cardActionButton, pressed && { opacity: 0.6 }]}>
          <Ionicons name="trash-outline" size={18} color="#ef4444" />
          <Text style={[styles.cardActionText, { color: "#ef4444" }]}>Remove</Text>
        </Pressable>
      </View>
    </Card>
  );
}

// Styles - matching DecksListScreen exactly
const styles = StyleSheet.create({
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  modalContent: { padding: 20 },
  inputLabel: { fontSize: 13, fontWeight: "600", marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  modeRow: { flexDirection: "row", gap: 12 },
  modeOption: { flex: 1, padding: 16, borderRadius: 16, borderWidth: 2, alignItems: "center" },
  modeTitle: { fontSize: 15, fontWeight: "700", marginTop: 8, marginBottom: 4 },
  modeDesc: { fontSize: 11, textAlign: "center" },
  colorRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  colorOption: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  dateButton: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  datePickerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  datePickerTitle: { fontSize: 17, fontWeight: "600" },
  datePickerButton: { color: "#667eea", fontSize: 17 },
  datePickerContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 20 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  cardCount: { fontSize: 14, fontWeight: "500" },
  previewCard: { marginBottom: 12 },
  previewCardContent: { padding: 20 },
  previewCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  previewCardLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase" },
  flipBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  previewCardText: { fontSize: 15, lineHeight: 22 },
  cardActions: { flexDirection: "row", borderTopWidth: 1, paddingVertical: 14, paddingHorizontal: 20 },
  cardActionButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 4 },
  cardActionText: { fontSize: 14, fontWeight: "600", color: "#667eea" },
  actionDivider: { width: 1, height: 20 },
  showMoreButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, paddingHorizontal: 20, marginTop: 4, marginBottom: 16, gap: 6, backgroundColor: "rgba(102, 126, 234, 0.1)", borderRadius: 12 },
  showMoreText: { color: "#667eea", fontSize: 15, fontWeight: "600" },
  editModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  editModalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "80%" },
  editModalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  editModalTitle: { fontSize: 24, fontWeight: "700" },
  editLabel: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  editInput: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, textAlignVertical: "top", minHeight: 80 },
  saveButton: { paddingVertical: 16, borderRadius: 14, alignItems: "center", marginTop: 20, overflow: "hidden" },
  saveButtonText: { color: "#ffffff", fontSize: 17, fontWeight: "600" },
});
