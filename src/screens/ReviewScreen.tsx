import React, { useState, useEffect, useRef, useMemo } from "react";
import { View, Text, Pressable, Image, StyleSheet, Animated, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useFlashcardStore } from "../state/flashcardStore";
import { RootStackParamList } from "../navigation/RootNavigator";
import { ReviewRating, Flashcard } from "../types/flashcard";
import { useTheme } from "../utils/useTheme";
import { getIntervalPreviews } from "../utils/spacedRepetition";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ReviewRouteProp = RouteProp<RootStackParamList, "Review">;

export default function ReviewScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ReviewRouteProp>();
  const cardIds = route.params?.cards || [];

  const flashcards = useFlashcardStore((s) => s.flashcards);
  const reviewFlashcard = useFlashcardStore((s) => s.reviewFlashcard);

  const { colors, isDark } = useTheme();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [sessionCards, setSessionCards] = useState<Flashcard[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  const flipAnim = useRef(new Animated.Value(0)).current;

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });

  const frontAnimatedStyle = { transform: [{ rotateY: frontInterpolate }] };
  const backAnimatedStyle = { transform: [{ rotateY: backInterpolate }] };

  // Calculate interval previews - must be before any conditional returns (React Hooks rules)
  const currentCard = sessionCards[currentIndex];
  const intervalPreviews = useMemo(() => {
    if (!currentCard) return { again: "—", hard: "—", good: "—", easy: "—" };
    return getIntervalPreviews(currentCard);
  }, [currentCard]);

  // Only initialize session cards ONCE when component mounts
  // Don't re-run when flashcards store updates (would reset session progress)
  useEffect(() => {
    if (!isInitialized) {
      const initialCards = cardIds.map((id) => flashcards.find((c) => c.id === id)).filter((c): c is Flashcard => c !== undefined);
      setSessionCards(initialCards);
      setIsInitialized(true);
    }
  }, [cardIds, flashcards, isInitialized]);

  useEffect(() => { flipAnim.setValue(0); }, [currentIndex]);

  const handleFlip = () => {
    if (showAnswer) {
      Animated.spring(flipAnim, { toValue: 0, friction: 8, tension: 10, useNativeDriver: true }).start();
      setShowAnswer(false);
    } else {
      Animated.spring(flipAnim, { toValue: 180, friction: 8, tension: 10, useNativeDriver: true }).start();
      setShowAnswer(true);
    }
  };

  const handleRating = (rating: ReviewRating) => {
    if (!currentCard) return;

    if (rating === "AGAIN") {
      reviewFlashcard(currentCard.id, rating);
      const updatedCards = [...sessionCards];
      const cardToRequeue = updatedCards.splice(currentIndex, 1)[0];
      updatedCards.push(cardToRequeue);
      setSessionCards(updatedCards);
      setShowAnswer(false);
      flipAnim.setValue(0);
    } else {
      reviewFlashcard(currentCard.id, rating);
      setReviewedCount(reviewedCount + 1);
      if (currentIndex < sessionCards.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setShowAnswer(false);
        flipAnim.setValue(0);
      } else {
        navigation.goBack();
      }
    }
  };

  const handleClose = () => navigation.goBack();

  if (!isInitialized) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={isDark ? ["#0f172a", "#1e1b4b"] : ["#f8fafc", "#eef2ff"]} style={StyleSheet.absoluteFillObject} />
        <SafeAreaView style={styles.centerContainer}>
          <Text style={[styles.emptyText, { color: isDark ? "#64748b" : "#94a3b8" }]}>Loading...</Text>
        </SafeAreaView>
      </View>
    );
  }

  if (sessionCards.length === 0) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={isDark ? ["#0f172a", "#1e1b4b"] : ["#f8fafc", "#eef2ff"]} style={StyleSheet.absoluteFillObject} />
        <SafeAreaView style={styles.centerContainer}>
          <Text style={[styles.emptyText, { color: isDark ? "#64748b" : "#94a3b8" }]}>No cards to review</Text>
        </SafeAreaView>
      </View>
    );
  }

  if (!currentCard) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={isDark ? ["#0f172a", "#1e1b4b"] : ["#f8fafc", "#eef2ff"]} style={StyleSheet.absoluteFillObject} />
        <SafeAreaView style={styles.centerContainer}>
          <Text style={[styles.emptyText, { color: isDark ? "#64748b" : "#94a3b8" }]}>Card not found</Text>
        </SafeAreaView>
      </View>
    );
  }

  const progress = ((currentIndex + 1) / sessionCards.length) * 100;

  return (
    <View style={styles.container}>
      <LinearGradient colors={isDark ? ["#0f172a", "#1e1b4b"] : ["#f8fafc", "#eef2ff"]} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={isDark ? "#f1f5f9" : "#1e293b"} />
          </Pressable>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)" }]}>
              <LinearGradient colors={["#667eea", "#764ba2"]} style={[styles.progressFill, { width: `${progress}%` }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
            </View>
            <Text style={[styles.progressText, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>{currentIndex + 1} of {sessionCards.length}</Text>
          </View>
          <View style={styles.spacer} />
        </View>

        {/* Card */}
        <View style={styles.cardContainer}>
          <Pressable onPress={handleFlip} style={styles.cardWrapper}>
            <LinearGradient colors={isDark ? ["rgba(255,255,255,0.08)", "rgba(255,255,255,0.03)"] : ["rgba(255,255,255,0.9)", "rgba(255,255,255,0.7)"]} style={styles.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Animated.View style={[styles.cardFace, frontAnimatedStyle, { backfaceVisibility: 'hidden' }]}>
                <Text style={[styles.frontText, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>{currentCard.front}</Text>
                {/* Only show image if imageUri exists AND there's no fileUri (fileUri indicates PDF source) */}
                {currentCard.imageUri && !currentCard.fileUri && <Image source={{ uri: currentCard.imageUri }} style={styles.cardImage} resizeMode="cover" />}
                <View style={styles.tapHint}>
                  <View style={[styles.tapHintPill, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]}>
                    <Ionicons name="swap-horizontal" size={14} color={isDark ? "#64748b" : "#94a3b8"} />
                    <Text style={[styles.tapHintText, { color: isDark ? "#64748b" : "#94a3b8" }]}>Tap to reveal</Text>
                  </View>
                </View>
              </Animated.View>

              <Animated.View style={[styles.cardFace, styles.cardBack, backAnimatedStyle, { backfaceVisibility: 'hidden' }]}>
                <LinearGradient colors={isDark ? ["rgba(255,255,255,0.08)", "rgba(255,255,255,0.03)"] : ["rgba(255,255,255,0.9)", "rgba(255,255,255,0.7)"]} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <Text style={[styles.backText, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>{currentCard.back}</Text>
              </Animated.View>
            </LinearGradient>
          </Pressable>
        </View>

        {/* Rating Buttons */}
        {showAnswer && (
          <View style={styles.ratingContainer}>
            <Text style={[styles.ratingTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>How well did you know this?</Text>
            <View style={styles.ratingButtonsRow}>
              <Pressable onPress={() => handleRating("AGAIN")} style={({ pressed }) => [styles.ratingButton, pressed && styles.pressed]}>
                <LinearGradient colors={["#ef4444", "#dc2626"]} style={styles.ratingButtonGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Text style={styles.ratingButtonText}>Again</Text>
                  <Text style={styles.ratingButtonSubtext}>{intervalPreviews.again}</Text>
                </LinearGradient>
              </Pressable>

              <Pressable onPress={() => handleRating("HARD")} style={({ pressed }) => [styles.ratingButton, pressed && styles.pressed]}>
                <LinearGradient colors={["#f97316", "#ea580c"]} style={styles.ratingButtonGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Text style={styles.ratingButtonText}>Hard</Text>
                  <Text style={styles.ratingButtonSubtext}>{intervalPreviews.hard}</Text>
                </LinearGradient>
              </Pressable>

              <Pressable onPress={() => handleRating("GOOD")} style={({ pressed }) => [styles.ratingButton, pressed && styles.pressed]}>
                <LinearGradient colors={["#10b981", "#059669"]} style={styles.ratingButtonGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Text style={styles.ratingButtonText}>Good</Text>
                  <Text style={styles.ratingButtonSubtext}>{intervalPreviews.good}</Text>
                </LinearGradient>
              </Pressable>

              <Pressable onPress={() => handleRating("EASY")} style={({ pressed }) => [styles.ratingButton, pressed && styles.pressed]}>
                <LinearGradient colors={["#667eea", "#764ba2"]} style={styles.ratingButtonGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Text style={styles.ratingButtonText}>Easy</Text>
                  <Text style={styles.ratingButtonSubtext}>{intervalPreviews.easy}</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const BUTTON_WIDTH = (SCREEN_WIDTH - 56) / 4; // 20px padding on each side + 16px total gaps

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 18 },
  safeArea: { flex: 1 },
  header: { 
    paddingHorizontal: 16, 
    paddingTop: 8, 
    paddingBottom: 8, 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between",
    overflow: "hidden",
    maxWidth: SCREEN_WIDTH,
  },
  closeButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    alignItems: "center", 
    justifyContent: "center",
    flexShrink: 0,
  },
  pressed: { opacity: 0.7 },
  progressContainer: { 
    flex: 1, 
    marginHorizontal: 8,
    minWidth: 0, // Allow shrinking below content size
    maxWidth: SCREEN_WIDTH - 120, // Account for close button, spacer, and padding
  },
  progressBar: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  progressText: { fontSize: 13, fontWeight: "600", textAlign: "center", marginTop: 6 },
  spacer: { width: 40, flexShrink: 0 },
  cardContainer: { 
    flex: 1, 
    paddingHorizontal: 16, 
    justifyContent: "center",
    paddingVertical: 16,
  },
  cardWrapper: { flex: 1, maxHeight: 340 },
  card: { 
    flex: 1, 
    borderRadius: 24, 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 8 }, 
    shadowOpacity: 0.15, 
    shadowRadius: 24, 
    elevation: 10, 
    borderWidth: 1, 
    borderColor: "rgba(255,255,255,0.2)" 
  },
  cardFace: { 
    width: '100%', 
    height: '100%', 
    padding: 24, 
    justifyContent: "center", 
    alignItems: "center", 
    borderRadius: 24 
  },
  cardBack: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 24 },
  frontText: { fontSize: 22, fontWeight: "700", textAlign: "center", lineHeight: 32 },
  backText: { fontSize: 18, fontWeight: "600", textAlign: "center", lineHeight: 26 },
  cardImage: { width: "100%", height: 140, borderRadius: 16, marginTop: 20 },
  tapHint: { position: "absolute", bottom: 20 },
  tapHintPill: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 6 },
  tapHintText: { fontSize: 12, fontWeight: "500" },
  ratingContainer: { 
    paddingHorizontal: 16, 
    paddingBottom: 16,
    paddingTop: 8,
  },
  ratingTitle: { textAlign: "center", fontWeight: "600", fontSize: 15, marginBottom: 12 },
  ratingButtonsRow: { 
    flexDirection: "row", 
    justifyContent: "space-between",
    gap: 8,
  },
  ratingButton: { 
    flex: 1,
    borderRadius: 24, 
    overflow: "hidden", 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 8, 
    elevation: 3 
  },
  ratingButtonGradient: { 
    paddingVertical: 14, 
    paddingHorizontal: 8, 
    alignItems: "center", 
    justifyContent: "center" 
  },
  ratingButtonText: { color: "#ffffff", fontSize: 15, fontWeight: "700", marginBottom: 2 },
  ratingButtonSubtext: { color: "rgba(255, 255, 255, 0.85)", fontSize: 11, fontWeight: "600" },
});
