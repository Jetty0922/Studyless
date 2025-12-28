import React, { useState, useRef, useEffect } from "react";
import { 
  View, 
  Text, 
  Pressable, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView, 
  Alert, 
  StyleSheet, 
  Animated,
  Linking,
  Image
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { OnboardingStackParamList } from "../navigation/RootNavigator";
import { supabase } from "../lib/supabase";
import { Button, Input } from "../components/ui";
import { useTheme } from "../utils/useTheme";
import { trackUserSignedUp, identifyUser } from "../services/analytics";

type AuthScreenProps = {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, "CreateAccount">;
};

type AuthMode = "signin" | "signup";

export default function AuthScreen({ navigation }: AuthScreenProps) {
  const { colors, isDark } = useTheme();
  const [mode, setMode] = useState<AuthMode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleSignUp = async () => {
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
        setMode("signin");
        return;
      }

      if (user) {
        trackUserSignedUp('email');
        identifyUser(user.id);
      }

      Alert.alert(
        "Check Your Email",
        "We've sent you a confirmation link. Please verify your email to continue.",
        [{ text: "OK" }]
      );
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleSubmit = () => {
    if (mode === "signup") {
      handleSignUp();
    } else {
      handleSignIn();
    }
  };

  const handleForgotPassword = async () => {
    if (!email || !email.trim()) {
      Alert.alert("Enter Email", "Please enter your email address first, then tap 'Forgot password?'");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'studyless://reset-password',
      });

      if (error) {
        throw error;
      }

      Alert.alert(
        "Check Your Email",
        "We've sent you a password reset link. Please check your email and follow the instructions to reset your password.",
        [{ text: "OK" }]
      );
    } catch (error: any) {
      // Don't reveal if email exists or not for security
      if (error.message?.includes('rate limit')) {
        Alert.alert("Too Many Requests", "Please wait a few minutes before requesting another reset link.");
      } else {
        Alert.alert(
          "Check Your Email", 
          "If an account exists with this email, you'll receive a password reset link."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const openTerms = () => {
    Linking.openURL("https://raw.githubusercontent.com/Jetty0922/studyless-legal/main/TERMS_OF_SERVICE.md");
  };

  const openPrivacy = () => {
    Linking.openURL("https://raw.githubusercontent.com/Jetty0922/studyless-legal/main/PRIVACY_POLICY.md");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
            <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
              <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color={colors.text} />
              </Pressable>
            </Animated.View>

            {/* Logo */}
            <Animated.View style={[styles.logoContainer, { opacity: fadeAnim }]}>
              <Image 
                source={require('../../assets/icon.png')} 
                style={styles.logo} 
                resizeMode="contain" 
              />
              <Text style={[styles.title, { color: colors.text }]}>
                {mode === "signup" ? "Create Account" : "Welcome Back"}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {mode === "signup" 
                  ? "Start your smarter study journey" 
                  : "Sign in to continue learning"}
              </Text>
            </Animated.View>

            {/* Tab Switcher */}
            <Animated.View style={[styles.tabContainer, { opacity: fadeAnim }]}>
              <View style={[styles.tabBackground, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Pressable
                  onPress={() => setMode("signup")}
                  style={[
                    styles.tab,
                    mode === "signup" && { backgroundColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      { color: mode === "signup" ? "#FFFFFF" : colors.textSecondary },
                    ]}
                  >
                    Sign Up
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setMode("signin")}
                  style={[
                    styles.tab,
                    mode === "signin" && { backgroundColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      { color: mode === "signin" ? "#FFFFFF" : colors.textSecondary },
                    ]}
                  >
                    Sign In
                  </Text>
                </Pressable>
              </View>
            </Animated.View>

            {/* Form */}
            <Animated.View style={[styles.form, { opacity: fadeAnim }]}>
              <Input
                value={email}
                onChangeText={setEmail}
                placeholder="Email address"
                keyboardType="email-address"
                autoCapitalize="none"
                icon="mail-outline"
              />

              <Input
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                isPassword
                icon="lock-closed-outline"
                textContentType="oneTimeCode"
                autoComplete="off"
                autoCorrect={false}
              />

              {mode === "signup" && (
                <Input
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm password"
                  isPassword
                  icon="shield-checkmark-outline"
                  textContentType="oneTimeCode"
                  autoComplete="off"
                  autoCorrect={false}
                />
              )}

              {mode === "signin" && (
                <Pressable onPress={handleForgotPassword} style={styles.forgotPassword}>
                  <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>
                    Forgot password?
                  </Text>
                </Pressable>
              )}

              <View style={styles.buttonContainer}>
                <Button
                  title={isLoading 
                    ? (mode === "signup" ? "Creating Account..." : "Signing In...") 
                    : (mode === "signup" ? "Create Account" : "Sign In")
                  }
                  onPress={handleSubmit}
                  disabled={isLoading}
                  loading={isLoading}
                  size="large"
                />
              </View>

              {mode === "signup" && (
                <Text style={[styles.termsText, { color: colors.textSecondary }]}>
                  By creating an account, you agree to our{" "}
                  <Text style={[styles.termsLink, { color: colors.primary }]} onPress={openTerms}>
                    Terms of Service
                  </Text>{" "}
                  and{" "}
                  <Text style={[styles.termsLink, { color: colors.primary }]} onPress={openPrivacy}>
                    Privacy Policy
                  </Text>
                </Text>
              )}
            </Animated.View>

            {/* OAuth Divider */}
            <Animated.View style={[styles.dividerContainer, { opacity: fadeAnim }]}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textSecondary }]}>
                or continue with
              </Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </Animated.View>

            {/* OAuth Buttons */}
            <Animated.View style={[styles.oauthContainer, { opacity: fadeAnim }]}>
              <Pressable
                onPress={() => Alert.alert("Coming Soon", "Google Sign In will be available in a future update.")}
                style={[styles.oauthButton, { borderColor: colors.border }]}
              >
                <Ionicons name="logo-google" size={20} color="#4285F4" />
                <Text style={[styles.oauthText, { color: colors.text }]}>Google</Text>
              </Pressable>

              <Pressable
                onPress={() => Alert.alert("Coming Soon", "Apple Sign In will be available in a future update.")}
                style={[styles.oauthButton, { backgroundColor: isDark ? "#FFFFFF" : "#000000", borderColor: isDark ? "#FFFFFF" : "#000000" }]}
              >
                <Ionicons name="logo-apple" size={20} color={isDark ? "#000000" : "#FFFFFF"} />
                <Text style={[styles.oauthText, { color: isDark ? "#000000" : "#FFFFFF" }]}>Apple</Text>
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
    paddingBottom: 40,
  },
  header: {
    height: 56,
    justifyContent: "center",
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 14,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
  },
  tabContainer: {
    marginBottom: 24,
  },
  tabBackground: {
    flexDirection: "row",
    borderRadius: 8,
    padding: 4,
    borderWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  form: {
    marginBottom: 24,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginTop: -8,
    marginBottom: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: "500",
  },
  buttonContainer: {
    marginTop: 8,
  },
  termsText: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    marginTop: 16,
  },
  termsLink: {
    fontWeight: "600",
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
    fontSize: 13,
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
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  oauthText: {
    fontSize: 14,
    fontWeight: "600",
  },
});

