import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, Alert, TextInput, Modal, Platform, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import { useFlashcardStore } from "../state/flashcardStore";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useTheme } from "../utils/useTheme";
import { Card } from "../components/ui";
import ModeExplainerModal from "../components/ModeExplainerModal";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type DeckSettingsRouteProp = RouteProp<RootStackParamList, "DeckSettings">;

export default function DeckSettingsScreen() {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<DeckSettingsRouteProp>();
  const { deckId } = route.params;

  const decks = useFlashcardStore((s) => s.decks);
  const updateDeck = useFlashcardStore((s) => s.updateDeck);
  const deleteDeck = useFlashcardStore((s) => s.deleteDeck);
  const toggleLongTermMode = useFlashcardStore((s) => s.toggleLongTermMode);

  const deck = decks.find((d) => d.id === deckId);
  const [showEditName, setShowEditName] = useState(false);
  const [editedName, setEditedName] = useState(deck?.name || "");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(deck?.testDate ? new Date(deck.testDate) : new Date());
  const [pendingModeSwitch, setPendingModeSwitch] = useState<"TEST_PREP" | null>(null);
  const [showModeExplainer, setShowModeExplainer] = useState(false);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: isDark ? "#0f172a" : "#f8fafc" },
      headerTintColor: isDark ? "#f1f5f9" : "#1e293b",
    });
  }, [navigation, isDark]);

  if (!deck) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? "#0f172a" : "#f8fafc" }]}>
        <View style={styles.emptyContainer}><Text style={{ color: isDark ? "#64748b" : "#94a3b8", fontSize: 18 }}>Deck not found</Text></View>
      </View>
    );
  }

  const isLongTerm = deck.mode === "LONG_TERM";
  const isTestPrep = deck.mode === "TEST_PREP";

  const handleSaveName = () => {
    if (!editedName.trim()) { Alert.alert("Error", "Deck name cannot be empty"); return; }
    updateDeck(deckId, { name: editedName.trim() });
    setShowEditName(false);
  };

  const handleChangeTestDate = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
      if (Platform.OS === "android") {
        if (pendingModeSwitch === "TEST_PREP") {
          // Android: immediately switch mode with selected date
          updateDeck(deckId, { 
            mode: "TEST_PREP", 
            testDate: date 
          });
          setPendingModeSwitch(null);
        } else {
          Alert.alert("Change Test Date", "This will update the test date. Continue?", [
            { text: "Cancel", style: "cancel" },
            { text: "Change", onPress: () => updateDeck(deckId, { testDate: date }) },
          ]);
        }
      }
    } else if (Platform.OS === "android") {
      // User cancelled on Android
      setPendingModeSwitch(null);
    }
  };

  const handleConfirmDateChange = () => {
    setShowDatePicker(false);
    
    // Check if this is for a mode switch
    if (pendingModeSwitch === "TEST_PREP") {
      updateDeck(deckId, { 
        mode: "TEST_PREP", 
        testDate: selectedDate 
      });
      setPendingModeSwitch(null);
      return;
    }
    
    // Regular date change for existing TEST_PREP deck
    Alert.alert("Change Test Date", "This will update the test date. Continue?", [
      { text: "Cancel", style: "cancel" },
      { text: "Change", onPress: () => updateDeck(deckId, { testDate: selectedDate }) },
    ]);
  };

  const handleSwitchMode = (newMode: "TEST_PREP" | "LONG_TERM") => {
    if (newMode === "LONG_TERM") {
      Alert.alert(
        "Switch to Long-term Mode",
        "Cards will be rescheduled using FSRS algorithm based on current progress. Continue?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Switch", onPress: () => toggleLongTermMode(deckId, newMode) },
        ]
      );
    } else {
      // Switching to TEST_PREP - need to select a test date first
      Alert.alert(
        "Switch to Test Prep Mode",
        "You'll need to set a test date. All progress will be recalculated based on the test date. Continue?",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Select Date", 
            onPress: () => {
              setPendingModeSwitch("TEST_PREP");
              setSelectedDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)); // Default to 2 weeks from now
              setShowDatePicker(true);
            }
          },
        ]
      );
    }
  };

  const handleDeleteDeck = () => {
    Alert.alert("Delete Deck", "This will permanently delete this deck and all its flashcards. This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => { deleteDeck(deckId); navigation.goBack(); } },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#0f172a" : "#f8fafc" }]}>
      <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {/* Deck Details */}
            <Card style={styles.section}>
              <Text style={[styles.sectionTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Deck Details</Text>

              <Pressable onPress={() => { setEditedName(deck.name); setShowEditName(true); }} style={styles.settingRow}>
                <View style={[styles.iconContainer, { backgroundColor: isDark ? "rgba(102, 126, 234, 0.2)" : "#eef2ff" }]}>
                  <Ionicons name="create-outline" size={20} color="#667eea" />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Deck Name</Text>
                  <Text style={[styles.settingSubtitle, { color: isDark ? "#64748b" : "#94a3b8" }]}>{deck.name}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={isDark ? "#64748b" : "#94a3b8"} />
              </Pressable>

              <View style={[styles.divider, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]} />

              <Pressable onPress={() => !isLongTerm && setShowDatePicker(true)} style={[styles.settingRow, isLongTerm && { opacity: 0.5 }]}>
                <View style={[styles.iconContainer, { backgroundColor: isDark ? "rgba(139, 92, 246, 0.2)" : "#ede9fe" }]}>
                  <Ionicons name="calendar-outline" size={20} color="#8b5cf6" />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Test Date</Text>
                  <Text style={[styles.settingSubtitle, { color: isDark ? "#64748b" : "#94a3b8" }]}>
                    {deck.testDate ? format(new Date(deck.testDate), "MMM d, yyyy") : isLongTerm ? "Not needed in long-term mode" : "Not set"}
                  </Text>
                </View>
                {!isLongTerm && <Ionicons name="chevron-forward" size={20} color={isDark ? "#64748b" : "#94a3b8"} />}
              </Pressable>
            </Card>

            {/* Study Mode */}
            <Card style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: isDark ? "#f1f5f9" : "#1e293b", marginBottom: 0 }]}>Study Mode</Text>
                <Pressable 
                  onPress={() => setShowModeExplainer(true)} 
                  hitSlop={12}
                  style={[styles.infoButton, { backgroundColor: isDark ? "rgba(102, 126, 234, 0.15)" : "#eef2ff" }]}
                >
                  <Ionicons name="help-circle-outline" size={18} color="#667eea" />
                </Pressable>
              </View>
              <View style={styles.modeRow}>
                <Pressable onPress={() => isLongTerm && handleSwitchMode("TEST_PREP")} disabled={isTestPrep} style={[styles.modeButton, { backgroundColor: isTestPrep ? (isDark ? "rgba(102, 126, 234, 0.2)" : "#eef2ff") : (isDark ? "rgba(255,255,255,0.05)" : "#f8fafc"), borderColor: isTestPrep ? "#667eea" : (isDark ? "rgba(255,255,255,0.1)" : "#e2e8f0") }]}>
                  <View style={[styles.modeIcon, { backgroundColor: isTestPrep ? "#667eea" : (isDark ? "rgba(255,255,255,0.1)" : "#e2e8f0") }]}>
                    <Ionicons name="school" size={24} color={isTestPrep ? "#ffffff" : (isDark ? "#64748b" : "#94a3b8")} />
                  </View>
                  <Text style={[styles.modeTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Test Prep</Text>
                  <Text style={[styles.modeDesc, { color: isDark ? "#64748b" : "#94a3b8" }]}>Study for test</Text>
                </Pressable>

                <Pressable onPress={() => isTestPrep && handleSwitchMode("LONG_TERM")} disabled={isLongTerm} style={[styles.modeButton, { backgroundColor: isLongTerm ? (isDark ? "rgba(16, 185, 129, 0.2)" : "#d1fae5") : (isDark ? "rgba(255,255,255,0.05)" : "#f8fafc"), borderColor: isLongTerm ? "#10b981" : (isDark ? "rgba(255,255,255,0.1)" : "#e2e8f0") }]}>
                  <View style={[styles.modeIcon, { backgroundColor: isLongTerm ? "#10b981" : (isDark ? "rgba(255,255,255,0.1)" : "#e2e8f0") }]}>
                    <Ionicons name="repeat" size={24} color={isLongTerm ? "#ffffff" : (isDark ? "#64748b" : "#94a3b8")} />
                  </View>
                  <Text style={[styles.modeTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Long-term</Text>
                  <Text style={[styles.modeDesc, { color: isDark ? "#64748b" : "#94a3b8" }]}>Review weekly</Text>
                </Pressable>
              </View>

              <View style={[styles.modeInfo, { backgroundColor: isLongTerm ? (isDark ? "rgba(16, 185, 129, 0.15)" : "#d1fae5") : (isDark ? "rgba(102, 126, 234, 0.15)" : "#eef2ff") }]}>
                <Text style={[styles.modeInfoText, { color: isLongTerm ? "#10b981" : "#667eea" }]}>
                  {isLongTerm ? "Long-term mode: Cards scheduled based on memory strength" : "Test prep mode: Cards scheduled based on test date"}
                </Text>
              </View>
            </Card>

            {/* Danger Zone */}
            <Card style={styles.section}>
              <Text style={[styles.sectionTitle, { color: "#ef4444" }]}>Danger Zone</Text>
              <Pressable onPress={handleDeleteDeck} style={styles.settingRow}>
                <View style={[styles.iconContainer, { backgroundColor: isDark ? "rgba(239, 68, 68, 0.2)" : "#fee2e2" }]}>
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={{ color: "#ef4444", fontSize: 15, fontWeight: "600" }}>Delete Deck</Text>
                  <Text style={[styles.settingSubtitle, { color: isDark ? "#64748b" : "#94a3b8" }]}>Permanently delete this deck</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={isDark ? "#64748b" : "#94a3b8"} />
              </Pressable>
            </Card>

            <View style={{ height: 32 }} />
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Edit Name Modal */}
      <Modal visible={showEditName} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowEditName(false)}>
        <View style={[styles.modalContainer, { backgroundColor: isDark ? "#1e293b" : "#ffffff" }]}>
          <View style={[styles.modalHeader, { borderBottomColor: isDark ? "#334155" : "#e2e8f0" }]}>
            <Pressable onPress={() => setShowEditName(false)}><Text style={{ color: "#667eea", fontSize: 17 }}>Cancel</Text></Pressable>
            <Text style={[styles.modalTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Edit Name</Text>
            <Pressable onPress={handleSaveName}><Text style={{ color: "#667eea", fontSize: 17, fontWeight: "600" }}>Save</Text></Pressable>
          </View>
          <View style={styles.modalBody}>
            <Text style={[styles.inputLabel, { color: isDark ? "#94a3b8" : "#64748b" }]}>Deck Name</Text>
            <TextInput value={editedName} onChangeText={setEditedName} placeholder="Enter deck name" placeholderTextColor={isDark ? "#64748b" : "#94a3b8"} autoFocus style={[styles.textInput, { backgroundColor: isDark ? "#0f172a" : "#f8fafc", borderColor: isDark ? "#334155" : "#e2e8f0", color: isDark ? "#f1f5f9" : "#1e293b" }]} />
          </View>
        </View>
      </Modal>

      {/* Date Picker - iOS Full Screen Modal */}
      {Platform.OS === "ios" && (
        <Modal 
          visible={showDatePicker} 
          animationType="slide" 
          transparent={false}
          onRequestClose={() => {
            setShowDatePicker(false);
            setPendingModeSwitch(null);
          }}
        >
          <View style={{ flex: 1, backgroundColor: isDark ? "#1e293b" : "#ffffff" }}>
            <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}>
              <View style={[styles.datePickerHeader, { borderBottomColor: isDark ? "#334155" : "#e2e8f0" }]}>
                <Pressable 
                  onPress={() => {
                    setShowDatePicker(false);
                    setPendingModeSwitch(null);
                  }} 
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.datePickerButton}>Cancel</Text>
                </Pressable>
                <Text style={[styles.datePickerTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>
                  {pendingModeSwitch ? "Select Test Date" : "Test Date"}
                </Text>
                <Pressable onPress={handleConfirmDateChange} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={[styles.datePickerButton, { fontWeight: "600" }]}>
                    {pendingModeSwitch ? "Switch" : "Done"}
                  </Text>
                </Pressable>
              </View>
              {pendingModeSwitch && (
                <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
                  <Text style={{ color: isDark ? "#94a3b8" : "#64748b", fontSize: 14, textAlign: "center" }}>
                    Select when your test is. Cards will be scheduled to maximize retention on test day.
                  </Text>
                </View>
              )}
              <View style={styles.datePickerContainer}>
                <DateTimePicker 
                  value={selectedDate} 
                  mode="date" 
                  display="spinner" 
                  onChange={handleChangeTestDate} 
                  minimumDate={new Date()} 
                  themeVariant={isDark ? "dark" : "light"}
                  textColor={isDark ? "#f1f5f9" : "#1e293b"}
                  style={{ width: '100%', height: 300 }}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}
      {showDatePicker && Platform.OS === "android" && (
        <DateTimePicker 
          value={selectedDate} 
          mode="date" 
          display="default" 
          onChange={handleChangeTestDate} 
          minimumDate={new Date()}
        />
      )}

      {/* Mode Explainer Modal */}
      <ModeExplainerModal
        visible={showModeExplainer}
        onClose={() => setShowModeExplainer(false)}
        initialMode={isLongTerm ? "longTerm" : "testPrep"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16 },
  section: { marginBottom: 16 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 16 },
  infoButton: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  settingRow: { flexDirection: "row", alignItems: "center", paddingVertical: 4 },
  iconContainer: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 14 },
  settingInfo: { flex: 1 },
  settingTitle: { fontSize: 15, fontWeight: "600", marginBottom: 2 },
  settingSubtitle: { fontSize: 13 },
  divider: { height: 1, marginVertical: 12 },
  modeRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  modeButton: { flex: 1, padding: 16, borderRadius: 16, borderWidth: 2, alignItems: "center" },
  modeIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  modeTitle: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  modeDesc: { fontSize: 11, textAlign: "center" },
  modeInfo: { padding: 12, borderRadius: 12 },
  modeInfoText: { fontSize: 12, fontWeight: "500" },
  floatingShape: { position: "absolute", borderRadius: 100, opacity: 0.12 },
  shape1: { width: 180, height: 180, top: -60, right: -40 },
  shape2: { width: 120, height: 120, bottom: 200, left: -40 },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  modalBody: { padding: 20 },
  inputLabel: { fontSize: 13, fontWeight: "600", marginBottom: 8 },
  textInput: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  datePickerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  datePickerTitle: { fontSize: 17, fontWeight: "600" },
  datePickerButton: { color: "#667eea", fontSize: 17 },
  datePickerContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 20 },
});
