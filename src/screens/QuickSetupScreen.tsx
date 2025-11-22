import React, { useState } from "react";
import { View, Text, Pressable, TextInput, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../utils/useTheme";

type QuickSetupScreenProps = {
  navigation: any;
};

export default function QuickSetupScreen({ navigation }: QuickSetupScreenProps) {
  const { colors } = useTheme();
  const [name, setName] = useState("");
  const [school, setSchool] = useState("");

  const handleContinue = () => {
    // Save user data to store (will add later)
    navigation.navigate("NotificationsSetup");
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
          <View className="flex-1 justify-center py-8">
            {/* Title */}
            <Text className="text-4xl font-bold text-center mb-2" style={{ color: colors.text }}>
              {"Welcome! 👋"}
            </Text>

            {/* Name Input */}
            <View className="mt-8 mb-4">
              <Text className="text-base font-semibold mb-2" style={{ color: colors.text }}>
                {"What's your name?"}
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor={colors.textSecondary}
                className="rounded-xl px-4 py-4 text-base"
                style={{ backgroundColor: colors.surface, color: colors.text }}
              />
            </View>

            {/* School Input */}
            <View className="mb-8">
              <Text className="text-base font-semibold mb-2" style={{ color: colors.text }}>
                What school do you go to? (optional)
              </Text>
              <TextInput
                value={school}
                onChangeText={setSchool}
                placeholder="Enter your school or Skip"
                placeholderTextColor={colors.textSecondary}
                className="rounded-xl px-4 py-4 text-base"
                style={{ backgroundColor: colors.surface, color: colors.text }}
              />
            </View>

            {/* Continue Button */}
            <Pressable
              onPress={handleContinue}
              className="bg-blue-600 rounded-2xl py-5"
            >
              <Text className="text-white text-xl font-bold text-center">
                Continue
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
