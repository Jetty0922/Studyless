import React, { useRef, useState, useEffect } from "react";
import { View, Text, Pressable, Dimensions, Animated, NativeSyntheticEvent, NativeScrollEvent, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { OnboardingStackParamList } from "../navigation/RootNavigator";
import { CameraScanIllustration, CalendarIllustration, NotificationIllustration } from "../components/illustrations";
import { GradientButton } from "../components/ui";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type HowItWorksScreenProps = {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, "HowItWorks">;
};

interface CarouselCard {
  illustration: React.ReactNode;
  step: number;
  title: string;
  description: string;
  accentColor: string;
}

const cards: CarouselCard[] = [
  {
    illustration: <CameraScanIllustration size={160} animated />,
    step: 1,
    title: "Snap Your Notes",
    description: "Take a photo of your notes, textbook, or slides. Our AI instantly creates perfect flashcards.",
    accentColor: "#4facfe",
  },
  {
    illustration: <CalendarIllustration size={160} animated />,
    step: 2,
    title: "Set Your Test Date",
    description: "Tell us when your exam is. We’ll build a personalized study schedule that fits your timeline.",
    accentColor: "#a78bfa",
  },
  {
    illustration: <NotificationIllustration size={160} animated />,
    step: 3,
    title: "10 Minutes Daily",
    description: "Get smart reminders. Review a few cards each day and watch your knowledge stick forever.",
    accentColor: "#f093fb",
  },
];

export default function HowItWorksScreen({ navigation }: HowItWorksScreenProps) {
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      const nextIndex = currentIndex + 1;
      scrollViewRef.current?.scrollTo({
        x: nextIndex * SCREEN_WIDTH,
        animated: true,
      });
      setCurrentIndex(nextIndex);
    } else {
      navigation.navigate("CreateAccount");
    }
  };

  const handleSkip = () => {
    navigation.navigate("CreateAccount");
  };

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#0f172a", "#1e1b4b", "#312e81"]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />


      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <Text style={styles.headerTitle}>How It Works</Text>
          <Pressable onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </Animated.View>

        {/* Step Progress Indicator */}
        <Animated.View style={[styles.progressContainer, { opacity: fadeAnim }]}>
          <View style={styles.progressLine}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: scrollX.interpolate({
                    inputRange: [0, SCREEN_WIDTH, SCREEN_WIDTH * 2],
                    outputRange: ["0%", "50%", "100%"],
                    extrapolate: "clamp",
                  }),
                },
              ]}
            />
          </View>
          <View style={styles.stepsRow}>
            {cards.map((card, index) => (
              <StepIndicator
                key={index}
                step={index + 1}
                isActive={index <= currentIndex}
                accentColor={card.accentColor}
              />
            ))}
          </View>
        </Animated.View>

        {/* Carousel */}
        <View style={styles.carouselContainer}>
          <Animated.ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            onMomentumScrollEnd={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setCurrentIndex(index);
            }}
          >
            {cards.map((card, index) => (
              <CardItem key={index} card={card} index={index} scrollX={scrollX} />
            ))}
          </Animated.ScrollView>
        </View>

        {/* Bottom Section */}
        <Animated.View style={[styles.bottomSection, { opacity: fadeAnim }]}>
          <GradientButton
            title={currentIndex === cards.length - 1 ? "Create Account" : "Continue"}
            onPress={handleNext}
            size="large"
            style={styles.ctaButton}
          />
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

interface StepIndicatorProps {
  step: number;
  isActive: boolean;
  accentColor: string;
}

function StepIndicator({ step, isActive, accentColor }: StepIndicatorProps) {
  return (
    <View
      style={[
        styles.stepIndicator,
        isActive && { backgroundColor: accentColor, borderColor: accentColor },
      ]}
    >
      <Text style={[styles.stepNumber, isActive && styles.stepNumberActive]}>
        {step}
      </Text>
    </View>
  );
}

interface CardItemProps {
  card: CarouselCard;
  index: number;
  scrollX: Animated.Value;
}

function CardItem({ card, index, scrollX }: CardItemProps) {
  const inputRange = [
    (index - 1) * SCREEN_WIDTH,
    index * SCREEN_WIDTH,
    (index + 1) * SCREEN_WIDTH,
  ];

  const scale = scrollX.interpolate({
    inputRange,
    outputRange: [0.85, 1, 0.85],
    extrapolate: "clamp",
  });

  const opacity = scrollX.interpolate({
    inputRange,
    outputRange: [0.4, 1, 0.4],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.cardWrapper}>
      <Animated.View style={[styles.cardContainer, { transform: [{ scale }], opacity }]}>
        <View style={styles.glassCard}>
          {/* Glassmorphism effect */}
          <View style={styles.glassBackground}>
            <LinearGradient
              colors={["rgba(255,255,255,0.1)", "rgba(255,255,255,0.05)"]}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          </View>

          {/* Illustration */}
          <View style={styles.illustrationWrapper}>
            {card.illustration}
          </View>

          {/* Content */}
          <Text style={[styles.cardTitle, { color: card.accentColor }]}>
            {card.title}
          </Text>
          <Text style={styles.cardDescription}>{card.description}</Text>
        </View>
      </Animated.View>
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#94a3b8",
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  skipText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#64748b",
  },
  progressContainer: {
    paddingHorizontal: 40,
    marginTop: 20,
  },
  progressLine: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 2,
    marginBottom: 12,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#667eea",
    borderRadius: 2,
  },
  stepsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stepIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748b",
  },
  stepNumberActive: {
    color: "#ffffff",
  },
  carouselContainer: {
    flex: 1,
    justifyContent: "center",
  },
  cardWrapper: {
    width: SCREEN_WIDTH,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  cardContainer: {
    width: "100%",
  },
  glassCard: {
    borderRadius: 28,
    padding: 32,
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  glassBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(30, 41, 59, 0.8)",
  },
  illustrationWrapper: {
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  cardDescription: {
    fontSize: 16,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  ctaButton: {
    width: "100%",
  },
});
