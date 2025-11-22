import React, { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFlashcardStore } from "../state/flashcardStore";
import { format, subDays, startOfWeek, differenceInDays } from "date-fns";
import { useTheme } from "../utils/useTheme";
import { useNavigation } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { MainTabsParamList } from "../navigation/RootNavigator";
import { CompositeNavigationProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";

type NavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabsParamList, "Progress">,
  NativeStackNavigationProp<RootStackParamList>
>;
type TestFilter = "all" | "upcoming" | "finished";

export default function ProgressScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const flashcards = useFlashcardStore((s) => s.flashcards);
  const decks = useFlashcardStore((s) => s.decks);

  const [testFilter, setTestFilter] = useState<TestFilter>("upcoming");
  const [showAllDecks, setShowAllDecks] = useState(false);

  // Calculate cards reviewed this week
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const cardsThisWeek = flashcards.filter((card) => {
    if (!card.lastReviewed) return false;
    const reviewDate = new Date(card.lastReviewed);
    return reviewDate >= weekStart;
  }).length;

  // Generate week days data for chart
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayCards = flashcards.filter((card) => {
      if (!card.lastReviewed) return false;
      const reviewDate = new Date(card.lastReviewed);
      return reviewDate.toDateString() === date.toDateString();
    }).length;

    return {
      date,
      count: dayCards,
      label: format(date, "EEE").substring(0, 3),
    };
  });

  const maxDayCards = Math.max(...weekDays.map((d) => d.count), 1);
  const avgDaily = cardsThisWeek > 0 ? Math.round(cardsThisWeek / 7) : 0;

  // Categorize cards by mastery level
  const categorizedCards = flashcards.reduce(
    (acc, card) => {
      // Use the mastery field from the card
      if (card.mastery === "STRUGGLING") {
        acc.struggling.push(card);
      } else if (card.mastery === "MASTERED") {
        acc.mastered.push(card);
      } else {
        acc.learning.push(card);
      }
      return acc;
    },
    { mastered: [] as typeof flashcards, learning: [] as typeof flashcards, struggling: [] as typeof flashcards }
  );

  const totalCards = flashcards.length;
  const masteredPercentage = totalCards > 0
    ? Math.round((categorizedCards.mastered.length / totalCards) * 100)
    : 0;
  const learningPercentage = totalCards > 0
    ? Math.round((categorizedCards.learning.length / totalCards) * 100)
    : 0;
  const strugglingPercentage = totalCards > 0
    ? Math.round((categorizedCards.struggling.length / totalCards) * 100)
    : 0;

  // Get all tests with details
  const allTestsWithDetails = decks
    .filter((d) => d.testDate)
    .map((deck) => {
      const deckCards = flashcards.filter((card) => card.deckId === deck.id);

      const masteredCount = deckCards.filter(
        (c) => c.mastery === "MASTERED"
      ).length;
      const readyPercentage = deckCards.length > 0
        ? Math.round((masteredCount / deckCards.length) * 100)
        : 0;

      const daysLeft = differenceInDays(new Date(deck.testDate!), new Date());
      const isPast = new Date(deck.testDate!) < new Date();

      return {
        ...deck,
        readyPercentage,
        daysLeft,
        cardCount: deckCards.length,
        isPast,
      };
    });

  // Filter tests based on selected filter
  const filteredTests = allTestsWithDetails
    .filter((test) => {
      if (testFilter === "upcoming") {
        return !test.isPast;
      } else if (testFilter === "finished") {
        return test.isPast;
      }
      return true; // "all"
    })
    .sort((a, b) => {
      if (testFilter === "finished") {
        // Sort finished tests by most recent first
        return new Date(b.testDate!).getTime() - new Date(a.testDate!).getTime();
      }
      // Sort upcoming tests by soonest first
      return a.daysLeft - b.daysLeft;
    });

  // Get top 3 upcoming tests for home screen compatibility
  const upcomingTests = filteredTests.filter((t) => !t.isPast).slice(0, 3);

  // Deck stats
  const deckStats = decks.map((deck) => {
    const deckCards = flashcards.filter((card) => card.deckId === deck.id);

    const masteredCount = deckCards.filter(
      (c) => c.mastery === "MASTERED"
    ).length;
    const masteredPct = deckCards.length > 0
      ? Math.round((masteredCount / deckCards.length) * 100)
      : 0;

    const hasTest = deck.testDate && new Date(deck.testDate) > new Date();
    const nextTest = hasTest
      ? {
          date: deck.testDate!,
          daysLeft: differenceInDays(new Date(deck.testDate!), new Date()),
        }
      : null;

    return {
      ...deck,
      cardCount: deckCards.length,
      masteredPct,
      nextTest,
    };
  });

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }} edges={["top"]}>
      <View className="flex-1">
        <View className="px-6 pt-6 pb-4" style={{ backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text className="text-3xl font-bold" style={{ color: colors.text }}>Progress</Text>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-6 py-6">
            {/* This Week Stats */}
            <View className="rounded-3xl p-5 mb-4" style={{ backgroundColor: colors.surface }}>
              <Text className="text-xl font-bold mb-4" style={{ color: colors.text }}>
                This Week
              </Text>
              <View className="gap-3">
                <View className="flex-row justify-between">
                  <Text className="text-base" style={{ color: colors.textSecondary }}>Cards Reviewed</Text>
                  <Text className="font-bold text-xl" style={{ color: colors.text }}>{cardsThisWeek}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-base" style={{ color: colors.textSecondary }}>Daily Average</Text>
                  <Text className="font-bold text-xl" style={{ color: colors.text }}>{avgDaily}</Text>
                </View>
              </View>
            </View>

            {/* Overall Mastery */}
            <View className="rounded-3xl p-5 mb-4" style={{ backgroundColor: colors.surface }}>
              <Text className="text-xl font-bold mb-2" style={{ color: colors.text }}>
                Overall Mastery
              </Text>
              <Text className="text-sm mb-5" style={{ color: colors.textSecondary }}>Total Cards: {totalCards}</Text>

              <View className="gap-4">
                <View>
                  <View className="flex-row justify-between mb-2">
                    <Text className="font-semibold" style={{ color: "#10b981" }}>
                      Mastered
                    </Text>
                    <Text className="font-bold" style={{ color: colors.text }}>
                      {categorizedCards.mastered.length} ({masteredPercentage}%)
                    </Text>
                  </View>
                  <View className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: colors.border }}>
                    <View
                      className="h-full rounded-full"
                      style={{ width: `${masteredPercentage}%`, backgroundColor: "#10b981" }}
                    />
                  </View>
                </View>

                <View>
                  <View className="flex-row justify-between mb-2">
                    <Text className="font-semibold" style={{ color: colors.primary }}>
                      Learning
                    </Text>
                    <Text className="font-bold" style={{ color: colors.text }}>
                      {categorizedCards.learning.length} ({learningPercentage}%)
                    </Text>
                  </View>
                  <View className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: colors.border }}>
                    <View
                      className="h-full rounded-full"
                      style={{ width: `${learningPercentage}%`, backgroundColor: colors.primary }}
                    />
                  </View>
                </View>

                <View>
                  <View className="flex-row justify-between mb-2">
                    <Text className="font-semibold" style={{ color: "#f97316" }}>
                      Struggling
                    </Text>
                    <Text className="font-bold" style={{ color: colors.text }}>
                      {categorizedCards.struggling.length} ({strugglingPercentage}%)
                    </Text>
                  </View>
                  <View className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: colors.border }}>
                    <View
                      className="h-full rounded-full"
                      style={{ width: `${strugglingPercentage}%`, backgroundColor: "#f97316" }}
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* Your Decks */}
            {deckStats.length > 0 && (
              <View className="rounded-3xl p-5 mb-4" style={{ backgroundColor: colors.surface }}>
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-xl font-bold" style={{ color: colors.text }}>
                    Your Decks
                  </Text>
                  {deckStats.length > 3 && (
                    <Pressable onPress={() => navigation.navigate("Decks")} className="active:opacity-70">
                      <Text className="text-sm font-semibold" style={{ color: colors.primary }}>
                        See All ({deckStats.length})
                      </Text>
                    </Pressable>
                  )}
                </View>
              <View className="gap-4">
                {deckStats.slice(0, 3).map((deck, index, array) => (
                  <Pressable
                    key={deck.id}
                    onPress={() => navigation.navigate("Deck", { deckId: deck.id })}
                    className="pb-4 active:opacity-70"
                    style={{ borderBottomWidth: index === array.length - 1 ? 0 : 1, borderBottomColor: colors.border }}
                  >
                    <View className="flex-row items-center mb-2">
                      <View
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: deck.color }}
                      />
                      <Text className="font-bold text-base" style={{ color: colors.text }}>
                        {deck.name}
                      </Text>
                    </View>
                    <Text className="text-sm mb-1" style={{ color: colors.textSecondary }}>
                      {deck.cardCount} cards • {deck.masteredPct}% mastered
                    </Text>
                    {deck.nextTest && (
                      <Text className="text-sm font-medium" style={{ color: colors.primary }}>
                        Next test: {format(new Date(deck.nextTest.date), "MMM d")} ({deck.nextTest.daysLeft} days)
                      </Text>
                    )}
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Review Activity Chart */}
          <View className="rounded-3xl p-5 mb-4" style={{ backgroundColor: colors.surface }}>
            <Text className="text-xl font-bold mb-2" style={{ color: colors.text }}>
              Review Activity
            </Text>
            <Text className="text-sm mb-6" style={{ color: colors.textSecondary }}>Last 7 Days</Text>
            <View className="flex-row items-end justify-between" style={{ height: 180 }}>
              {weekDays.map((day, index) => {
                const barHeight = day.count > 0
                  ? Math.max((day.count / maxDayCards) * 140, 20)
                  : 8;
                const isToday = day.date.toDateString() === new Date().toDateString();

                return (
                  <View key={index} className="flex-1 items-center">
                    <View className="flex-1 justify-end mb-2">
                      {day.count > 0 && (
                        <Text className="text-xs mb-1 text-center font-semibold" style={{ color: colors.textSecondary }}>
                          {day.count}
                        </Text>
                      )}
                      <View
                        className="rounded-lg mx-1"
                        style={{
                          backgroundColor: isToday ? colors.primary : colors.primaryLight,
                          height: barHeight,
                          width: 28,
                        }}
                      />
                    </View>
                    <Text className="text-xs mt-2" style={{ color: isToday ? colors.primary : colors.textSecondary, fontWeight: isToday ? "bold" : "normal" }}>
                      {day.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Tests Section */}
          {allTestsWithDetails.length > 0 && (
            <View className="rounded-3xl p-5 mb-4" style={{ backgroundColor: colors.surface }}>
              <Text className="text-xl font-bold mb-4" style={{ color: colors.text }}>
                Tests
              </Text>

              {/* Filter Tabs */}
              <View className="flex-row rounded-2xl p-1 mb-4" style={{ backgroundColor: colors.border }}>
                <Pressable
                  onPress={() => setTestFilter("upcoming")}
                  className="flex-1 py-2 rounded-xl"
                  style={{ backgroundColor: testFilter === "upcoming" ? colors.surface : "transparent" }}
                >
                  <Text
                    className="text-center font-semibold"
                    style={{ color: testFilter === "upcoming" ? colors.primary : colors.textSecondary }}
                  >
                    Upcoming
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setTestFilter("finished")}
                  className="flex-1 py-2 rounded-xl"
                  style={{ backgroundColor: testFilter === "finished" ? colors.surface : "transparent" }}
                >
                  <Text
                    className="text-center font-semibold"
                    style={{ color: testFilter === "finished" ? colors.primary : colors.textSecondary }}
                  >
                    Finished
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setTestFilter("all")}
                  className="flex-1 py-2 rounded-xl"
                  style={{ backgroundColor: testFilter === "all" ? colors.surface : "transparent" }}
                >
                  <Text
                    className="text-center font-semibold"
                    style={{ color: testFilter === "all" ? colors.primary : colors.textSecondary }}
                  >
                    All
                  </Text>
                </Pressable>
              </View>

              {/* Tests List */}
              {filteredTests.length === 0 ? (
                <View className="py-8">
                  <Text className="text-center" style={{ color: colors.textSecondary }}>
                    {testFilter === "upcoming" && "No upcoming tests"}
                    {testFilter === "finished" && "No finished tests"}
                    {testFilter === "all" && "No tests"}
                  </Text>
                </View>
              ) : (
                <View className="gap-3">
                  {filteredTests.map((test) => (
                    <View
                      key={test.id}
                      className="rounded-2xl p-4"
                      style={{ borderWidth: 1, borderColor: colors.border }}
                    >
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-1">
                          <View className="flex-row items-center mb-1">
                            <View
                              className="w-2 h-2 rounded-full mr-2"
                              style={{ backgroundColor: test.color }}
                            />
                            <Text className="font-bold text-base" style={{ color: colors.text }}>
                              {test.name}
                            </Text>
                          </View>
                          <Text className="text-xs" style={{ color: colors.textSecondary }}>
                            {test.cardCount} cards
                          </Text>
                        </View>
                        <View
                          className="px-3 py-1.5 rounded-full"
                          style={{
                            backgroundColor: test.readyPercentage >= 80
                              ? "#d1fae5"
                              : test.readyPercentage >= 60
                              ? "#fef3c7"
                              : "#fee2e2"
                          }}
                        >
                          <Text
                            className="text-sm font-bold"
                            style={{
                              color: test.readyPercentage >= 80
                                ? "#065f46"
                                : test.readyPercentage >= 60
                                ? "#92400e"
                                : "#991b1b"
                            }}
                          >
                            {test.readyPercentage}%
                          </Text>
                        </View>
                      </View>
                      <View className="flex-row items-center justify-between pt-2" style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
                        <Text className="text-sm" style={{ color: colors.textSecondary }}>
                          {format(new Date(test.testDate!), "MMM d, yyyy")}
                        </Text>
                        {test.isPast ? (
                          <Text className="font-medium text-sm" style={{ color: colors.textSecondary }}>
                            Finished
                          </Text>
                        ) : (
                          <Text className="font-semibold text-sm" style={{ color: colors.primary }}>
                            {test.daysLeft === 0
                              ? "Today"
                              : test.daysLeft === 1
                              ? "Tomorrow"
                              : `${test.daysLeft} days left`}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Upcoming Tests - Keep the old section for compatibility but it will be empty */}
          {upcomingTests.length > 0 && testFilter === "upcoming" && (
            <View style={{ display: "none" }}>
              {/* Hidden to prevent duplication */}
            </View>
          )}

            <View className="h-8" />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
