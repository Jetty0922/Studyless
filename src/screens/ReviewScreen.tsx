import React, { useState, useEffect } from "react";
import { View, Text, Pressable, Image, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { useFlashcardStore } from "../state/flashcardStore";
import { RootStackParamList } from "../navigation/RootNavigator";
import { ReviewRating, Flashcard } from "../types/flashcard";
import { useThemeStore, getThemedColors } from "../state/themeStore";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ReviewRouteProp = RouteProp<RootStackParamList, "Review">;

export default function ReviewScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ReviewRouteProp>();
  const cardIds = route.params?.cards || [];

  const flashcards = useFlashcardStore((s) => s.flashcards);
  const reviewFlashcard = useFlashcardStore((s) => s.reviewFlashcard);

  const theme = useThemeStore((s) => s.theme);
  const colors = getThemedColors(theme);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [sessionCards, setSessionCards] = useState<Flashcard[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  const rotation = useSharedValue(0);

  const frontAnimatedStyle = useAnimatedStyle(() => {
    const rotateValue = interpolate(rotation.value, [0, 1], [0, 180]);
    return {
      transform: [{ rotateY: `${rotateValue}deg` }],
      backfaceVisibility: "hidden" as any,
    };
  });

  const backAnimatedStyle = useAnimatedStyle(() => {
    const rotateValue = interpolate(rotation.value, [0, 1], [180, 360]);
    return {
      transform: [{ rotateY: `${rotateValue}deg` }],
      backfaceVisibility: "hidden" as any,
    };
  });

  // Initialize session cards
  useEffect(() => {
    const initialCards = cardIds
      .map((id) => flashcards.find((c) => c.id === id))
      .filter((c): c is Flashcard => c !== undefined);
    setSessionCards(initialCards);
    setIsInitialized(true);
  }, [cardIds, flashcards]);

  useEffect(() => {
    rotation.value = 0;
  }, [currentIndex, rotation]);

  const handleFlip = () => {
    rotation.value = withTiming(showAnswer ? 0 : 1, { duration: 300 });
    setShowAnswer(!showAnswer);
  };

  const handleRating = (rating: ReviewRating) => {
    const currentCard = sessionCards[currentIndex];
    if (!currentCard) return;

    if (rating === "again") {
      // Re-queue the card at the end of the session
      reviewFlashcard(currentCard.id, rating);
      const updatedCards = [...sessionCards];
      const cardToRequeue = updatedCards.splice(currentIndex, 1)[0];
      updatedCards.push(cardToRequeue);
      setSessionCards(updatedCards);
      setShowAnswer(false);
      rotation.value = 0;
    } else {
      // Process the rating and move to next card
      reviewFlashcard(currentCard.id, rating);
      setReviewedCount(reviewedCount + 1);

      if (currentIndex < sessionCards.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setShowAnswer(false);
        rotation.value = 0;
      } else {
        navigation.goBack();
      }
    }
  };

  const handleClose = () => {
    navigation.goBack();
  };

  // Show loading state while initializing
  if (!isInitialized) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (sessionCards.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No cards to review</Text>
      </SafeAreaView>
    );
  }

  const currentCard = sessionCards[currentIndex];
  if (!currentCard) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Card not found</Text>
      </SafeAreaView>
    );
  }

  const progress = ((currentIndex + 1) / sessionCards.length) * 100;

  return (
    <SafeAreaView style={[styles.mainContainer, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={handleClose} style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: colors.primary }]} />
            </View>
            <Text style={[styles.progressText, { color: colors.text }]}>
              {currentIndex + 1} of {sessionCards.length}
            </Text>
          </View>
          <View style={styles.spacer} />
        </View>

        <View style={styles.cardContainer}>
          <Pressable onPress={handleFlip} style={[styles.card, { backgroundColor: colors.surface }]}>
            <Animated.View style={[styles.cardFace, styles.cardFront, frontAnimatedStyle]}>
              <Text style={[styles.frontText, { color: colors.text }]}>{currentCard.front}</Text>
              {currentCard.imageUri && (
                <Image source={{ uri: currentCard.imageUri }} style={styles.cardImage} resizeMode="cover" />
              )}
              <View style={styles.tapHint}>
                <Text style={[styles.tapHintText, { color: colors.textSecondary }]}>Tap to reveal</Text>
              </View>
            </Animated.View>

            <Animated.View style={[styles.cardFace, styles.cardBack, { backgroundColor: colors.surface }, backAnimatedStyle]}>
              <Text style={[styles.backText, { color: colors.text }]}>{currentCard.back}</Text>
            </Animated.View>
          </Pressable>
        </View>

        {showAnswer && (
          <View style={styles.ratingContainer}>
            <Text style={[styles.ratingTitle, { color: colors.text }]}>How well did you know this?</Text>
            <View style={styles.ratingButtonsGrid}>
              <View style={[styles.buttonBox, { backgroundColor: "#ef4444" }]}>
                <Pressable onPress={() => handleRating("again")} style={({ pressed }) => [styles.gridButton, pressed && styles.pressed]}>
                  <Text style={styles.gridButtonText}>Again</Text>
                  <Text style={styles.gridButtonSubtext}>10m</Text>
                </Pressable>
              </View>

              <View style={[styles.buttonBox, { backgroundColor: "#f97316" }]}>
                <Pressable onPress={() => handleRating("hard")} style={({ pressed }) => [styles.gridButton, pressed && styles.pressed]}>
                  <Text style={styles.gridButtonText}>Hard</Text>
                  <Text style={styles.gridButtonSubtext}>1d</Text>
                </Pressable>
              </View>

              <View style={[styles.buttonBox, { backgroundColor: "#22c55e" }]}>
                <Pressable onPress={() => handleRating("good")} style={({ pressed }) => [styles.gridButton, pressed && styles.pressed]}>
                  <Text style={styles.gridButtonText}>Good</Text>
                  <Text style={styles.gridButtonSubtext}>3d</Text>
                </Pressable>
              </View>

              <View style={[styles.buttonBox, { backgroundColor: "#3b82f6" }]}>
                <Pressable onPress={() => handleRating("easy")} style={({ pressed }) => [styles.gridButton, pressed && styles.pressed]}>
                  <Text style={styles.gridButtonText}>Easy</Text>
                  <Text style={styles.gridButtonSubtext}>1w</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 20,
  },
  mainContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  closeButton: {
    padding: 4,
  },
  pressed: {
    opacity: 0.7,
  },
  progressContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  progressBar: {
    height: 5,
    borderRadius: 9999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 9999,
  },
  progressText: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 4,
  },
  spacer: {
    width: 32,
  },
  cardContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "center",
    paddingBottom: 60,
  },
  card: {
    borderRadius: 24,
    minHeight: 320,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardFace: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  cardFront: {
    backgroundColor: "transparent",
  },
  cardBack: {
    borderRadius: 24,
  },
  frontText: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  backText: {
    fontSize: 19,
    fontWeight: "600",
    textAlign: "center",
  },
  cardImage: {
    width: "100%",
    height: 192,
    borderRadius: 16,
    marginTop: 24,
  },
  tapHint: {
    position: "absolute",
    bottom: 24,
  },
  tapHintText: {
    fontSize: 12,
    textAlign: "center",
  },
  ratingContainer: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    paddingTop: 16,
  },
  ratingTitle: {
    textAlign: "center",
    fontWeight: "600",
    fontSize: 15,
    marginBottom: 18,
  },
  ratingButtonsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    justifyContent: "center",
  },
  buttonBox: {
    width: "48%",
    borderRadius: 18,
    overflow: "hidden",
  },
  gridButton: {
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 120,
  },
  gridButtonText: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 10,
    textAlign: "center",
  },
  gridButtonSubtext: {
    color: "rgba(255, 255, 255, 0.95)",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
