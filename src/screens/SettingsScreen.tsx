import React from "react";
import { View, Text, Pressable, ScrollView, Alert, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFlashcardStore } from "../state/flashcardStore";
import { useThemeStore, getThemedColors } from "../state/themeStore";

export default function SettingsScreen() {
  const stats = useFlashcardStore((s) => s.stats);
  const completeOnboarding = useFlashcardStore((s) => s.completeOnboarding);
  const hasCompletedOnboarding = useFlashcardStore((s) => s.hasCompletedOnboarding);

  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const colors = getThemedColors(theme);

  const handleNotificationSettings = () => {
    Alert.alert(
      "Notifications",
      "Notification settings will be available in a future update"
    );
  };

  const handleAccountSettings = () => {
    Alert.alert(
      "Account",
      "Account settings will be available in a future update"
    );
  };

  const handleExportData = () => {
    Alert.alert(
      "Export Data",
      "Data export will be available in a future update"
    );
  };

  const handleAbout = () => {
    Alert.alert(
      "About",
      "Flashcard Study App v1.0\nBuilt with React Native and Expo"
    );
  };

  const handleResetOnboarding = () => {
    Alert.alert(
      "Reset Onboarding",
      "This will log you out and show the onboarding screens again. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            useFlashcardStore.setState({ hasCompletedOnboarding: false });
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }} edges={["top"]}>
      <View className="flex-1">
        <View className="px-6 pt-6 pb-4 border-b" style={{ backgroundColor: colors.surface, borderBottomColor: colors.border }}>
          <Text className="text-3xl font-bold" style={{ color: colors.text }}>Settings</Text>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-6 py-6">
            {/* Appearance Settings */}
            <View className="rounded-3xl p-4 mb-4" style={{ backgroundColor: colors.surface }}>
              <Text className="text-xl font-bold px-2 mb-3" style={{ color: colors.text }}>
                Appearance
              </Text>

              <View className="flex-row items-center justify-between py-4 px-2">
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: colors.primaryLight }}>
                    <Ionicons name={theme === "dark" ? "moon" : "sunny"} size={20} color={colors.primary} />
                  </View>
                  <View className="flex-1">
                    <Text className="font-medium" style={{ color: colors.text }}>
                      Dark Mode
                    </Text>
                    <Text className="text-sm" style={{ color: colors.textSecondary }}>
                      {theme === "dark" ? "Enabled" : "Disabled"}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={theme === "dark"}
                  onValueChange={toggleTheme}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>

            {/* General Settings */}
            <View className="rounded-3xl p-4 mb-4" style={{ backgroundColor: colors.surface }}>
              <Text className="text-xl font-bold px-2 mb-3" style={{ color: colors.text }}>
                General
              </Text>

            <Pressable
              onPress={handleNotificationSettings}
              className="flex-row items-center justify-between py-4 px-2 active:opacity-70"
            >
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: colors.orangeLight }}>
                  <Ionicons name="notifications" size={20} color={colors.orange} />
                </View>
                <View className="flex-1">
                  <Text className="font-medium" style={{ color: colors.text }}>
                    Notifications
                  </Text>
                  <Text className="text-sm" style={{ color: colors.textSecondary }}>
                    Manage study reminders
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </Pressable>

            <View className="h-px mx-2" style={{ backgroundColor: colors.border }} />

            <Pressable
              onPress={handleAccountSettings}
              className="flex-row items-center justify-between py-4 px-2 active:opacity-70"
            >
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: colors.blueLight }}>
                  <Ionicons name="person-circle" size={20} color={colors.blue} />
                </View>
                <View className="flex-1">
                  <Text className="font-medium" style={{ color: colors.text }}>Account</Text>
                  <Text className="text-sm" style={{ color: colors.textSecondary }}>
                    Profile and preferences
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Data & Privacy */}
          <View className="rounded-3xl p-4 mb-4" style={{ backgroundColor: colors.surface }}>
            <Text className="text-xl font-bold px-2 mb-3" style={{ color: colors.text }}>
              Data & Privacy
            </Text>

            <Pressable
              onPress={handleExportData}
              className="flex-row items-center justify-between py-4 px-2 active:opacity-70"
            >
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: colors.purpleLight }}>
                  <Ionicons name="download" size={20} color={colors.purple} />
                </View>
                <View className="flex-1">
                  <Text className="font-medium" style={{ color: colors.text }}>
                    Export Data
                  </Text>
                  <Text className="text-sm" style={{ color: colors.textSecondary }}>
                    Download your flashcards
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </Pressable>

            <View className="h-px mx-2" style={{ backgroundColor: colors.border }} />

            <View className="py-4 px-2">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: colors.border }}>
                  <Ionicons name="shield-checkmark" size={20} color={colors.textSecondary} />
                </View>
                <View className="flex-1">
                  <Text className="font-medium" style={{ color: colors.text }}>
                    Local Storage
                  </Text>
                  <Text className="text-sm" style={{ color: colors.textSecondary }}>
                    All data stored on device
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* About */}
          <View className="rounded-3xl p-4 mb-4" style={{ backgroundColor: colors.surface }}>
            <Text className="text-xl font-bold px-2 mb-3" style={{ color: colors.text }}>
              About
            </Text>

            <Pressable
              onPress={handleAbout}
              className="flex-row items-center justify-between py-4 px-2 active:opacity-70"
            >
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: colors.blueLight }}>
                  <Ionicons name="information-circle" size={20} color={colors.blue} />
                </View>
                <View className="flex-1">
                  <Text className="font-medium" style={{ color: colors.text }}>
                    About App
                  </Text>
                  <Text className="text-sm" style={{ color: colors.textSecondary }}>Version 1.0</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </Pressable>

            <View className="h-px mx-2" style={{ backgroundColor: colors.border }} />

            <Pressable className="py-4 px-2 active:opacity-70">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: colors.greenLight }}>
                  <Ionicons name="help-circle" size={20} color={colors.green} />
                </View>
                <Text className="font-medium" style={{ color: colors.text }}>Help & Support</Text>
              </View>
            </Pressable>
          </View>

          {/* Debug Section */}
          <View className="rounded-3xl p-4 mb-4" style={{ backgroundColor: colors.surface }}>
            <Text className="text-xl font-bold px-2 mb-3" style={{ color: colors.text }}>
              Debug
            </Text>

            <Pressable
              onPress={handleResetOnboarding}
              className="flex-row items-center justify-between py-4 px-2 active:opacity-70"
            >
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: colors.errorLight }}>
                  <Ionicons name="refresh" size={20} color={colors.error} />
                </View>
                <View className="flex-1">
                  <Text className="font-medium" style={{ color: colors.text }}>
                    Reset Onboarding
                  </Text>
                  <Text className="text-sm" style={{ color: colors.textSecondary }}>
                    Show welcome screens again
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

            <View className="h-8" />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
