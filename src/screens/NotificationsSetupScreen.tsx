import React from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../utils/useTheme";

type NotificationsSetupScreenProps = {
  navigation: any;
};

export default function NotificationsSetupScreen({ navigation }: NotificationsSetupScreenProps) {
  const { colors } = useTheme();

  const handleEnableNotifications = async () => {
    // Request notification permissions
    // For now, just navigate to next screen
    navigation.navigate("FirstAction");
  };

  const handleSkip = () => {
    navigation.navigate("FirstAction");
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <View className="flex-1 justify-center items-center px-6">
        {/* Bell Icon */}
        <View className="w-32 h-32 rounded-full items-center justify-center mb-8" style={{ backgroundColor: colors.primaryLight }}>
          <Text className="text-7xl">🔔</Text>
        </View>

        {/* Title */}
        <Text className="text-4xl font-bold text-center mb-4" style={{ color: colors.text }}>
          Get daily reminders
        </Text>

        {/* Description */}
        <Text className="text-lg text-center mb-12 px-4" style={{ color: colors.textSecondary }}>
          {"We'll remind you when cards are due so you never fall behind."}
        </Text>

        {/* Enable Button */}
        <Pressable
          onPress={handleEnableNotifications}
          className="bg-blue-600 rounded-2xl py-5 w-full mb-4"
        >
          <Text className="text-white text-xl font-bold text-center">
            Enable Notifications
          </Text>
        </Pressable>

        {/* Skip Link */}
        <Pressable onPress={handleSkip}>
          <Text className="text-base font-medium" style={{ color: colors.textSecondary }}>Skip for now</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
