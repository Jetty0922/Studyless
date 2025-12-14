import React, { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, KeyboardAvoidingView, Platform, ScrollView, Alert, StyleSheet, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { OnboardingStackParamList } from "../navigation/RootNavigator";
import { supabase } from "../lib/supabase";
import { GradientButton, GradientInput } from "../components/ui";
import { useTheme } from "../utils/useTheme";

type SignInScreenProps = {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, "SignIn">;
};

export default function SignInScreen({ navigation }: SignInScreenProps) {
  const { colors, isDark } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        Alert.alert("Error", error.message);
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    Alert.alert("Coming Soon", "Google Sign In will be available in a future update.");
  };

  const handleAppleSignIn = () => {
    Alert.alert("Coming Soon", "Apple Sign In will be available in a future update.");
  };

  const handleForgotPassword = () => {
    Alert.alert("Reset Password", "Password reset functionality coming soon.");
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
            {/* Logo and Header */}
            <Animated.View
              style={[
                styles.headerSection,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <View style={styles.logoCircle}>
                <Ionicons name="school" size={40} color="#ffffff" />
              </View>
              <Text style={[styles.appName, { color: isDark ? "#ffffff" : "#1e293b" }]}>
                Studyless
              </Text>
              <Text style={[styles.welcomeText, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>
                Welcome back
              </Text>
              <Text style={[styles.subtitle, { color: isDark ? "#94a3b8" : "#64748b" }]}>
                Sign in to continue your learning journey
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
                <GradientInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  icon="mail-outline"
                />
              </View>

              <View style={styles.inputGroup}>
                <GradientInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  isPassword
                  icon="lock-closed-outline"
                  textContentType="oneTimeCode"
                  autoComplete="off"
                  autoCorrect={false}
                />
              </View>

              {/* Forgot Password */}
              <Pressable onPress={handleForgotPassword} style={styles.forgotPassword}>
                <Text style={styles.forgotPasswordText}>Forgot password?</Text>
              </Pressable>

              {/* Sign In Button */}
              <GradientButton
                title={isLoading ? "Signing In..." : "Sign In"}
                onPress={handleSignIn}
                disabled={isLoading}
                size="large"
                style={styles.signInButton}
              />

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={[styles.dividerLine, { backgroundColor: isDark ? colors.border : "#e2e8f0" }]} />
                <Text style={[styles.dividerText, { color: isDark ? colors.textSecondary : "#64748b" }]}>
                  or continue with
                </Text>
                <View style={[styles.dividerLine, { backgroundColor: isDark ? colors.border : "#e2e8f0" }]} />
              </View>

              {/* OAuth Buttons */}
              <View style={styles.oauthContainer}>
                <Pressable
                  onPress={handleGoogleSignIn}
                  style={[
                    styles.oauthButton,
                    {
                      backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#ffffff",
                      borderColor: isDark ? "rgba(255,255,255,0.1)" : "#e2e8f0",
                    },
                  ]}
                >
                  <Ionicons name="logo-google" size={22} color="#4285F4" />
                  <Text style={[styles.oauthText, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>
                    Google
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleAppleSignIn}
                  style={[
                    styles.oauthButton,
                    {
                      backgroundColor: isDark ? "#ffffff" : "#000000",
                      borderColor: isDark ? "#ffffff" : "#000000",
                    },
                  ]}
                >
                  <Ionicons name="logo-apple" size={22} color={isDark ? "#000000" : "#ffffff"} />
                  <Text style={[styles.oauthText, { color: isDark ? "#000000" : "#ffffff" }]}>
                    Apple
                  </Text>
                </Pressable>
              </View>
            </Animated.View>

            {/* Sign Up Link */}
            <Animated.View
              style={[
                styles.footer,
                {
                  opacity: fadeAnim,
                },
              ]}
            >
              <Text style={[styles.footerText, { color: isDark ? "#94a3b8" : "#64748b" }]}>
                Don’t have an account?{" "}
              </Text>
              <Pressable onPress={() => navigation.navigate("CreateAccount")}>
                <Text style={styles.signUpLink}>Sign Up</Text>
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
    paddingTop: 20,
    paddingBottom: 40,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#667eea",
    alignItems: "center",
    justifyContent: "center",
  },
  appName: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: 12,
    letterSpacing: -0.5,
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: "800",
    marginTop: 24,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
  },
  formSection: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: "#667eea",
    fontSize: 14,
    fontWeight: "600",
  },
  signInButton: {
    marginBottom: 24,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
  },
  oauthContainer: {
    flexDirection: "row",
    gap: 12,
  },
  oauthButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 1.5,
    gap: 8,
  },
  oauthText: {
    fontSize: 15,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 32,
  },
  footerText: {
    fontSize: 15,
  },
  signUpLink: {
    fontSize: 15,
    fontWeight: "700",
    color: "#667eea",
  },
});
