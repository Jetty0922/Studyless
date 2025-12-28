import React, { useEffect, useRef } from "react";
import { View, Text, Pressable, Animated, StyleSheet, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { OnboardingStackParamList } from "../navigation/RootNavigator";
import { Button } from "../components/ui";
import { useTheme } from "../utils/useTheme";

type ValuePropScreenProps = {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, "ValueProp">;
};

export default function ValuePropScreen({ navigation }: ValuePropScreenProps) {
  const { colors, isDark } = useTheme();
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Logo */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Image 
              source={require('../../assets/icon.png')} 
              style={styles.logo} 
              resizeMode="contain" 
            />
          </Animated.View>

          {/* Main Headline */}
          <Animated.View
            style={[
              styles.headlineContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={[styles.headline, { color: colors.text }]}>
              Study Less,{"\n"}Remember More
            </Text>
            <Text style={[styles.subheadline, { color: colors.textSecondary }]}>
              AI-powered flashcards that adapt to your memory using proven science.
            </Text>
          </Animated.View>

          {/* Features */}
          <Animated.View
            style={[
              styles.featuresContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <FeatureItem
              icon="camera-outline"
              text="Scan notes, get flashcards instantly"
              colors={colors}
            />
            <FeatureItem
              icon="analytics-outline"
              text="Smart scheduling based on your progress"
              colors={colors}
            />
            <FeatureItem
              icon="time-outline"
              text="10 minutes a day for lasting memory"
              colors={colors}
            />
          </Animated.View>

          {/* Spacer */}
          <View style={styles.spacer} />

          {/* CTA Section */}
          <Animated.View
            style={[
              styles.ctaContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Button
              title="Get Started"
              onPress={() => navigation.navigate("HowItWorks")}
              size="large"
            />

            <Pressable
              onPress={() => navigation.navigate("SignIn")}
              style={styles.signInContainer}
            >
              <Text style={[styles.signInText, { color: colors.textSecondary }]}>
                Already have an account?{" "}
              </Text>
              <Text style={[styles.signInLink, { color: colors.primary }]}>
                Sign In
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function FeatureItem({ 
  icon, 
  text, 
  colors 
}: { 
  icon: keyof typeof Ionicons.glyphMap; 
  text: string; 
  colors: any;
}) {
  return (
    <View style={styles.featureItem}>
      <View style={[styles.featureIcon, { backgroundColor: colors.primaryLight }]}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <Text style={[styles.featureText, { color: colors.text }]}>{text}</Text>
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
  logoContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 16,
  },
  headlineContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  headline: {
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  subheadline: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginTop: 12,
    paddingHorizontal: 16,
  },
  featuresContainer: {
    gap: 16,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    fontSize: 15,
    fontWeight: "500",
    flex: 1,
  },
  spacer: {
    flex: 1,
    minHeight: 40,
  },
  ctaContainer: {
    paddingBottom: 24,
  },
  signInContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    paddingVertical: 8,
  },
  signInText: {
    fontSize: 15,
  },
  signInLink: {
    fontSize: 15,
    fontWeight: "600",
  },
});
