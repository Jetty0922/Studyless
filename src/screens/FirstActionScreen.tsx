import React from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFlashcardStore } from "../state/flashcardStore";
import { useTheme } from "../utils/useTheme";

type FirstActionScreenProps = {
  navigation: any;
};

export default function FirstActionScreen({ navigation }: FirstActionScreenProps) {
  const { colors } = useTheme();
  const completeOnboarding = useFlashcardStore((s) => s.completeOnboarding);

  const handleScanNow = () => {
    // Navigate to camera screen
    navigation.navigate("CameraScreen");
  };

  const handleDoLater = () => {
    // Complete onboarding and go to main app
    completeOnboarding();
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <View className="flex-1 justify-center items-center px-6">
        {/* Icon */}
        <View className="w-32 h-32 rounded-full bg-green-50 items-center justify-center mb-8">
          <Text className="text-7xl">🎯</Text>
        </View>

        {/* Title */}
        <Text className="text-4xl font-bold text-center mb-4" style={{ color: colors.text }}>
          Ready to create your first cards?
        </Text>

        {/* Description */}
        <Text className="text-lg text-center mb-12 px-4" style={{ color: colors.textSecondary }}>
          Do you have class notes from today?
        </Text>

        {/* Yes Button */}
        <Pressable
          onPress={handleScanNow}
          className="bg-blue-600 rounded-2xl py-5 w-full mb-4"
        >
          <Text className="text-white text-xl font-bold text-center">
            Yes - Scan them now
          </Text>
        </Pressable>

        {/* No Link */}
        <Pressable onPress={handleDoLater}>
          <Text className="text-base font-medium" style={{ color: colors.textSecondary }}>
            {"No - I'll do it later"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
