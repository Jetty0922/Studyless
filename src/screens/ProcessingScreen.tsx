import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../utils/useTheme";

type ProcessingScreenProps = {
  navigation: any;
  route: {
    params: {
      photoUri: string;
    };
  };
};

export default function ProcessingScreen({ navigation, route }: ProcessingScreenProps) {
  const { colors } = useTheme();
  const { photoUri } = route.params;
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate processing with progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          // Navigate to Cards Generated screen after processing
          setTimeout(() => {
            navigation.replace("CardsGenerated", {
              photoUri,
              cardCount: 47, // Mock card count
            });
          }, 500);
          return 100;
        }
        return prev + 10;
      });
    }, 300);

    return () => clearInterval(interval);
  }, [navigation, photoUri]);

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <View className="flex-1 justify-center items-center px-6">
        {/* Loading Animation */}
        <ActivityIndicator size="large" color="#3b82f6" />

        {/* Title */}
        <Text className="text-3xl font-bold text-center mt-8 mb-4" style={{ color: colors.text }}>
          Generating flashcards...
        </Text>

        {/* Description */}
        <Text className="text-base text-center mb-8" style={{ color: colors.textSecondary }}>
          Creating AI-powered cards from your notes. This takes about 30 seconds.
        </Text>

        {/* Progress Bar */}
        <View className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: colors.surface }}>
          <View
            className="h-full bg-blue-600 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </View>

        <Text className="text-sm mt-4" style={{ color: colors.textSecondary }}>{progress}%</Text>
      </View>
    </SafeAreaView>
  );
}
