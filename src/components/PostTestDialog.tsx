import React from "react";
import { View, Text, Pressable, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface PostTestDialogProps {
  visible: boolean;
  deckName: string;
  onTestResponse: (response: "great" | "good" | "okay" | "bad") => void;
  onClose: () => void;
}

export function PostTestDialog({
  visible,
  deckName,
  onTestResponse,
  onClose,
}: PostTestDialogProps) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 items-center justify-center px-6">
        <View className="bg-white rounded-3xl p-6 w-full max-w-sm">
          <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
            How was your test?
          </Text>
          <Text className="text-base text-gray-600 text-center mb-6">
            {deckName}
          </Text>

          <View className="flex-row justify-around mb-4">
            <Pressable
              onPress={() => onTestResponse("great")}
              className="items-center active:opacity-70"
            >
              <View className="w-16 h-16 bg-green-100 rounded-full items-center justify-center mb-2">
                <Text className="text-4xl">😊</Text>
              </View>
              <Text className="text-sm font-medium text-gray-700">Great</Text>
            </Pressable>

            <Pressable
              onPress={() => onTestResponse("good")}
              className="items-center active:opacity-70"
            >
              <View className="w-16 h-16 bg-blue-100 rounded-full items-center justify-center mb-2">
                <Text className="text-4xl">🙂</Text>
              </View>
              <Text className="text-sm font-medium text-gray-700">Good</Text>
            </Pressable>

            <Pressable
              onPress={() => onTestResponse("okay")}
              className="items-center active:opacity-70"
            >
              <View className="w-16 h-16 bg-yellow-100 rounded-full items-center justify-center mb-2">
                <Text className="text-4xl">😐</Text>
              </View>
              <Text className="text-sm font-medium text-gray-700">Okay</Text>
            </Pressable>

            <Pressable
              onPress={() => onTestResponse("bad")}
              className="items-center active:opacity-70"
            >
              <View className="w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-2">
                <Text className="text-4xl">😞</Text>
              </View>
              <Text className="text-sm font-medium text-gray-700">Bad</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={onClose}
            className="bg-gray-100 rounded-xl py-3 items-center active:opacity-70"
          >
            <Text className="text-gray-700 font-semibold">Skip</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

interface LongTermDialogProps {
  visible: boolean;
  deckName: string;
  onYes: () => void;
  onNo: () => void;
}

export function LongTermDialog({
  visible,
  deckName,
  onYes,
  onNo,
}: LongTermDialogProps) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onNo}
    >
      <View className="flex-1 bg-black/50 items-center justify-center px-6">
        <View className="bg-white rounded-3xl p-6 w-full max-w-sm">
          <Text className="text-2xl font-bold text-gray-900 text-center mb-4">
            Keep reviewing for finals?
          </Text>

          <View className="bg-blue-50 rounded-2xl p-4 mb-6">
            <Text className="text-sm text-gray-700 leading-6">
              Review these flashcards every 2 weeks to maintain your knowledge for finals. Each session takes about 20 minutes.
            </Text>
          </View>

          <Text className="text-sm text-gray-600 text-center mb-6">
            {deckName}
          </Text>

          <View className="gap-3">
            <Pressable
              onPress={onYes}
              className="bg-blue-500 rounded-xl py-4 items-center active:opacity-70"
            >
              <Text className="text-white text-lg font-semibold">
                Yes, Keep Reviewing
              </Text>
            </Pressable>

            <Pressable
              onPress={onNo}
              className="bg-gray-100 rounded-xl py-4 items-center active:opacity-70"
            >
              <Text className="text-gray-700 text-lg font-semibold">
                No, Archive Chapter
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
