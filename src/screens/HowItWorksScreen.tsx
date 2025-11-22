import React, { useRef, useState } from "react";
import { View, Text, Pressable, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
import { useTheme } from "../utils/useTheme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type HowItWorksScreenProps = {
  navigation: any;
};

interface CarouselCard {
  emoji: string;
  title: string;
  description: string;
}

const cards: CarouselCard[] = [
  {
    emoji: "📸",
    title: "Create cards after class",
    description: "Take a photo. AI does the rest.",
  },
  {
    emoji: "📅",
    title: "Set your test date",
    description: "We build a custom study schedule.",
  },
  {
    emoji: "⏰",
    title: "Review 10 min daily",
    description: "We remind you. You remember everything.",
  },
];

export default function HowItWorksScreen({ navigation }: HowItWorksScreenProps) {
  const { colors } = useTheme();
  const scrollX = useSharedValue(0);
  const scrollViewRef = useRef<Animated.ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

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

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      {/* Skip Button */}
      <View className="absolute top-4 right-6 z-10">
        <Pressable onPress={handleSkip} className="py-2 px-4">
          <Text className="text-base font-medium" style={{ color: colors.textSecondary }}>Skip</Text>
        </Pressable>
      </View>

      {/* Carousel */}
      <View className="flex-1 justify-center">
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
          {cards.map((card, index) => (
            <CardItem key={index} card={card} index={index} scrollX={scrollX} />
          ))}
        </Animated.ScrollView>
      </View>

      {/* Pagination Dots */}
      <View className="flex-row justify-center items-center mb-6">
        {cards.map((_, index) => (
          <View
            key={index}
            className={`h-2 rounded-full mx-1 ${
              index === currentIndex ? "w-6 bg-blue-600" : "w-2"
            }`}
            style={index !== currentIndex ? { backgroundColor: colors.border } : undefined}
          />
        ))}
      </View>

      {/* Next Button */}
      <View className="px-6 mb-8">
        <Pressable
          onPress={handleNext}
          className="bg-blue-600 rounded-2xl py-5 items-center"
        >
          <Text className="text-white text-xl font-bold">
            {currentIndex === cards.length - 1 ? "Next" : "Next"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

interface CardItemProps {
  card: CarouselCard;
  index: number;
  scrollX: Animated.SharedValue<number>;
}

function CardItem({ card, index, scrollX }: CardItemProps) {
  const { colors } = useTheme();

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
      [0.5, 1, 0.5],
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
        {/* Emoji */}
        <Text className="text-8xl mb-8">{card.emoji}</Text>

        {/* Title */}
        <Text className="text-3xl font-bold text-center mb-4" style={{ color: colors.text }}>
          {card.title}
        </Text>

        {/* Description */}
        <Text className="text-xl text-center px-4" style={{ color: colors.textSecondary }}>
          {card.description}
        </Text>
      </Animated.View>
    </View>
  );
}
