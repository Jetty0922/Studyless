import React from "react";
import { View, Text, Pressable, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../utils/useTheme";

type ValuePropScreenProps = {
  navigation: any;
};

export default function ValuePropScreen({ navigation }: ValuePropScreenProps) {
  const { colors } = useTheme();

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <View className="flex-1 justify-center items-center px-8">
        {/* Brain Icon/Image */}
        <View className="w-48 h-48 rounded-full items-center justify-center mb-12" style={{ backgroundColor: colors.primaryLight }}>
          <Text className="text-7xl">🧠</Text>
          <View className="absolute bottom-8 right-8 bg-red-100 rounded-full w-12 h-12 items-center justify-center">
            <Text className="text-2xl">⚠️</Text>
          </View>
        </View>

        {/* Value Proposition */}
        <Text className="text-5xl font-bold text-center mb-4" style={{ color: colors.text }}>
          You forget 50% in 24 hours
        </Text>

        <Text className="text-2xl font-semibold text-center mb-2" style={{ color: colors.primary }}>
          Studyless makes you remember everything with 10 min/day
        </Text>

        <Text className="text-lg text-center mb-12" style={{ color: colors.textSecondary }}>
          No cramming. No stress.
        </Text>

        {/* Get Started Button */}
        <Pressable
          onPress={() => navigation.navigate("HowItWorks")}
          className="bg-blue-600 rounded-2xl py-5 px-12 w-full mb-4"
        >
          <Text className="text-white text-xl font-bold text-center">
            Get Started
          </Text>
        </Pressable>

        {/* Sign In Link */}
        <View className="flex-row items-center">
          <Text className="text-base" style={{ color: colors.textSecondary }}>Already have an account? </Text>
          <Pressable onPress={() => navigation.navigate("SignIn")}>
            <Text className="text-base font-semibold" style={{ color: colors.primary }}>Sign In</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
