import React, { useEffect, useRef } from "react";
import { View, Text, Pressable, Alert, StyleSheet, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from 'expo-document-picker';
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { OnboardingStackParamList } from "../navigation/RootNavigator";
import { useFlashcardStore } from "../state/flashcardStore";
import { Button, Card } from "../components/ui";
import { useTheme } from "../utils/useTheme";

type FirstActionScreenProps = {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, "FirstAction">;
};

export default function FirstActionScreen({ navigation }: FirstActionScreenProps) {
  const { colors, isDark } = useTheme();
  const completeOnboarding = useFlashcardStore((s) => s.completeOnboarding);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Header */}
          <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
            <Text style={[styles.title, { color: colors.text }]}>
              Create Your First Cards
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Upload your notes and our AI will create flashcards for you
            </Text>
          </Animated.View>

          {/* Options */}
          <Animated.View style={[styles.optionsContainer, { opacity: fadeAnim }]}>
            <Card variant="outlined" padding={0} style={styles.optionCard}>
              <Pressable onPress={handleScanNow} style={styles.optionContent}>
                <View style={[styles.optionIcon, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="camera-outline" size={28} color={colors.primary} />
                </View>
                <View style={styles.optionText}>
                  <Text style={[styles.optionTitle, { color: colors.text }]}>Take a Photo</Text>
                  <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                    Snap your notes, textbook, or slides
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </Pressable>
            </Card>

            <Card variant="outlined" padding={0} style={styles.optionCard}>
              <Pressable onPress={handleUploadPDF} style={styles.optionContent}>
                <View style={[styles.optionIcon, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="document-outline" size={28} color={colors.primary} />
                </View>
                <View style={styles.optionText}>
                  <Text style={[styles.optionTitle, { color: colors.text }]}>Upload PDF</Text>
                  <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                    Import study materials from files
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </Pressable>
            </Card>
          </Animated.View>

          {/* Spacer */}
          <View style={styles.spacer} />

          {/* Skip Button */}
          <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
            <Button
              title="Skip for Now"
              onPress={handleDoLater}
              variant="ghost"
              size="large"
            />
            <Text style={[styles.skipHint, { color: colors.textSecondary }]}>
              You can always add cards later from the home screen
            </Text>
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
    paddingTop: 40,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    marginBottom: 0,
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  spacer: {
    flex: 1,
    minHeight: 40,
  },
  footer: {
    paddingBottom: 24,
    alignItems: "center",
  },
  skipHint: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
  },
});
