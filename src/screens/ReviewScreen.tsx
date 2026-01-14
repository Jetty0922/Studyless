import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { View, Text, Pressable, Image, StyleSheet, Animated, Dimensions, Modal, TextInput, Platform, ScrollView } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFlashcardStore } from "../state/flashcardStore";
import { RootStackParamList } from "../navigation/RootNavigator";
import { ReviewRating, Flashcard } from "../types/flashcard";
import { useTheme } from "../utils/useTheme";
import { getIntervalPreviews } from "../utils/spacedRepetition";
import { getCardDebugInfo } from "../utils/debugTools";
import { trackReviewCompleted } from "../services/analytics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Maximum undo history entries to keep in memory
const MAX_UNDO_HISTORY = 10;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ReviewRouteProp = RouteProp<RootStackParamList, "Review">;

// Undo history entry interface
interface ReviewHistoryEntry {
  cardId: string;
  cardSnapshot: Flashcard;
  sessionCardsSnapshot: Flashcard[];
  currentIndex: number;
  reviewedCount: number;
  wasRequeued: boolean;
}

export default function ReviewScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ReviewRouteProp>();
  const cardIds = useMemo(() => route.params?.cards ?? [], [route.params?.cards]);

  const flashcards = useFlashcardStore((s) => s.flashcards);
  const reviewFlashcard = useFlashcardStore((s) => s.reviewFlashcard);
  const undoReviewFlashcard = useFlashcardStore((s) => s.undoReviewFlashcard);
  const updateFlashcard = useFlashcardStore((s) => s.updateFlashcard);
  const deleteFlashcard = useFlashcardStore((s) => s.deleteFlashcard);
  const debugMode = useFlashcardStore((s) => s.debugMode);

  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [sessionCards, setSessionCards] = useState<Flashcard[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Undo history state
  const [reviewHistory, setReviewHistory] = useState<ReviewHistoryEntry[]>([]);
  
  // Menu and modal states
  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");
  
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
    
    // Capture state BEFORE the review for undo functionality
    const historyEntry: ReviewHistoryEntry = {
      cardId: currentCard.id,
      cardSnapshot: { ...currentCard },
      sessionCardsSnapshot: sessionCards.map(c => ({ ...c })),
      currentIndex,
      reviewedCount,
      wasRequeued: false,
    };
    
    // Calculate review time (time from card shown to rating)
    const reviewTimeMs = Date.now() - cardShowTimeRef.current;
    
    // Check if card is in learning phase (not graduated)
    const isLearning = currentCard.learningState !== 'GRADUATED';
    
    // AGAIN or HARD during learning: Requeue to end of session
    // This ensures the card reappears within the same session
    if (rating === "AGAIN" || (rating === "HARD" && isLearning)) {
      historyEntry.wasRequeued = true;
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
    
    // Add to history (limit to MAX_UNDO_HISTORY entries)
    setReviewHistory(prev => [...prev.slice(-(MAX_UNDO_HISTORY - 1)), historyEntry]);
  };
  
  // Handle undo - restore previous state
  const handleUndo = useCallback(async () => {
    if (reviewHistory.length === 0) return;
    
    const lastEntry = reviewHistory[reviewHistory.length - 1];
    
    // Haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    // Restore card state in store
    await undoReviewFlashcard(lastEntry.cardId, lastEntry.cardSnapshot);
    
    // Restore session state
    setSessionCards(lastEntry.sessionCardsSnapshot);
    setCurrentIndex(lastEntry.currentIndex);
    setReviewedCount(lastEntry.reviewedCount);
    setShowAnswer(false);
    flipAnim.setValue(0);
    
    // Remove the entry from history
    setReviewHistory(prev => prev.slice(0, -1));
    
    // Reset card timer
    cardShowTimeRef.current = Date.now();
  }, [reviewHistory, undoReviewFlashcard, flipAnim]);
  
  // Open edit modal
  const handleOpenEdit = useCallback(() => {
    if (!currentCard) return;
    setEditFront(currentCard.front);
    setEditBack(currentCard.back);
    setShowMenu(false);
    setShowEditModal(true);
  }, [currentCard]);
  
  // Save edited card
  const handleSaveEdit = useCallback(async () => {
    if (!currentCard || !editFront.trim() || !editBack.trim()) return;
    
    // Update in store
    await updateFlashcard(currentCard.id, editFront.trim(), editBack.trim());
    
    // Update in local session cards
    setSessionCards(prev => prev.map(c => 
      c.id === currentCard.id 
        ? { ...c, front: editFront.trim(), back: editBack.trim() }
        : c
    ));
    
    setShowEditModal(false);
    
    // Haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [currentCard, editFront, editBack, updateFlashcard]);
  
  // Open delete confirmation
  const handleOpenDelete = useCallback(() => {
    setShowMenu(false);
    setShowDeleteConfirm(true);
  }, []);
  
  // Confirm delete card
  const handleConfirmDelete = useCallback(async () => {
    if (!currentCard) return;
    
    // Haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    
    // Delete from store
    await deleteFlashcard(currentCard.id);
    
    // Remove from session cards
    const updatedCards = sessionCards.filter(c => c.id !== currentCard.id);
    
    setShowDeleteConfirm(false);
    
    if (updatedCards.length === 0) {
      // No more cards, go back
      navigation.goBack();
      return;
    }
    
    setSessionCards(updatedCards);
    
    // Adjust current index if needed
    if (currentIndex >= updatedCards.length) {
      setCurrentIndex(updatedCards.length - 1);
    }
    
    setShowAnswer(false);
    flipAnim.setValue(0);
    cardShowTimeRef.current = Date.now();
    
    // Clear undo history for deleted card
    setReviewHistory(prev => prev.filter(h => h.cardId !== currentCard.id));
  }, [currentCard, sessionCards, currentIndex, deleteFlashcard, navigation, flipAnim]);

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
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
            <Pressable 
              onPress={handleUndo} 
              disabled={reviewHistory.length === 0}
              style={[
                styles.undoButton, 
                { opacity: reviewHistory.length === 0 ? 0.3 : 1 }
              ]}
            >
              <Ionicons name="arrow-undo" size={22} color={colors.text} />
            </Pressable>
          </View>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: colors.primary }]} />
            </View>
            <Text style={[styles.progressText, { color: colors.text }]}>{currentIndex + 1} of {sessionCards.length}</Text>
          </View>
          <Pressable onPress={() => setShowMenu(true)} style={styles.menuButton}>
            <Ionicons name="ellipsis-vertical" size={22} color={colors.text} />
          </Pressable>
        </View>

        {/* Card */}
        <View style={styles.cardContainer}>
          <View style={styles.cardWrapper}>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Animated.View style={[styles.cardFace, frontAnimatedStyle, { backfaceVisibility: 'hidden' }]}>
                <ScrollView 
                  style={styles.cardScrollView} 
                  contentContainerStyle={styles.cardScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  <Text style={[styles.frontText, { color: colors.text }]}>{currentCard.front}</Text>
                  {currentCard.imageUri && !currentCard.fileUri && <Image source={{ uri: currentCard.imageUri }} style={styles.cardImage} resizeMode="cover" />}
                </ScrollView>
                <Pressable onPress={handleFlip} style={styles.tapHint}>
                  <View style={[styles.tapHintPill, { backgroundColor: colors.surface }]}>
                    <Ionicons name="swap-horizontal" size={14} color={colors.textSecondary} />
                    <Text style={[styles.tapHintText, { color: colors.textSecondary }]}>Tap to reveal</Text>
                  </View>
                </Pressable>
              </Animated.View>

              <Animated.View style={[styles.cardFace, styles.cardBack, backAnimatedStyle, { backfaceVisibility: 'hidden', backgroundColor: colors.card }]}>
                <ScrollView 
                  style={styles.cardScrollView} 
                  contentContainerStyle={styles.cardScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  <Text style={[styles.backText, { color: colors.text }]}>{currentCard.back}</Text>
                </ScrollView>
                <Pressable onPress={handleFlip} style={styles.tapHint}>
                  <View style={[styles.tapHintPill, { backgroundColor: colors.surface }]}>
                    <Ionicons name="swap-horizontal" size={14} color={colors.textSecondary} />
                    <Text style={[styles.tapHintText, { color: colors.textSecondary }]}>Tap to flip back</Text>
                  </View>
                </Pressable>
              </Animated.View>
            </View>
          </View>
          
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
        
        {/* Action Menu Modal */}
        <Modal
          visible={showMenu}
          transparent
          animationType="fade"
          onRequestClose={() => setShowMenu(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowMenu(false)}>
            <View style={[styles.menuContainer, { backgroundColor: colors.card }]}>
              <Pressable 
                style={[styles.menuItem, { borderBottomColor: colors.border }]} 
                onPress={handleOpenEdit}
              >
                <Ionicons name="create-outline" size={22} color={colors.text} />
                <Text style={[styles.menuItemText, { color: colors.text }]}>Edit Card</Text>
              </Pressable>
              <Pressable 
                style={[styles.menuItem, { borderBottomWidth: 0 }]} 
                onPress={handleOpenDelete}
              >
                <Ionicons name="trash-outline" size={22} color={colors.error} />
                <Text style={[styles.menuItemText, { color: colors.error }]}>Delete Card</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
        
        {/* Edit Card Modal */}
        <Modal
          visible={showEditModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowEditModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.editModalContainer, { backgroundColor: colors.card }]}>
              <Text style={[styles.editModalTitle, { color: colors.text }]}>Edit Card</Text>
              
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Front</Text>
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: colors.surface, 
                  color: colors.text,
                  borderColor: colors.border 
                }]}
                value={editFront}
                onChangeText={setEditFront}
                placeholder="Front of card"
                placeholderTextColor={colors.textSecondary}
                multiline
              />
              
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Back</Text>
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: colors.surface, 
                  color: colors.text,
                  borderColor: colors.border 
                }]}
                value={editBack}
                onChangeText={setEditBack}
                placeholder="Back of card"
                placeholderTextColor={colors.textSecondary}
                multiline
              />
              
              <View style={styles.editModalButtons}>
                <Pressable 
                  style={[styles.editModalButton, styles.cancelButton, { borderColor: colors.border }]}
                  onPress={() => setShowEditModal(false)}
                >
                  <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
                </Pressable>
                <Pressable 
                  style={[styles.editModalButton, styles.saveButton, { backgroundColor: colors.primary }]}
                  onPress={handleSaveEdit}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
        
        {/* Delete Confirmation Modal */}
        <Modal
          visible={showDeleteConfirm}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDeleteConfirm(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowDeleteConfirm(false)}>
            <View style={[styles.deleteConfirmContainer, { backgroundColor: colors.card }]}>
              <Ionicons name="warning" size={48} color={colors.error} style={styles.deleteIcon} />
              <Text style={[styles.deleteTitle, { color: colors.text }]}>Delete Card?</Text>
              <Text style={[styles.deleteMessage, { color: colors.textSecondary }]}>
                This card will be permanently deleted.
              </Text>
              
              <View style={styles.deleteButtons}>
                <Pressable 
                  style={[styles.deleteButton, styles.deleteCancelButton, { borderColor: colors.border }]}
                  onPress={() => setShowDeleteConfirm(false)}
                >
                  <Text style={[styles.deleteCancelText, { color: colors.text }]}>Cancel</Text>
                </Pressable>
                <Pressable 
                  style={[styles.deleteButton, styles.deleteConfirmButton, { backgroundColor: colors.error }]}
                  onPress={handleConfirmDelete}
                >
                  <Text style={styles.deleteConfirmText}>Delete</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Modal>
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
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  closeButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    alignItems: "center", 
    justifyContent: "center",
    flexShrink: 0,
  },
  undoButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.7 },
  progressContainer: { 
    flex: 1, 
    marginHorizontal: 8,
    minWidth: 0, // Allow shrinking below content size
    maxWidth: SCREEN_WIDTH - 180, // Account for header buttons and padding
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
  cardScrollView: { flex: 1, width: '100%' },
  cardScrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 40 },
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
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  
  // Menu styles
  menuContainer: {
    width: SCREEN_WIDTH - 64,
    borderRadius: 16,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: "500",
  },
  
  // Edit modal styles
  editModalContainer: {
    width: SCREEN_WIDTH - 48,
    borderRadius: 20,
    padding: 24,
  },
  editModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  editModalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  editModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {},
  saveButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  
  // Delete confirmation styles
  deleteConfirmContainer: {
    width: SCREEN_WIDTH - 64,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  deleteIcon: {
    marginBottom: 16,
  },
  deleteTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  deleteMessage: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 24,
  },
  deleteButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  deleteCancelButton: {
    borderWidth: 1,
  },
  deleteCancelText: {
    fontSize: 16,
    fontWeight: "600",
  },
  deleteConfirmButton: {},
  deleteConfirmText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
