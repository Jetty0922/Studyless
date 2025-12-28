import React, { useRef, useState, useEffect } from "react";
import { View, Text, Pressable, Dimensions, Animated, NativeSyntheticEvent, NativeScrollEvent, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { OnboardingStackParamList } from "../navigation/RootNavigator";
import { Button, Card } from "../components/ui";
import { useTheme } from "../utils/useTheme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type HowItWorksScreenProps = {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, "HowItWorks">;
};

interface StepCard {
  icon: keyof typeof Ionicons.glyphMap;
  step: number;
  title: string;
  description: string;
}

const steps: StepCard[] = [
  {
    icon: "camera-outline",
    step: 1,
    title: "Scan Your Notes",
    description: "Take a photo of your notes, textbook, or slides. Our AI creates flashcards instantly.",
  },
  {
    icon: "calendar-outline",
    step: 2,
    title: "Set Your Deadline",
    description: "Tell us when your exam is. We'll create a personalized study schedule.",
  },
  {
    icon: "notifications-outline",
    step: 3,
    title: "Review Daily",
    description: "Spend just 10 minutes a day. Our algorithm shows you cards at the perfect time.",
  },
];

export default function HowItWorksScreen({ navigation }: HowItWorksScreenProps) {
  const { colors, isDark } = useTheme();
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleNext = () => {
    if (currentIndex < steps.length - 1) {
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>How It Works</Text>
          <Pressable onPress={handleSkip} style={styles.skipButton}>
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip</Text>
          </Pressable>
        </Animated.View>

        {/* Progress Dots */}
        <Animated.View style={[styles.progressContainer, { opacity: fadeAnim }]}>
          <View style={styles.dotsRow}>
            {steps.map((_, index) => {
              const isActive = index === currentIndex;
              return (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: isActive ? colors.primary : colors.border,
                      width: isActive ? 24 : 8,
                    },
                  ]}
                />
              );
            })}
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
            {steps.map((step, index) => (
              <StepItem key={index} step={step} colors={colors} />
            ))}
          </Animated.ScrollView>
        </View>

        {/* Bottom Section */}
        <Animated.View style={[styles.bottomSection, { opacity: fadeAnim }]}>
          <Button
            title={currentIndex === steps.length - 1 ? "Create Account" : "Continue"}
            onPress={handleNext}
            size="large"
          />
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

interface StepItemProps {
  step: StepCard;
  colors: any;
}

function StepItem({ step, colors }: StepItemProps) {
  return (
    <View style={styles.stepWrapper}>
      <View style={styles.stepContent}>
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name={step.icon} size={48} color={colors.primary} />
        </View>

        {/* Step Number */}
        <Text style={[styles.stepNumber, { color: colors.textSecondary }]}>
          Step {step.step}
        </Text>

        {/* Title */}
        <Text style={[styles.stepTitle, { color: colors.text }]}>
          {step.title}
        </Text>

        {/* Description */}
        <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
          {step.description}
        </Text>
      </View>
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
    paddingHorizontal: 16,
    paddingTop: 8,
    height: 56,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  skipButton: {
    padding: 8,
    marginRight: -8,
  },
  skipText: {
    fontSize: 15,
    fontWeight: "500",
  },
  progressContainer: {
    paddingHorizontal: 24,
    marginTop: 16,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  carouselContainer: {
    flex: 1,
    justifyContent: "center",
  },
  stepWrapper: {
    width: SCREEN_WIDTH,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  stepContent: {
    alignItems: "center",
    width: "100%",
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  stepDescription: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
});
