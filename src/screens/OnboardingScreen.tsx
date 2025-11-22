import React, { useRef, useState } from "react";
import { View, Text, Pressable, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
import { useFlashcardStore } from "../state/flashcardStore";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface OnboardingSlide {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  color: string;
}

const slides: OnboardingSlide[] = [
  {
    icon: "book",
    title: "Welcome to Flashcard Study",
    description: "Master any subject with intelligent spaced repetition designed for students like you.",
    color: "#3b82f6",
  },
  {
    icon: "calendar",
    title: "Organize by Test Dates",
    description: "Add your upcoming tests and let our smart algorithm schedule reviews to prevent cramming.",
    color: "#8b5cf6",
  },
  {
    icon: "layers",
    title: "Hierarchical Learning",
    description: "Organize content into Subjects → Chapters → Sections → Flashcards for effortless navigation.",
    color: "#ec4899",
  },
  {
    icon: "stats-chart",
    title: "Track Your Progress",
    description: "Monitor your mastery with detailed stats, streaks, and readiness percentages for each test.",
    color: "#10b981",
  },
  {
    icon: "sparkles",
    title: "AI-Powered Creation",
    description: "Generate flashcards from photos, PDFs, or handwritten notes using AI.",
    color: "#f59e0b",
  },
];

export default function OnboardingScreen() {
  const scrollX = useSharedValue(0);
  const scrollViewRef = useRef<Animated.ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const completeOnboarding = useFlashcardStore((s) => s.completeOnboarding);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      scrollViewRef.current?.scrollTo({
        x: nextIndex * SCREEN_WIDTH,
        animated: true,
      });
      setCurrentIndex(nextIndex);
    } else {
      completeOnboarding();
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Skip Button */}
      {currentIndex < slides.length - 1 && (
        <View className="absolute top-4 right-6 z-10">
          <Pressable onPress={handleSkip} className="py-2 px-4">
            <Text className="text-base text-gray-600 font-medium">Skip</Text>
          </Pressable>
        </View>
      )}

      {/* Slides */}
      <Animated.ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setCurrentIndex(index);
        }}
      >
        {slides.map((slide, index) => (
          <SlideItem key={index} slide={slide} index={index} scrollX={scrollX} />
        ))}
      </Animated.ScrollView>

      {/* Pagination Dots */}
      <View className="flex-row justify-center items-center mb-8">
        {slides.map((_, index) => (
          <PaginationDot key={index} index={index} scrollX={scrollX} />
        ))}
      </View>

      {/* Next/Get Started Button */}
      <View className="px-6 mb-8">
        <Pressable
          onPress={handleNext}
          className="bg-blue-500 rounded-2xl py-4 items-center"
        >
          <Text className="text-white text-lg font-bold">
            {currentIndex === slides.length - 1 ? "Get Started" : "Next"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

interface SlideItemProps {
  slide: OnboardingSlide;
  index: number;
  scrollX: Animated.SharedValue<number>;
}

function SlideItem({ slide, index, scrollX }: SlideItemProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * SCREEN_WIDTH,
      index * SCREEN_WIDTH,
      (index + 1) * SCREEN_WIDTH,
    ];

    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.8, 1, 0.8],
      Extrapolate.CLAMP
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.3, 1, 0.3],
      Extrapolate.CLAMP
    );

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <View
      style={{ width: SCREEN_WIDTH }}
      className="flex-1 justify-center items-center px-8"
    >
      <Animated.View style={animatedStyle} className="items-center">
        {/* Icon */}
        <View
          className="w-32 h-32 rounded-full items-center justify-center mb-8"
          style={{ backgroundColor: slide.color + "20" }}
        >
          <Ionicons name={slide.icon} size={64} color={slide.color} />
        </View>

        {/* Title */}
        <Text className="text-3xl font-bold text-gray-900 text-center mb-4">
          {slide.title}
        </Text>

        {/* Description */}
        <Text className="text-lg text-gray-600 text-center leading-7 px-4">
          {slide.description}
        </Text>
      </Animated.View>
    </View>
  );
}

interface PaginationDotProps {
  index: number;
  scrollX: Animated.SharedValue<number>;
}

function PaginationDot({ index, scrollX }: PaginationDotProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * SCREEN_WIDTH,
      index * SCREEN_WIDTH,
      (index + 1) * SCREEN_WIDTH,
    ];

    const width = interpolate(
      scrollX.value,
      inputRange,
      [8, 24, 8],
      Extrapolate.CLAMP
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.3, 1, 0.3],
      Extrapolate.CLAMP
    );

    return {
      width,
      opacity,
    };
  });

  return (
    <Animated.View
      style={animatedStyle}
      className="h-2 rounded-full bg-blue-500 mx-1"
    />
  );
}
