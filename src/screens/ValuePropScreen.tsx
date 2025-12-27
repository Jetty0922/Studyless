import React, { useEffect, useRef } from "react";
import { View, Text, Pressable, Animated, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { OnboardingStackParamList } from "../navigation/RootNavigator";
import { GradientButton } from "../components/ui";

type ValuePropScreenProps = {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, "ValueProp">;
};

export default function ValuePropScreen({ navigation }: ValuePropScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const badgeFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered entrance animation
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(badgeFade, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [badgeFade, fadeAnim, slideAnim]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#0f172a", "#1e1b4b", "#312e81"]}
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
            <View style={styles.iconCircle}>
              <Ionicons name="flash" size={60} color="#ffffff" style={styles.sparkleIcon} />
            </View>
          </Animated.View>

          {/* Main Headline */}
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            <Text style={styles.headline}>
              Study Less{"\n"}
              <Text style={styles.headlineAccent}>Remember More</Text>
            </Text>
          </Animated.View>

          {/* Value Proposition */}
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            <Text style={styles.subheadline}>
              AI-powered flashcards that adapt to{"\n"}
              your memory. Study smarter, not harder.
            </Text>
          </Animated.View>

          {/* Science Badge */}
          <Animated.View style={[styles.socialProofBadge, { opacity: badgeFade }]}>
            <View style={styles.badgeContent}>
              <Ionicons name="flask" size={16} color="#667eea" />
              <Text style={styles.badgeText}>Based on 100+ years of memory science</Text>
            </View>
          </Animated.View>

          {/* Spacer */}
          <View style={styles.spacer} />

          {/* CTA Button */}
          <Animated.View
            style={[
              styles.ctaContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <GradientButton
              title="Get Started"
              onPress={() => navigation.navigate("HowItWorks")}
              size="large"
              style={styles.ctaButton}
            />

            {/* Sign In Link */}
            <Pressable
              onPress={() => navigation.navigate("SignIn")}
              style={styles.signInContainer}
            >
              <Text style={styles.signInText}>Already have an account? </Text>
              <Text style={styles.signInLink}>Sign In</Text>
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
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(102, 126, 234, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(167, 139, 250, 0.4)",
  },
  sparkleIcon: {
    transform: [
      { translateX: 0.5 },
      { translateY: 1 },
    ],
  },
  headline: {
    fontSize: 42,
    fontWeight: "800",
    color: "#ffffff",
    textAlign: "center",
    lineHeight: 50,
    letterSpacing: -1,
  },
  headlineAccent: {
    color: "#a78bfa",
  },
  subheadline: {
    fontSize: 18,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 26,
    marginTop: 16,
  },
  stat: {
    color: "#4facfe",
    fontWeight: "700",
  },
  socialProofBadge: {
    marginTop: 24,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  badgeContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badgeText: {
    color: "#e2e8f0",
    fontSize: 14,
    fontWeight: "500",
  },
  spacer: {
    flex: 1,
    minHeight: 40,
    maxHeight: 80,
  },
  ctaContainer: {
    width: "100%",
    alignItems: "center",
    paddingBottom: 20,
  },
  ctaButton: {
    width: "100%",
  },
  signInContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
  },
  signInText: {
    color: "#94a3b8",
    fontSize: 15,
  },
  signInLink: {
    color: "#a78bfa",
    fontSize: 15,
    fontWeight: "600",
  },
});
