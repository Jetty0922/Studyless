import React from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFlashcardStore } from "../state/flashcardStore";

export default function StatsScreen() {
  const stats = useFlashcardStore((s) => s.stats);
  const flashcards = useFlashcardStore((s) => s.flashcards);

  const totalCards = flashcards.length;
  const masteredCards = flashcards.filter((card) => card.currentStep >= 3).length;
  const progressPercentage = totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0;

  const dailyProgress = stats.dailyGoal > 0
    ? Math.min(100, Math.round((stats.cardsReviewedToday / stats.dailyGoal) * 100))
    : 0;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <View className="flex-1">
        <View className="px-5 py-4 border-b border-gray-200">
          <Text className="text-3xl font-bold text-gray-900">Statistics</Text>
        </View>

        <ScrollView className="flex-1 px-5 py-6">
          <View className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl p-6 mb-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-white/80 text-base font-medium">
                Current Streak
              </Text>
              <Ionicons name="flame" size={28} color="#fbbf24" />
            </View>
            <Text className="text-white text-5xl font-bold mb-2">
              {stats.currentStreak}
            </Text>
            <Text className="text-white/80 text-base">
              {stats.currentStreak === 1 ? "day" : "days"} in a row
            </Text>
            <View className="mt-4 pt-4 border-t border-white/20">
              <Text className="text-white/80 text-sm">
                Longest streak: {stats.longestStreak}{" "}
                {stats.longestStreak === 1 ? "day" : "days"}
              </Text>
            </View>
          </View>

          <View className="bg-white border border-gray-200 rounded-3xl p-6 mb-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-gray-700 text-base font-semibold">
                Daily Goal
              </Text>
              <View className="flex-row items-center">
                <Text className="text-blue-500 text-lg font-bold mr-2">
                  {stats.cardsReviewedToday}/{stats.dailyGoal}
                </Text>
                <Ionicons name="checkmark-circle" size={24} color={dailyProgress >= 100 ? "#10b981" : "#d1d5db"} />
              </View>
            </View>
            <View className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <View
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${dailyProgress}%` }}
              />
            </View>
            <Text className="text-gray-500 text-sm mt-2">
              {dailyProgress}% complete
            </Text>
          </View>

          <View className="flex-row gap-3 mb-6">
            <View className="flex-1 bg-white border border-gray-200 rounded-2xl p-5">
              <View className="w-12 h-12 bg-purple-100 rounded-full items-center justify-center mb-3">
                <Ionicons name="layers" size={24} color="#8b5cf6" />
              </View>
              <Text className="text-gray-500 text-sm mb-1">Total Cards</Text>
              <Text className="text-gray-900 text-2xl font-bold">
                {totalCards}
              </Text>
            </View>

            <View className="flex-1 bg-white border border-gray-200 rounded-2xl p-5">
              <View className="w-12 h-12 bg-green-100 rounded-full items-center justify-center mb-3">
                <Ionicons name="checkmark-done" size={24} color="#10b981" />
              </View>
              <Text className="text-gray-500 text-sm mb-1">Mastered</Text>
              <Text className="text-gray-900 text-2xl font-bold">
                {masteredCards}
              </Text>
            </View>
          </View>

          <View className="bg-white border border-gray-200 rounded-3xl p-6 mb-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-gray-700 text-base font-semibold">
                Overall Progress
              </Text>
              <Text className="text-blue-500 text-lg font-bold">
                {progressPercentage}%
              </Text>
            </View>
            <View className="h-3 bg-gray-200 rounded-full overflow-hidden mb-3">
              <View
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                style={{ width: `${progressPercentage}%` }}
              />
            </View>
            <Text className="text-gray-500 text-sm">
              {masteredCards} of {totalCards} cards mastered
            </Text>
          </View>

          <View className="bg-white border border-gray-200 rounded-3xl p-6 mb-6">
            <View className="flex-row items-center mb-4">
              <View className="w-12 h-12 bg-orange-100 rounded-full items-center justify-center mr-3">
                <Ionicons name="trophy" size={24} color="#f97316" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 text-lg font-semibold">
                  Total Reviews
                </Text>
                <Text className="text-gray-500 text-sm">All time</Text>
              </View>
              <Text className="text-gray-900 text-3xl font-bold">
                {stats.totalCardsReviewed}
              </Text>
            </View>
          </View>

          <View className="h-8" />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
