import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, Alert, TextInput, Modal, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import { useFlashcardStore } from "../state/flashcardStore";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useTheme } from "../utils/useTheme";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type DeckSettingsRouteProp = RouteProp<RootStackParamList, "DeckSettings">;

export default function DeckSettingsScreen() {
  const { colors } = useTheme();
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
  const [selectedDate, setSelectedDate] = useState(
    deck?.testDate ? new Date(deck.testDate) : new Date()
  );

  if (!deck) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center" style={{ backgroundColor: colors.background }}>
        <Text className="text-xl" style={{ color: colors.textSecondary }}>Deck not found</Text>
      </SafeAreaView>
    );
  }

  const isLongTerm = deck.mode === "LONG_TERM";
  const isTestPrep = deck.mode === "TEST_PREP";

  const handleSaveName = () => {
    if (!editedName.trim()) {
      Alert.alert("Error", "Deck name cannot be empty");
      return;
    }
    updateDeck(deckId, { name: editedName.trim() });
    setShowEditName(false);
  };

  const handleChangeTestDate = (event: any, date?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }

    if (date) {
      setSelectedDate(date);
      if (Platform.OS === "android") {
        Alert.alert(
          "Change Test Date",
          "This will recalculate review schedules for all cards in this deck. Continue?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Change",
              onPress: () => updateDeck(deckId, { testDate: date }),
            },
          ]
        );
      }
    }
  };

  const handleConfirmDateChange = () => {
    setShowDatePicker(false);
    Alert.alert(
      "Change Test Date",
      "This will recalculate review schedules for all cards in this deck. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Change",
          onPress: () => updateDeck(deckId, { testDate: selectedDate }),
        },
      ]
    );
  };

  const handleSwitchMode = (newMode: "TEST_PREP" | "LONG_TERM") => {
    if (newMode === "LONG_TERM") {
      Alert.alert(
        "Switch to Long-term Mode",
        "WARNING: This is irreversible. All progress and steps will be reset. Review cards will be scheduled every 2 weeks for long-term retention. Continue?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Switch",
            style: "destructive",
            onPress: () => toggleLongTermMode(deckId, "LONG_TERM"),
          },
        ]
      );
    } else {
      Alert.alert(
        "Switch to Test Prep Mode",
        "WARNING: This is irreversible. All progress and steps will be reset. Continue?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Switch",
            style: "destructive",
            onPress: () => toggleLongTermMode(deckId, "TEST_PREP"),
          },
        ]
      );
    }
  };

  const handleDeleteDeck = () => {
    Alert.alert(
      "Delete Deck",
      "This will permanently delete this deck and all its flashcards. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteDeck(deckId);
            navigation.goBack();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }} edges={["bottom"]}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 py-6">
          {/* Deck Name */}
          <View className="rounded-3xl p-4 mb-4" style={{ backgroundColor: colors.surface }}>
            <Text className="text-xl font-bold px-2 mb-3" style={{ color: colors.text }}>
              Deck Details
            </Text>

            <Pressable
              onPress={() => {
                setEditedName(deck.name);
                setShowEditName(true);
              }}
              className="flex-row items-center justify-between py-4 px-2 active:opacity-70"
            >
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: colors.blueLight }}>
                  <Ionicons name="create-outline" size={20} color={colors.primary} />
                </View>
                <View className="flex-1">
                  <Text className="font-medium" style={{ color: colors.text }}>Deck Name</Text>
                  <Text className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                    {deck.name}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </Pressable>

            <View className="h-px mx-2" style={{ backgroundColor: colors.border }} />

            <Pressable
              onPress={() => setShowDatePicker(true)}
              disabled={isLongTerm}
              className="flex-row items-center justify-between py-4 px-2 active:opacity-70"
              style={{ opacity: isLongTerm ? 0.5 : 1 }}
            >
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: colors.purpleLight }}>
                  <Ionicons name="calendar-outline" size={20} color={colors.purple} />
                </View>
                <View className="flex-1">
                  <Text className="font-medium" style={{ color: colors.text }}>Test Date</Text>
                  <Text className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                    {deck.testDate
                      ? format(new Date(deck.testDate), "MMM d, yyyy")
                      : isLongTerm ? "Not needed in long-term mode" : "Not set"}
                  </Text>
                </View>
              </View>
              {!isLongTerm && <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />}
            </Pressable>
          </View>

          {/* Study Mode */}
          <View className="rounded-3xl p-4 mb-4" style={{ backgroundColor: colors.surface }}>
            <Text className="text-xl font-bold px-2 mb-3" style={{ color: colors.text }}>
              Study Mode
            </Text>

            <View className="px-2 py-2">
              <View className="flex-row gap-3">
                {/* Test Prep Mode Button */}
                <Pressable
                  onPress={() => isLongTerm && handleSwitchMode("TEST_PREP")}
                  disabled={isTestPrep}
                  className="flex-1 rounded-2xl p-4 border-2 active:opacity-70"
                  style={{
                    backgroundColor: isTestPrep ? colors.blueLight : colors.background,
                    borderColor: isTestPrep ? colors.primary : colors.border,
                    opacity: isTestPrep ? 1 : 0.9
                  }}
                >
                  <View className="items-center">
                    <View
                      className="w-12 h-12 rounded-full items-center justify-center mb-2"
                      style={{ backgroundColor: isTestPrep ? colors.primary : colors.border }}
                    >
                      <Ionicons name="school" size={24} color={isTestPrep ? "#fff" : colors.textSecondary} />
                    </View>
                    <Text className="font-bold text-center mb-1" style={{ color: colors.text }}>
                      Test Prep
                    </Text>
                    <Text className="text-xs text-center" style={{ color: colors.textSecondary }}>
                      Study for upcoming test
                    </Text>
                  </View>
                </Pressable>

                {/* Long-term Mode Button */}
                <Pressable
                  onPress={() => isTestPrep && handleSwitchMode("LONG_TERM")}
                  disabled={isLongTerm}
                  className="flex-1 rounded-2xl p-4 border-2 active:opacity-70"
                  style={{
                    backgroundColor: isLongTerm ? "#d1fae5" : colors.background,
                    borderColor: isLongTerm ? "#10b981" : colors.border,
                    opacity: isLongTerm ? 1 : 0.9
                  }}
                >
                  <View className="items-center">
                    <View
                      className="w-12 h-12 rounded-full items-center justify-center mb-2"
                      style={{ backgroundColor: isLongTerm ? "#10b981" : colors.border }}
                    >
                      <Ionicons name="repeat" size={24} color={isLongTerm ? "#fff" : colors.textSecondary} />
                    </View>
                    <Text className="font-bold text-center mb-1" style={{ color: colors.text }}>
                      Long-term
                    </Text>
                    <Text className="text-xs text-center" style={{ color: colors.textSecondary }}>
                      Review every 2 weeks
                    </Text>
                  </View>
                </Pressable>
              </View>

              {/* Info Box */}
              <View className="rounded-xl p-3 mt-3" style={{ backgroundColor: isLongTerm ? "#d1fae5" : colors.blueLight }}>
                <Text className="text-xs font-medium" style={{ color: isLongTerm ? "#10b981" : colors.primary }}>
                  {isLongTerm
                    ? "Long-term mode: Review cards every 2 weeks for retention"
                    : "Test prep mode: Cards scheduled based on test date"}
                </Text>
              </View>
            </View>
          </View>

          {/* Danger Zone */}
          <View className="rounded-3xl p-4 mb-4" style={{ backgroundColor: colors.surface }}>
            <Text className="text-xl font-bold px-2 mb-3" style={{ color: colors.error }}>
              Danger Zone
            </Text>

            <Pressable
              onPress={handleDeleteDeck}
              className="flex-row items-center justify-between py-4 px-2 active:opacity-70"
            >
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: "#fee2e2" }}>
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </View>
                <View className="flex-1">
                  <Text className="font-medium" style={{ color: colors.error }}>Delete Deck</Text>
                  <Text className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                    Permanently delete this deck
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View className="h-8" />
        </View>
      </ScrollView>

      {/* Edit Name Modal */}
      <Modal
        visible={showEditName}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setShowEditName(false)}
      >
        <SafeAreaView className="flex-1" style={{ backgroundColor: colors.surface }} edges={["top"]}>
          <View className="flex-1">
            <View className="flex-row items-center justify-between px-5 py-4 border-b" style={{ borderBottomColor: colors.border }}>
              <Pressable onPress={() => setShowEditName(false)} className="active:opacity-70">
                <Text className="text-lg" style={{ color: colors.primary }}>Cancel</Text>
              </Pressable>
              <Text className="text-xl font-bold" style={{ color: colors.text }}>Edit Deck Name</Text>
              <Pressable onPress={handleSaveName} className="active:opacity-70">
                <Text className="text-lg font-semibold" style={{ color: colors.primary }}>Save</Text>
              </Pressable>
            </View>

            <View className="px-5 py-6">
              <Text className="text-sm font-semibold mb-2" style={{ color: colors.textSecondary }}>
                Deck Name
              </Text>
              <TextInput
                value={editedName}
                onChangeText={setEditedName}
                placeholder="Enter deck name"
                className="border rounded-xl px-4 py-3.5 text-base"
                style={{
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.text
                }}
                placeholderTextColor={colors.textSecondary}
                autoFocus
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        Platform.OS === "ios" ? (
          <Modal
            visible={showDatePicker}
            animationType="slide"
            presentationStyle="formSheet"
            onRequestClose={() => setShowDatePicker(false)}
          >
            <SafeAreaView className="flex-1" style={{ backgroundColor: colors.surface }} edges={["top"]}>
              <View className="flex-1">
                <View className="flex-row items-center justify-between px-5 py-4 border-b" style={{ borderBottomColor: colors.border }}>
                  <Pressable onPress={() => setShowDatePicker(false)} className="active:opacity-70">
                    <Text className="text-lg" style={{ color: colors.primary }}>Cancel</Text>
                  </Pressable>
                  <Text className="text-xl font-bold" style={{ color: colors.text }}>Change Test Date</Text>
                  <Pressable onPress={handleConfirmDateChange} className="active:opacity-70">
                    <Text className="text-lg font-semibold" style={{ color: colors.primary }}>Done</Text>
                  </Pressable>
                </View>

                <View className="flex-1 items-center justify-center">
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="spinner"
                    onChange={handleChangeTestDate}
                    minimumDate={new Date()}
                  />
                </View>
              </View>
            </SafeAreaView>
          </Modal>
        ) : (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={handleChangeTestDate}
            minimumDate={new Date()}
          />
        )
      )}
    </SafeAreaView>
  );
}
