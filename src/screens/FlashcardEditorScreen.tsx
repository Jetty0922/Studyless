import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useFlashcardStore } from "../state/flashcardStore";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useTheme } from "../utils/useTheme";
import { Card } from "../components/ui";
import { trackFlashcardsCreated } from "../services/analytics";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type EditorRouteProp = RouteProp<RootStackParamList, "FlashcardEditor">;

export default function FlashcardEditorScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<EditorRouteProp>();
  const { deckId, cardId } = route.params;

  const flashcards = useFlashcardStore((s) => s.flashcards);
  const addFlashcard = useFlashcardStore((s) => s.addFlashcard);
  const updateFlashcard = useFlashcardStore((s) => s.updateFlashcard);
  const deleteFlashcard = useFlashcardStore((s) => s.deleteFlashcard);

  const existingCard = cardId ? flashcards.find((c) => c.id === cardId) : null;
  const isEditing = !!existingCard;

  const [front, setFront] = useState(existingCard?.front || "");
  const [back, setBack] = useState(existingCard?.back || "");
  const [answerImage, setAnswerImage] = useState<string | undefined>(existingCard?.imageUri);
  const [isSaving, setIsSaving] = useState(false);
  const [cardCount, setCardCount] = useState(0);

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"] as any,
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setAnswerImage(result.assets[0].uri);
      }
    } catch {
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Camera permission is required");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setAnswerImage(result.assets[0].uri);
      }
    } catch {
      Alert.alert("Error", "Failed to take photo");
    }
  };

  const handleSave = async () => {
    if (!front.trim()) {
      Alert.alert("Error", "Question cannot be empty");
      return;
    }
    if (!back.trim()) {
      Alert.alert("Error", "Answer cannot be empty");
      return;
    }

    setIsSaving(true);
    try {
      if (isEditing && cardId) {
        await updateFlashcard(cardId, front.trim(), back.trim());
        navigation.goBack();
      } else {
        await addFlashcard(deckId, front.trim(), back.trim(), answerImage);
        // Track manual card creation
        trackFlashcardsCreated(1, 'manual');
        // Clear form for next card
        setFront("");
        setBack("");
        setAnswerImage(undefined);
        setCardCount(c => c + 1);
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to save card");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (front.trim() || back.trim()) {
      Alert.alert("Discard changes?", "You have unsaved changes.", [
        { text: "Keep Editing", style: "cancel" },
        { text: "Discard", style: "destructive", onPress: () => navigation.goBack() },
      ]);
    } else {
      navigation.goBack();
    }
  };

  const handleDelete = () => {
    if (!cardId) return;
    Alert.alert("Delete Card", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteFlashcard(cardId);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={handleClose} hitSlop={8}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {isEditing ? "Edit Card" : cardCount > 0 ? `New Card (${cardCount} added)` : "New Card"}
          </Text>
          <Pressable
            onPress={handleSave}
            disabled={isSaving}
            style={[styles.saveButton, { opacity: isSaving ? 0.5 : 1 }]}
          >
            <Text style={[styles.saveButtonText, { color: colors.primary }]}>
              {isSaving ? "..." : isEditing ? "Save" : "Add"}
            </Text>
          </Pressable>
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView 
            style={styles.scrollView} 
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {/* Question */}
            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Question</Text>
              <TextInput
                value={front}
                onChangeText={setFront}
                placeholder="Enter question..."
                placeholderTextColor={colors.textSecondary}
                multiline
                style={[
                  styles.textInput,
                  { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
                ]}
              />
            </View>

            {/* Answer */}
            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Answer</Text>
              
              {/* Image for answer */}
              {answerImage ? (
                <View style={styles.imageContainer}>
                  <Image source={{ uri: answerImage }} style={styles.attachedImage} resizeMode="cover" />
                  <Pressable onPress={() => setAnswerImage(undefined)} style={styles.removeImageBtn}>
                    <Ionicons name="close-circle" size={26} color="#ef4444" />
                  </Pressable>
                </View>
              ) : (
                <View style={styles.imageButtons}>
                  <Pressable onPress={handlePickImage} style={[styles.imageBtn, { borderColor: colors.border }]}>
                    <Ionicons name="image-outline" size={18} color={colors.primary} />
                    <Text style={[styles.imageBtnText, { color: colors.textSecondary }]}>Image</Text>
                  </Pressable>
                  <Pressable onPress={handleTakePhoto} style={[styles.imageBtn, { borderColor: colors.border }]}>
                    <Ionicons name="camera-outline" size={18} color={colors.primary} />
                    <Text style={[styles.imageBtnText, { color: colors.textSecondary }]}>Camera</Text>
                  </Pressable>
                </View>
              )}

              <TextInput
                value={back}
                onChangeText={setBack}
                placeholder="Enter answer..."
                placeholderTextColor={colors.textSecondary}
                multiline
                style={[
                  styles.textInput,
                  { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
                ]}
              />
            </View>

            {/* Delete (edit mode only) */}
            {isEditing && (
              <Pressable onPress={handleDelete} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
                <Text style={styles.deleteBtnText}>Delete Card</Text>
              </Pressable>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: "600", textAlign: "center" },
  saveButton: { paddingHorizontal: 4 },
  saveButtonText: { fontSize: 16, fontWeight: "600" },
  keyboardView: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, gap: 20 },
  
  inputSection: { gap: 8 },
  inputLabel: { fontSize: 13, fontWeight: "500" },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 80,
    maxHeight: 140,
    textAlignVertical: "top",
  },
  
  imageButtons: { flexDirection: "row", gap: 10 },
  imageBtn: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 6, 
    paddingHorizontal: 14,
    paddingVertical: 8, 
    borderRadius: 8, 
    borderWidth: 1,
  },
  imageBtnText: { fontSize: 13 },
  imageContainer: { position: "relative" },
  attachedImage: { width: "100%", height: 120, borderRadius: 8 },
  removeImageBtn: { position: "absolute", top: 4, right: 4 },
  
  deleteBtn: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    gap: 6, 
    paddingVertical: 12,
    marginTop: 8,
  },
  deleteBtnText: { fontSize: 14, color: "#ef4444" },
});
