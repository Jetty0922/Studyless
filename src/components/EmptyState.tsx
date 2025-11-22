import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

export default function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <View className="items-center justify-center mt-20 px-8">
      <Ionicons name={icon} size={64} color="#d1d5db" />
      <Text className="text-xl text-gray-500 mt-4 text-center">{title}</Text>
      <Text className="text-base text-gray-400 mt-2 text-center">{description}</Text>
    </View>
  );
}
