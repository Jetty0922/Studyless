import React, { useState } from "react";
import { View, Text, Pressable, TextInput, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../utils/useTheme";

type CreateAccountScreenProps = {
  navigation: any;
};

export default function CreateAccountScreen({ navigation }: CreateAccountScreenProps) {
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleCreateAccount = () => {
    // For now, just navigate to next screen
    // In production, this would call an authentication API
    navigation.navigate("QuickSetup");
  };

  const handleGoogleSignIn = () => {
    // OAuth flow would go here
    navigation.navigate("QuickSetup");
  };

  const handleAppleSignIn = () => {
    // OAuth flow would go here
    navigation.navigate("QuickSetup");
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
          <View className="flex-1 justify-center py-8">
            {/* Title */}
            <Text className="text-4xl font-bold text-center mb-2" style={{ color: colors.text }}>
              Create your account
            </Text>

            {/* Email Input */}
            <View className="mt-8 mb-4">
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                className="rounded-xl px-4 py-4 text-base"
                style={{ backgroundColor: colors.surface, color: colors.text }}
              />
            </View>

            {/* Password Input */}
            <View className="mb-4">
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                className="rounded-xl px-4 py-4 text-base"
                style={{ backgroundColor: colors.surface, color: colors.text }}
              />
            </View>

            {/* Confirm Password Input */}
            <View className="mb-6">
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm Password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                className="rounded-xl px-4 py-4 text-base"
                style={{ backgroundColor: colors.surface, color: colors.text }}
              />
            </View>

            {/* Divider */}
            <Text className="text-center mb-4" style={{ color: colors.textSecondary }}>Or continue with:</Text>

            {/* OAuth Buttons */}
            <View className="mb-4">
              <Pressable
                onPress={handleGoogleSignIn}
                className="rounded-xl py-4 mb-3 flex-row items-center justify-center"
                style={{ backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border }}
              >
                <Ionicons name="logo-google" size={20} color="#4285F4" />
                <Text className="text-base font-semibold ml-2" style={{ color: colors.text }}>
                  Google
                </Text>
              </Pressable>

              <Pressable
                onPress={handleAppleSignIn}
                className="bg-black rounded-xl py-4 flex-row items-center justify-center"
              >
                <Ionicons name="logo-apple" size={20} color="white" />
                <Text className="text-base font-semibold text-white ml-2">
                  Apple
                </Text>
              </Pressable>
            </View>

            {/* Create Account Button */}
            <Pressable
              onPress={handleCreateAccount}
              className="bg-blue-600 rounded-2xl py-5 mt-4"
            >
              <Text className="text-white text-xl font-bold text-center">
                Create Account
              </Text>
            </Pressable>

            {/* Sign In Link */}
            <View className="flex-row items-center justify-center mt-6">
              <Text className="text-base" style={{ color: colors.textSecondary }}>Already have account? </Text>
              <Pressable onPress={() => navigation.navigate("SignIn")}>
                <Text className="text-base font-semibold" style={{ color: colors.primary }}>Sign In</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
