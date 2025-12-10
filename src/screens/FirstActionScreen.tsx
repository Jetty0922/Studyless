import React, { useEffect, useRef } from "react";
import { View, Text, Pressable, Alert, StyleSheet, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from 'expo-document-picker';
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { OnboardingStackParamList } from "../navigation/RootNavigator";
import { useFlashcardStore } from "../state/flashcardStore";
import { GradientButton } from "../components/ui";
import { useTheme } from "../utils/useTheme";

type FirstActionScreenProps = {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, "FirstAction">;
};

export default function FirstActionScreen({ navigation }: FirstActionScreenProps) {
  const { colors, isDark } = useTheme();
  const completeOnboarding = useFlashcardStore((s) => s.completeOnboarding);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleScanNow = () => {
    navigation.navigate("CameraScreen");
  };

  const handleUploadPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true
      });

      if (result.canceled) return;

      const file = result.assets[0];
      if (file) {
        navigation.navigate("ProcessingScreen", {
          fileUri: file.uri,
          type: 'pdf'
        });
      }
    } catch (e: any) {
      Alert.alert("Error picking file", e.message);
    }
  };

  const handleDoLater = () => {
    completeOnboarding();
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={isDark ? ["#0f172a", "#1e1b4b", "#312e81"] : ["#f8fafc", "#eef2ff", "#e0e7ff"]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />


      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Icon */}
          <Animated.View
            style={[
              styles.illustrationContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={[styles.iconCircle, { backgroundColor: isDark ? "rgba(79, 172, 254, 0.2)" : "rgba(79, 172, 254, 0.15)" }]}>
              <Ionicons name="camera" size={70} color="#4facfe" />
            </View>
          </Animated.View>

          {/* Title */}
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            <Text style={[styles.title, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>
              Create your first cards
            </Text>
          </Animated.View>

          {/* Description */}
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            <Text style={[styles.description, { color: isDark ? "#94a3b8" : "#64748b" }]}>
              Got notes from class today? Let's turn them into flashcards with AI!
            </Text>
          </Animated.View>

          {/* Spacer */}
          <View style={styles.spacer} />

          {/* Buttons */}
          <Animated.View
            style={[
              styles.buttonContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <GradientButton
              title="Take a Photo"
              onPress={handleScanNow}
              size="large"
              style={styles.button}
              icon={<Ionicons name="camera" size={22} color="#ffffff" />}
            />

            <Pressable
              onPress={handleUploadPDF}
              style={[
                styles.secondaryButton,
                {
                  backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(102, 126, 234, 0.1)",
                  borderColor: isDark ? "rgba(255,255,255,0.2)" : "#667eea",
                },
              ]}
            >
              <Ionicons name="document" size={20} color="#667eea" />
              <Text style={[styles.secondaryButtonText, { color: "#667eea" }]}>
                Upload PDF
              </Text>
            </Pressable>

            <Pressable onPress={handleDoLater} style={styles.skipButton}>
              <Text style={[styles.skipText, { color: isDark ? "#64748b" : "#94a3b8" }]}>
                I'll do this later
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  illustrationContainer: {
    marginBottom: 32,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(79, 172, 254, 0.3)",
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 17,
    textAlign: "center",
    lineHeight: 26,
    marginTop: 16,
    paddingHorizontal: 16,
  },
  spacer: {
    flex: 1,
    minHeight: 40,
    maxHeight: 80,
  },
  buttonContainer: {
    width: "100%",
    alignItems: "center",
    paddingBottom: 20,
  },
  button: {
    width: "100%",
  },
  secondaryButton: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 28,
    borderWidth: 2,
    marginTop: 12,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: "700",
  },
  skipButton: {
    marginTop: 24,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 15,
    fontWeight: "500",
  },
});
