import React, { useState, useRef } from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../utils/useTheme";

type CameraScreenProps = {
  navigation: any;
};

export default function CameraScreen({ navigation }: CameraScreenProps) {
  const { colors } = useTheme();
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  if (!permission) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.background }}>
        <Text style={{ color: colors.text }}>Loading camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="camera-outline" size={64} color={colors.textSecondary} />
          <Text className="text-xl font-bold text-center mt-4 mb-2" style={{ color: colors.text }}>
            Camera Permission Required
          </Text>
          <Text className="text-base text-center mb-8" style={{ color: colors.textSecondary }}>
            We need access to your camera to scan your notes
          </Text>
          <Pressable
            onPress={requestPermission}
            className="bg-blue-600 rounded-2xl py-4 px-8"
          >
            <Text className="text-white text-lg font-bold">Grant Permission</Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.goBack()}
            className="mt-4"
          >
            <Text className="text-base" style={{ color: colors.textSecondary }}>Cancel</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const handleCapture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync();
        if (photo) {
          navigation.navigate("ProcessingScreen", { photoUri: photo.uri });
        }
      } catch (error) {
        console.error("Error taking picture:", error);
      }
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const toggleCameraFacing = () => {
    setFacing((current) => (current === "back" ? "front" : "back"));
  };

  return (
    <View className="flex-1 bg-black">
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing={facing}
      />

      {/* Overlay UI */}
      <View className="absolute top-0 left-0 right-0 bottom-0">
        <SafeAreaView className="flex-1">
          {/* Top Bar */}
          <View className="flex-row justify-between items-center px-6 py-4">
            <Pressable onPress={handleCancel} className="p-2">
              <Ionicons name="close" size={32} color="white" />
            </Pressable>

            <Text className="text-white text-lg font-semibold">
              Take a photo of your notes
            </Text>

            <Pressable onPress={toggleCameraFacing} className="p-2">
              <Ionicons name="camera-reverse" size={32} color="white" />
            </Pressable>
          </View>

          {/* Capture Button */}
          <View className="flex-1 justify-end items-center pb-12">
            <Pressable
              onPress={handleCapture}
              className="w-20 h-20 rounded-full bg-white border-4 border-gray-300"
            />
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}
