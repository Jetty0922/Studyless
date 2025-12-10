import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { OnboardingStackParamList } from "../navigation/RootNavigator";
import { useTheme } from "../utils/useTheme";
import { generateFlashcardsFromFile } from "../utils/aiFlashcardGenerator";

type ProcessingScreenProps = {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, "ProcessingScreen">;
  route: RouteProp<OnboardingStackParamList, "ProcessingScreen">;
};

export default function ProcessingScreen({ navigation, route }: ProcessingScreenProps) {
  const { colors, isDark } = useTheme();
  const { photoUri, fileUri, type } = route.params;
  const uri = fileUri || photoUri;
  const [status, setStatus] = useState("Initializing...");

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    // Rotate animation
    Animated.loop(
      Animated.timing(rotateAnim, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true })
    ).start();
  }, []);

  const spin = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  useEffect(() => {
    const process = async () => {
      if (!uri) {
        navigation.goBack();
        return;
      }

      try {
        setStatus("Analyzing content...");
        const mimeType = type === 'pdf' ? 'application/pdf' : 'image/jpeg';
        const cards = await generateFlashcardsFromFile(uri, mimeType);
        
        setStatus("Finalizing...");
        navigation.replace("CardsGenerated", { sourceUri: uri, cardCount: cards.length, cards: cards, type: type || 'image' });
      } catch (error: any) {
        console.error("Processing error:", error);
        navigation.goBack();
      }
    };

    process();
  }, [navigation, uri, type]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={isDark ? ["#0f172a", "#1e1b4b", "#312e81"] : ["#f8fafc", "#eef2ff", "#e0e7ff"]} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <View style={[styles.floatingShape, styles.shape1, { backgroundColor: isDark ? "#667eea" : "#a5b4fc" }]} />
      <View style={[styles.floatingShape, styles.shape2, { backgroundColor: isDark ? "#f093fb" : "#c4b5fd" }]} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Animated Icon */}
          <View style={styles.iconWrapper}>
            <Animated.View style={[styles.iconRing, { transform: [{ scale: pulseAnim }], borderColor: isDark ? "rgba(102, 126, 234, 0.3)" : "rgba(102, 126, 234, 0.2)" }]} />
            <Animated.View style={[styles.iconContainer, { transform: [{ rotate: spin }] }]}>
              <LinearGradient colors={["#667eea", "#764ba2"]} style={styles.iconGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Ionicons name="sparkles" size={40} color="#ffffff" />
              </LinearGradient>
            </Animated.View>
          </View>

          <Text style={[styles.title, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Generating flashcards...</Text>
          <Text style={[styles.status, { color: isDark ? "#94a3b8" : "#64748b" }]}>{status}</Text>

          {/* Progress dots */}
          <View style={styles.dotsContainer}>
            {[0, 1, 2].map((i) => (
              <Animated.View key={i} style={[styles.dot, { backgroundColor: "#667eea", opacity: pulseAnim.interpolate({ inputRange: [1, 1.1], outputRange: [0.3 + i * 0.2, 0.6 + i * 0.2] }) }]} />
            ))}
          </View>

          <View style={[styles.infoCard, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(102, 126, 234, 0.08)" }]}>
            <Ionicons name="flash" size={20} color="#667eea" />
            <Text style={[styles.infoText, { color: isDark ? "#94a3b8" : "#64748b" }]}>
              Using Gemini 2.0 Flash for high-quality analysis. This may take up to 30 seconds for large documents.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 },
  iconWrapper: { marginBottom: 40, alignItems: "center", justifyContent: "center" },
  iconRing: { position: "absolute", width: 140, height: 140, borderRadius: 70, borderWidth: 2 },
  iconContainer: { width: 100, height: 100, borderRadius: 50, overflow: "hidden" },
  iconGradient: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "800", textAlign: "center", marginBottom: 12, letterSpacing: -0.5 },
  status: { fontSize: 16, textAlign: "center", marginBottom: 24 },
  dotsContainer: { flexDirection: "row", gap: 8, marginBottom: 40 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  infoCard: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 16, gap: 12 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 20 },
  floatingShape: { position: "absolute", borderRadius: 100, opacity: 0.15 },
  shape1: { width: 200, height: 200, top: -80, right: -60 },
  shape2: { width: 150, height: 150, bottom: 100, left: -50 },
});
