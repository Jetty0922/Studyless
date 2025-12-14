import React, { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, Alert, StyleSheet, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { OnboardingStackParamList } from "../navigation/RootNavigator";
import { supabase } from "../lib/supabase";
import { GradientButton } from "../components/ui";
import { useTheme } from "../utils/useTheme";

type NotificationsSetupScreenProps = {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, "NotificationsSetup">;
};

export default function NotificationsSetupScreen({ navigation }: NotificationsSetupScreenProps) {
  const { isDark } = useTheme();
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

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    try {
      if (!Device.isDevice) {
        Alert.alert(
          "Simulator Detected", 
          "Push notifications will work on physical devices. You can set up reminders in Settings later.",
          [{ text: "OK", onPress: () => navigation.navigate("FirstAction") }]
        );
        setIsLoading(false);
        return;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        Alert.alert("Permission required", "Please enable notifications in settings to get reminders.");
        navigation.navigate("FirstAction");
        return;
      }

      const token = (await Notifications.getExpoPushTokenAsync()).data;
      
      // Save token to Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({ push_token: token }).eq('id', user.id);
      }

      Alert.alert("Success", "Notifications enabled!");
      navigation.navigate("FirstAction");
    } catch (error) {
      console.error("Notification error:", error);
      navigation.navigate("FirstAction");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    navigation.navigate("FirstAction");
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
            <View style={[styles.iconCircle, { backgroundColor: isDark ? "rgba(240, 147, 251, 0.2)" : "rgba(240, 147, 251, 0.15)" }]}>
              <Ionicons name="notifications" size={70} color="#f093fb" />
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
              Never miss a review
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
              We’ll send you a gentle reminder when your cards are due. 
              Just 10 minutes a day keeps the knowledge in!
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
              title={isLoading ? "Enabling..." : "Enable Notifications"}
              onPress={handleEnableNotifications}
              disabled={isLoading}
              size="large"
              style={styles.button}
            />

            <Pressable onPress={handleSkip} style={styles.skipButton}>
              <Text style={[styles.skipText, { color: isDark ? "#64748b" : "#94a3b8" }]}>
                Skip for now
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
    borderColor: "rgba(240, 147, 251, 0.3)",
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
  skipButton: {
    marginTop: 20,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 15,
    fontWeight: "500",
  },
});
