import React, { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { OnboardingStackParamList } from "../navigation/RootNavigator";
import { GradientButton, GradientInput } from "../components/ui";
import { useTheme } from "../utils/useTheme";

type QuickSetupScreenProps = {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, "QuickSetup">;
};

export default function QuickSetupScreen({ navigation }: QuickSetupScreenProps) {
  const { isDark } = useTheme();
  const [name, setName] = useState("");
  const [school, setSchool] = useState("");

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
  }, [fadeAnim, slideAnim]);

  const handleContinue = () => {
    // Save user data to store (will add later)
    navigation.navigate("NotificationsSetup");
  };

  const handleSkip = () => {
    navigation.navigate("NotificationsSetup");
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
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <Animated.View
              style={[
                styles.headerSection,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <View style={[styles.iconContainer, { backgroundColor: isDark ? "rgba(102, 126, 234, 0.2)" : "rgba(102, 126, 234, 0.15)" }]}>
                <Ionicons name="person-circle" size={48} color="#667eea" />
              </View>
              <Text style={[styles.title, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>
                Let’s get to know you
              </Text>
              <Text style={[styles.subtitle, { color: isDark ? "#94a3b8" : "#64748b" }]}>
                This helps us personalize your experience
              </Text>
            </Animated.View>

            {/* Form */}
            <Animated.View
              style={[
                styles.formSection,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: isDark ? "#e2e8f0" : "#374151" }]}>
                  What’s your name?
                </Text>
                <GradientInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your name"
                  icon="person-outline"
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: isDark ? "#e2e8f0" : "#374151" }]}>
                  What school do you go to?
                </Text>
                <GradientInput
                  value={school}
                  onChangeText={setSchool}
                  placeholder="Enter your school (optional)"
                  icon="school-outline"
                  autoCapitalize="words"
                />
              </View>
            </Animated.View>

            {/* Spacer */}
            <View style={styles.spacer} />

            {/* Continue Button */}
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
                title="Continue"
                onPress={handleContinue}
                size="large"
                style={styles.button}
              />
              
              <Pressable onPress={handleSkip} style={styles.skipButton}>
                <Text style={[styles.skipText, { color: isDark ? "#64748b" : "#94a3b8" }]}>
                  Skip for now
                </Text>
              </Pressable>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 40,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 8,
  },
  formSection: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  spacer: {
    flex: 1,
    minHeight: 40,
  },
  buttonContainer: {
    paddingBottom: 20,
  },
  button: {
    width: "100%",
  },
  skipButton: {
    marginTop: 16,
    paddingVertical: 12,
  },
  skipText: {
    fontSize: 15,
    textAlign: "center",
  },
});
