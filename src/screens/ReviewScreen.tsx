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
import { getIntervalPreviews } from "../utils/spacedRepetition";
import { getCardDebugInfo } from "../utils/debugTools";
import { trackReviewCompleted } from "../services/analytics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ReviewRouteProp = RouteProp<RootStackParamList, "Review">;

export default function ReviewScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ReviewRouteProp>();
  const cardIds = useMemo(() => route.params?.cards ?? [], [route.params?.cards]);

  const flashcards = useFlashcardStore((s) => s.flashcards);
  const reviewFlashcard = useFlashcardStore((s) => s.reviewFlashcard);
  const debugMode = useFlashcardStore((s) => s.debugMode);

  const { colors, isDark } = useTheme();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [sessionCards, setSessionCards] = useState<Flashcard[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Review time tracking - start timer when card is shown
  const cardShowTimeRef = useRef<number>(Date.now());
  
  // Session tracking for analytics
  const sessionStartTime = useRef<number>(Date.now());
  const ratingCounts = useRef({ again: 0, hard: 0, good: 0, easy: 0 });

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

  // Calculate debug info for current card
  const debugInfo = useMemo(() => {
    if (!currentCard || !debugMode) return null;
    return getCardDebugInfo(currentCard);
  }, [currentCard, debugMode]);

  // Only initialize session cards ONCE when component mounts
  // Don't re-run when flashcards store updates (would reset session progress)
  useEffect(() => {
    if (!isInitialized) {
      const initialCards = cardIds.map((id) => flashcards.find((c) => c.id === id)).filter((c): c is Flashcard => c !== undefined);
      setSessionCards(initialCards);
      setIsInitialized(true);
    }
  }, [cardIds, flashcards, isInitialized]);

  // Reset flip animation and start timer when card changes
  useEffect(() => { 
    flipAnim.setValue(0); 
    cardShowTimeRef.current = Date.now();
  }, [currentIndex, flipAnim]);

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
    
    // Calculate review time (time from card shown to rating)
    const reviewTimeMs = Date.now() - cardShowTimeRef.current;
    
    // Check if card is in learning phase (not graduated)
    const isLearning = currentCard.learningState !== 'GRADUATED';
    
    // AGAIN or HARD during learning: Requeue to end of session
    // This ensures the card reappears within the same session
    if (rating === "AGAIN" || (rating === "HARD" && isLearning)) {
      reviewFlashcard(currentCard.id, rating, reviewTimeMs);
      const updatedCards = [...sessionCards];
      const cardToRequeue = updatedCards.splice(currentIndex, 1)[0];
      
      // Manually apply the state changes for AGAIN
      // (reviewFlashcard is async, so card hasn't updated yet in session)
      if (rating === "AGAIN") {
        cardToRequeue.learningState = 'RELEARNING';
        cardToRequeue.learningStep = 0;
      }
      
      updatedCards.push(cardToRequeue); // Add to END of session
      setSessionCards(updatedCards);
      setShowAnswer(false);
      flipAnim.setValue(0);
      // Reset timer for requeued card
      cardShowTimeRef.current = Date.now();
    } else {
      // GOOD, EASY, or HARD during review: Remove from session
      reviewFlashcard(currentCard.id, rating, reviewTimeMs);
      
      // Track rating for analytics
      const ratingKey = rating.toLowerCase() as 'again' | 'hard' | 'good' | 'easy';
      ratingCounts.current[ratingKey]++;
      
      setReviewedCount(reviewedCount + 1);
      if (currentIndex < sessionCards.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setShowAnswer(false);
        flipAnim.setValue(0);
      } else {
        // Session complete - track analytics
        const sessionDuration = Math.round((Date.now() - sessionStartTime.current) / 1000);
        trackReviewCompleted(reviewedCount + 1, sessionDuration, ratingCounts.current);
        navigation.goBack();
      }
    }
  };

  const handleClose = () => {
    navigation.goBack();
  };

  if (!isInitialized) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SafeAreaView style={styles.centerContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Loading...</Text>
        </SafeAreaView>
      </View>
    );
  }

  if (sessionCards.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SafeAreaView style={styles.centerContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No cards to review</Text>
        </SafeAreaView>
      </View>
    );
  }

  if (!currentCard) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SafeAreaView style={styles.centerContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Card not found</Text>
        </SafeAreaView>
      </View>
    );
  }

  const progress = ((currentIndex + 1) / sessionCards.length) * 100;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: colors.primary }]} />
            </View>
            <Text style={[styles.progressText, { color: colors.text }]}>{currentIndex + 1} of {sessionCards.length}</Text>
          </View>
          <View style={styles.spacer} />
        </View>

        {/* Card */}
        <View style={styles.cardContainer}>
          <Pressable onPress={handleFlip} style={styles.cardWrapper}>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Animated.View style={[styles.cardFace, frontAnimatedStyle, { backfaceVisibility: 'hidden' }]}>
                <Text style={[styles.frontText, { color: colors.text }]}>{currentCard.front}</Text>
                {currentCard.imageUri && !currentCard.fileUri && <Image source={{ uri: currentCard.imageUri }} style={styles.cardImage} resizeMode="cover" />}
                <View style={styles.tapHint}>
                  <View style={[styles.tapHintPill, { backgroundColor: colors.surface }]}>
                    <Ionicons name="swap-horizontal" size={14} color={colors.textSecondary} />
                    <Text style={[styles.tapHintText, { color: colors.textSecondary }]}>Tap to reveal</Text>
                  </View>
                </View>
              </Animated.View>

              <Animated.View style={[styles.cardFace, styles.cardBack, backAnimatedStyle, { backfaceVisibility: 'hidden', backgroundColor: colors.card }]}>
                <Text style={[styles.backText, { color: colors.text }]}>{currentCard.back}</Text>
              </Animated.View>
            </View>
          </Pressable>
          
          {/* Debug Overlay */}
          {debugInfo && (
            <View style={[styles.debugOverlay, { backgroundColor: isDark ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0.75)" }]}>
              <Text style={styles.debugTitle}>FSRS Debug</Text>
              <View style={styles.debugRow}>
                <Text style={styles.debugLabel}>State:</Text>
                <Text style={styles.debugValue}>{debugInfo.learningState} ({debugInfo.state})</Text>
              </View>
              <View style={styles.debugRow}>
                <Text style={styles.debugLabel}>Step:</Text>
                <Text style={styles.debugValue}>{debugInfo.learningStep}</Text>
              </View>
              <View style={styles.debugRow}>
                <Text style={styles.debugLabel}>Stability:</Text>
                <Text style={styles.debugValue}>{debugInfo.stability} days</Text>
              </View>
              <View style={styles.debugRow}>
                <Text style={styles.debugLabel}>Difficulty:</Text>
                <Text style={styles.debugValue}>{debugInfo.difficulty}/10</Text>
              </View>
              <View style={styles.debugRow}>
                <Text style={styles.debugLabel}>Ease:</Text>
                <Text style={styles.debugValue}>{debugInfo.easeFactor}</Text>
              </View>
              <View style={styles.debugRow}>
                <Text style={styles.debugLabel}>Retrievability:</Text>
                <Text style={[styles.debugValue, { color: debugInfo.retrievability < 0.8 ? "#ef4444" : "#22c55e" }]}>
                  {debugInfo.retrievabilityPercent}
                </Text>
              </View>
              <View style={styles.debugRow}>
                <Text style={styles.debugLabel}>Elapsed:</Text>
                <Text style={styles.debugValue}>{debugInfo.daysSinceLastReview}d</Text>
              </View>
              <View style={styles.debugRow}>
                <Text style={styles.debugLabel}>Reps/Lapses:</Text>
                <Text style={styles.debugValue}>{debugInfo.reps}/{debugInfo.lapses}</Text>
              </View>
              {debugInfo.isLeech && (
                <Text style={styles.debugLeech}>⚠️ LEECH</Text>
              )}
            </View>
          )}
        </View>

        {/* Rating Buttons */}
        {showAnswer && (
          <View style={styles.ratingContainer}>
            <Text style={[styles.ratingTitle, { color: colors.text }]}>How well did you know this?</Text>
            <View style={styles.ratingButtonsRow}>
              <Pressable onPress={() => handleRating("AGAIN")} style={({ pressed }) => [styles.ratingButton, { backgroundColor: colors.error, opacity: pressed ? 0.8 : 1 }]}>
                <Text style={styles.ratingButtonText}>Again</Text>
                <Text style={styles.ratingButtonSubtext}>{intervalPreviews.again}</Text>
              </Pressable>

              <Pressable onPress={() => handleRating("HARD")} style={({ pressed }) => [styles.ratingButton, { backgroundColor: colors.warning, opacity: pressed ? 0.8 : 1 }]}>
                <Text style={styles.ratingButtonText}>Hard</Text>
                <Text style={styles.ratingButtonSubtext}>{intervalPreviews.hard}</Text>
              </Pressable>

              <Pressable onPress={() => handleRating("GOOD")} style={({ pressed }) => [styles.ratingButton, { backgroundColor: colors.success, opacity: pressed ? 0.8 : 1 }]}>
                <Text style={styles.ratingButtonText}>Good</Text>
                <Text style={styles.ratingButtonSubtext}>{intervalPreviews.good}</Text>
              </Pressable>

              <Pressable onPress={() => handleRating("EASY")} style={({ pressed }) => [styles.ratingButton, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}>
                <Text style={styles.ratingButtonText}>Easy</Text>
                <Text style={styles.ratingButtonSubtext}>{intervalPreviews.easy}</Text>
              </Pressable>
            </View>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

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
    width: '100%',
    maxWidth: SCREEN_WIDTH,
    alignSelf: 'center',
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
    width: '100%',
    maxWidth: SCREEN_WIDTH,
    alignSelf: 'center',
  },
  ratingTitle: { textAlign: "center", fontWeight: "600", fontSize: 15, marginBottom: 12 },
  ratingButtonsRow: { 
    flexDirection: "row", 
    justifyContent: "space-between",
    gap: 8,
  },
  ratingButton: { 
    flex: 1,
    borderRadius: 8, 
    paddingVertical: 12, 
    paddingHorizontal: 6, 
    alignItems: "center", 
    justifyContent: "center",
  },
  ratingButtonText: { color: "#ffffff", fontSize: 15, fontWeight: "700", marginBottom: 2 },
  ratingButtonSubtext: { color: "rgba(255, 255, 255, 0.85)", fontSize: 11, fontWeight: "600" },
  
  // Debug overlay styles
  debugOverlay: {
    position: "absolute",
    top: 8,
    right: 8,
    padding: 10,
    borderRadius: 12,
    minWidth: 140,
    zIndex: 100,
  },
  debugTitle: {
    color: "#22c55e",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 6,
    fontFamily: "monospace",
  },
  debugRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  debugLabel: {
    color: "#94a3b8",
    fontSize: 10,
    fontFamily: "monospace",
  },
  debugValue: {
    color: "#f1f5f9",
    fontSize: 10,
    fontWeight: "600",
    fontFamily: "monospace",
  },
  debugLeech: {
    color: "#ef4444",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 4,
  },
});
