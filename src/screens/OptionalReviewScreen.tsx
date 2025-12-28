/**
 * Optional Review Screen
 * 
 * Allows reviewing cards without affecting their schedule.
 * Used for:
 * - Practicing on test day (when lockout is enabled)
 * - Extra review of any cards
 * - Browsing deck contents
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import { View, Text, Pressable, Image, StyleSheet, Animated, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useFlashcardStore } from "../state/flashcardStore";
import { RootStackParamList } from "../navigation/RootNavigator";
import { ReviewRating, Flashcard } from "../types/flashcard";
import { useTheme } from "../utils/useTheme";
import { getOptionalReviewCards, reviewFlashcardOptional } from "../utils/spacedRepetition";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type OptionalReviewRouteProp = RouteProp<RootStackParamList, "OptionalReview">;

export default function OptionalReviewScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<OptionalReviewRouteProp>();
  const deckId = route.params?.deckId;

  const flashcards = useFlashcardStore((s) => s.flashcards);
  const updateFlashcardLocal = useFlashcardStore((s) => s.updateFlashcard);

  const { isDark } = useTheme();

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

  const currentCard = sessionCards[currentIndex];

  // Initialize session cards
  useEffect(() => {
    if (!isInitialized && deckId) {
      const cards = getOptionalReviewCards(flashcards, deckId);
      setSessionCards(cards);
      setIsInitialized(true);
    }
  }, [deckId, flashcards, isInitialized]);

  useEffect(() => { flipAnim.setValue(0); }, [currentIndex, flipAnim]);

  const handleFlip = () => {
    if (showAnswer) {
      Animated.spring(flipAnim, { toValue: 0, friction: 8, tension: 10, useNativeDriver: true }).start();
      setShowAnswer(false);
    } else {
      Animated.spring(flipAnim, { toValue: 180, friction: 8, tension: 10, useNativeDriver: true }).start();
      setShowAnswer(true);
    }
  };

  const handleRating = async (rating: ReviewRating) => {
    if (!currentCard) return;

    // Use optional review - doesn't affect schedule
    const updates = reviewFlashcardOptional(currentCard, rating);
    
    // Update local state only (reps, lastReview, lastResponse)
    // Note: In a real implementation, you'd have a dedicated store action for this
    // For now, we just track locally
    
    setReviewedCount(reviewedCount + 1);
    
    if (rating === "AGAIN") {
      // Requeue at end
      const updatedCards = [...sessionCards];
      const cardToRequeue = updatedCards.splice(currentIndex, 1)[0];
      updatedCards.push(cardToRequeue);
      setSessionCards(updatedCards);
      setShowAnswer(false);
      flipAnim.setValue(0);
    } else {
      if (currentIndex < sessionCards.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setShowAnswer(false);
        flipAnim.setValue(0);
      } else {
        navigation.goBack();
      }
    }
  };

  if (!currentCard) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? "#0f172a" : "#f8fafc" }]}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle" size={64} color="#10b981" />
            <Text style={[styles.emptyText, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>
              No cards to review!
            </Text>
            <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
              <Text style={styles.backButtonText}>Go Back</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#0f172a" : "#f8fafc" }]}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={isDark ? "#f1f5f9" : "#1e293b"} />
          </Pressable>
          <View style={styles.progressContainer}>
            <Text style={[styles.progressText, { color: isDark ? "#94a3b8" : "#64748b" }]}>
              {currentIndex + 1} / {sessionCards.length}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Optional Mode Banner */}
        <View style={styles.banner}>
          <Ionicons name="information-circle" size={20} color="#f59e0b" />
          <Text style={styles.bannerText}>
            Optional Mode - Reviews won't affect schedule
          </Text>
        </View>

        {/* Card */}
        <View style={styles.cardContainer}>
          <Pressable onPress={handleFlip} style={styles.cardWrapper}>
            {/* Front */}
            <Animated.View style={[styles.card, frontAnimatedStyle, { backgroundColor: isDark ? "#1e293b" : "#ffffff" }]}>
              <Text style={[styles.cardLabel, { color: isDark ? "#94a3b8" : "#64748b" }]}>
                Question
              </Text>
              <Text style={[styles.cardText, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>
                {currentCard.front}
              </Text>
              {currentCard.imageUri && (
                <Image source={{ uri: currentCard.imageUri }} style={styles.cardImage} resizeMode="contain" />
              )}
              <Text style={[styles.tapHint, { color: isDark ? "#64748b" : "#94a3b8" }]}>
                Tap to reveal answer
              </Text>
            </Animated.View>

            {/* Back */}
            <Animated.View style={[styles.card, styles.cardBack, backAnimatedStyle, { backgroundColor: isDark ? "#1e293b" : "#ffffff" }]}>
              <Text style={[styles.cardLabel, { color: isDark ? "#94a3b8" : "#64748b" }]}>
                Answer
              </Text>
              <Text style={[styles.cardText, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>
                {currentCard.back}
              </Text>
            </Animated.View>
          </Pressable>
        </View>

        {/* Rating Buttons (only shown when answer is visible) */}
        {showAnswer && (
          <View style={styles.ratingContainer}>
            <Pressable 
              style={[styles.ratingButton, styles.againButton]} 
              onPress={() => handleRating("AGAIN")}
            >
              <Text style={styles.ratingButtonText}>Again</Text>
            </Pressable>
            <Pressable 
              style={[styles.ratingButton, styles.hardButton]} 
              onPress={() => handleRating("HARD")}
            >
              <Text style={styles.ratingButtonText}>Hard</Text>
            </Pressable>
            <Pressable 
              style={[styles.ratingButton, styles.goodButton]} 
              onPress={() => handleRating("GOOD")}
            >
              <Text style={styles.ratingButtonText}>Good</Text>
            </Pressable>
            <Pressable 
              style={[styles.ratingButton, styles.easyButton]} 
              onPress={() => handleRating("EASY")}
            >
              <Text style={styles.ratingButtonText}>Easy</Text>
            </Pressable>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsContainer}>
          <Text style={[styles.statsText, { color: isDark ? "#94a3b8" : "#64748b" }]}>
            Reviewed: {reviewedCount}
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  progressContainer: {
    flex: 1,
    alignItems: "center",
  },
  progressText: {
    fontSize: 16,
    fontWeight: "600",
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  bannerText: {
    color: "#f59e0b",
    fontSize: 14,
    fontWeight: "500",
  },
  cardContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    width: '100%',
    maxWidth: SCREEN_WIDTH,
  },
  cardWrapper: {
    width: "100%",
    maxWidth: 400,
    aspectRatio: 0.7,
  },
  card: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    backfaceVisibility: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  cardBack: {
    position: "absolute",
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 16,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  cardText: {
    fontSize: 22,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 32,
  },
  cardImage: {
    width: "80%",
    height: 150,
    marginTop: 16,
    borderRadius: 12,
  },
  tapHint: {
    position: "absolute",
    bottom: 24,
    fontSize: 14,
  },
  ratingContainer: {
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
    width: '100%',
    maxWidth: SCREEN_WIDTH,
  },
  ratingButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    maxWidth: 85,
  },
  againButton: {
    backgroundColor: "#ef4444",
  },
  hardButton: {
    backgroundColor: "#f97316",
  },
  goodButton: {
    backgroundColor: "#22c55e",
  },
  easyButton: {
    backgroundColor: "#3b82f6",
  },
  ratingButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  statsContainer: {
    alignItems: "center",
    paddingBottom: 16,
  },
  statsText: {
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
  },
  backButton: {
    backgroundColor: "#667eea",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  backButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});

