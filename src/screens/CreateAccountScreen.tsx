import React, { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, KeyboardAvoidingView, Platform, ScrollView, Alert, StyleSheet, Animated, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { OnboardingStackParamList } from "../navigation/RootNavigator";
import { supabase } from "../lib/supabase";
import { GradientButton, GradientInput } from "../components/ui";
import { useTheme } from "../utils/useTheme";

type CreateAccountScreenProps = {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, "CreateAccount">;
};

export default function CreateAccountScreen({ navigation }: CreateAccountScreenProps) {
  const { colors, isDark } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
  }, []);

  const handleCreateAccount = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user }, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        Alert.alert("Error", error.message);
        return;
      }

      if (user && user.identities && user.identities.length === 0) {
        Alert.alert("Error", "This email is already registered. Please sign in instead.");
        return;
      }

      Alert.alert(
        "Check Your Email",
        "We've sent you a confirmation link. Please verify your email to continue.",
        [{ text: "OK", onPress: () => navigation.navigate("SignIn") }]
      );
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

  const openTerms = () => {
    Linking.openURL("https://example.com/terms");
  };

  const openPrivacy = () => {
    Linking.openURL("https://example.com/privacy");
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
                <Ionicons name="school" size={36} color="#ffffff" />
              </View>
              <Text style={[styles.welcomeText, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>
                Create your account
              </Text>
              <Text style={[styles.subtitle, { color: isDark ? "#94a3b8" : "#64748b" }]}>
                Start your smarter study journey today
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

              <View style={styles.inputGroup}>
                <GradientInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm password"
                  isPassword
                  icon="shield-checkmark-outline"
                  textContentType="oneTimeCode"
                  autoComplete="off"
                  autoCorrect={false}
                />
              </View>

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

              {/* Create Account Button */}
              <GradientButton
                title={isLoading ? "Creating Account..." : "Create Account"}
                onPress={handleCreateAccount}
                disabled={isLoading}
                size="large"
                style={styles.createButton}
              />

              {/* Terms and Privacy */}
              <Text style={[styles.termsText, { color: isDark ? "#64748b" : "#94a3b8" }]}>
                By creating an account, you agree to our{" "}
                <Text style={styles.termsLink} onPress={openTerms}>
                  Terms of Service
                </Text>{" "}
                and{" "}
                <Text style={styles.termsLink} onPress={openPrivacy}>
                  Privacy Policy
                </Text>
              </Text>
            </Animated.View>

            {/* Sign In Link */}
            <Animated.View
              style={[
                styles.footer,
                {
                  opacity: fadeAnim,
                },
              ]}
            >
              <Text style={[styles.footerText, { color: isDark ? "#94a3b8" : "#64748b" }]}>
                Already have an account?{" "}
              </Text>
              <Pressable onPress={() => navigation.navigate("SignIn")}>
                <Text style={styles.signInLink}>Sign In</Text>
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
    paddingTop: 16,
    paddingBottom: 40,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 28,
  },
  logoCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#667eea",
    alignItems: "center",
    justifyContent: "center",
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "800",
    marginTop: 16,
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    marginTop: 8,
    textAlign: "center",
  },
  formSection: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 14,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
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
    marginBottom: 20,
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
  createButton: {
    marginBottom: 16,
  },
  termsText: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
  termsLink: {
    color: "#667eea",
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  footerText: {
    fontSize: 15,
  },
  signInLink: {
    fontSize: 15,
    fontWeight: "700",
    color: "#667eea",
  },
});
