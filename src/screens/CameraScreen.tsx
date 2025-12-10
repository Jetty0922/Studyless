import React, { useState, useRef } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { OnboardingStackParamList } from "../navigation/RootNavigator";
import { useTheme } from "../utils/useTheme";

type CameraScreenProps = {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, "CameraScreen">;
};

export default function CameraScreen({ navigation }: CameraScreenProps) {
  const { colors, isDark } = useTheme();
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  if (!permission) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Loading camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.permissionTitle, { color: colors.text }]}>
            Camera Permission Required
          </Text>
          <Text style={[styles.permissionText, { color: colors.textSecondary }]}>
            We need access to your camera to scan your notes
          </Text>
          <Pressable
            onPress={requestPermission}
            style={({ pressed }) => [styles.grantButton, pressed && styles.pressed]}
          >
            <Text style={styles.grantButtonText}>Grant Permission</Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [styles.cancelLink, pressed && styles.pressed]}
          >
            <Text style={[styles.cancelLinkText, { color: colors.textSecondary }]}>Cancel</Text>
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
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
      />

      {/* Overlay UI */}
      <View style={styles.overlay}>
        <SafeAreaView style={styles.overlayContent}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <Pressable 
              onPress={handleCancel} 
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            >
              <Ionicons name="close" size={32} color="white" />
            </Pressable>

            <Text style={styles.instructionText}>
              Take a photo of your notes
            </Text>

            <Pressable 
              onPress={toggleCameraFacing} 
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            >
              <Ionicons name="camera-reverse" size={32} color="white" />
            </Pressable>
          </View>

          {/* Capture Button */}
          <View style={styles.captureContainer}>
            <Pressable
              onPress={handleCapture}
              style={({ pressed }) => [styles.captureButton, pressed && styles.captureButtonPressed]}
            />
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlayContent: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  iconButton: {
    padding: 8,
  },
  pressed: {
    opacity: 0.7,
  },
  instructionText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600",
  },
  captureContainer: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 48,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#ffffff",
    borderWidth: 4,
    borderColor: "#d1d5db",
  },
  captureButtonPressed: {
    backgroundColor: "#e5e7eb",
  },
  permissionContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
  },
  grantButton: {
    backgroundColor: "#667eea",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  grantButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
  cancelLink: {
    marginTop: 16,
  },
  cancelLinkText: {
    fontSize: 16,
  },
});
