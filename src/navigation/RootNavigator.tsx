import React from "react";
import { View, ActivityIndicator } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

// Import screens
import HomeScreen from "../screens/HomeScreen";
import DeckScreen from "../screens/DeckScreen";
import DeckSettingsScreen from "../screens/DeckSettingsScreen";
import DeckSelectionScreen from "../screens/DeckSelectionScreen";
import ReviewScreen from "../screens/ReviewScreen";
import OptionalReviewScreen from "../screens/OptionalReviewScreen";
import ProgressScreen from "../screens/ProgressScreen";
import SettingsScreen from "../screens/SettingsScreen";
import AccountSettingsScreen from "../screens/AccountSettingsScreen";
import DecksListScreen from "../screens/DecksListScreen";
import AdminDebugScreen from "../screens/AdminDebugScreen";
import { isAdmin } from "../config/admin";

// Import onboarding screens
import ValuePropScreen from "../screens/ValuePropScreen";
import HowItWorksScreen from "../screens/HowItWorksScreen";
import CreateAccountScreen from "../screens/CreateAccountScreen";
import SignInScreen from "../screens/SignInScreen";
import QuickSetupScreen from "../screens/QuickSetupScreen";
import NotificationsSetupScreen from "../screens/NotificationsSetupScreen";
import FirstActionScreen from "../screens/FirstActionScreen";
import CameraScreen from "../screens/CameraScreen";
import ProcessingScreen from "../screens/ProcessingScreen";
import CardsGeneratedScreen from "../screens/CardsGeneratedScreen";
import LogicSimulatorScreen from "../screens/LogicSimulatorScreenV2";

import { useFlashcardStore } from "../state/flashcardStore";
import { useTheme } from "../utils/useTheme";
import { useAuth } from "../context/AuthContext";

export type RootStackParamList = {
  OnboardingStack: undefined;
  MainTabs: undefined;
  Deck: { deckId: string };
  DeckSettings: { deckId: string };
  AccountSettings: undefined;
  AdminDebug: undefined;
  DeckSelection: {
    flashcards: { front: string; back: string }[];
    sourceUri?: string;
  };
  Review: { cards: string[] };
  OptionalReview: { deckId: string };
  LogicSimulator: undefined;
};

export type OnboardingStackParamList = {
  ValueProp: undefined;
  HowItWorks: undefined;
  CreateAccount: undefined;
  SignIn: undefined;
  QuickSetup: undefined;
  NotificationsSetup: undefined;
  FirstAction: undefined;
  CameraScreen: undefined;
  ProcessingScreen: { 
    photoUri?: string;
    fileUri?: string;
    type?: 'image' | 'pdf';
  };
  CardsGenerated: {
    sourceUri: string;
    cardCount: number;
    cards: { front: string; back: string }[];
    type: string;
  };
  MainTabs: undefined; // Used as transition
};

export type MainTabsParamList = {
  Home: undefined;
  Decks: undefined;
  Progress: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const OnboardingStack = createNativeStackNavigator<OnboardingStackParamList>();
const Tab = createBottomTabNavigator<MainTabsParamList>();

function OnboardingNavigator() {
  return (
    <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
      <OnboardingStack.Screen name="ValueProp" component={ValuePropScreen} />
      <OnboardingStack.Screen name="HowItWorks" component={HowItWorksScreen} />
      <OnboardingStack.Screen name="CreateAccount" component={CreateAccountScreen} />
      <OnboardingStack.Screen name="SignIn" component={SignInScreen} />
      <OnboardingStack.Screen name="QuickSetup" component={QuickSetupScreen} />
      <OnboardingStack.Screen name="NotificationsSetup" component={NotificationsSetupScreen} />
      <OnboardingStack.Screen name="FirstAction" component={FirstActionScreen} />
      <OnboardingStack.Screen name="CameraScreen" component={CameraScreen} />
      <OnboardingStack.Screen name="ProcessingScreen" component={ProcessingScreen} />
      <OnboardingStack.Screen name="CardsGenerated" component={CardsGeneratedScreen} />
      {/* MainTabs removed from here to avoid nesting issues */}
    </OnboardingStack.Navigator>
  );
}

function MainTabs() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = "help";

          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Decks") {
            iconName = focused ? "albums" : "albums-outline";
          } else if (route.name === "Progress") {
            iconName = focused ? "stats-chart" : "stats-chart-outline";
          } else if (route.name === "Settings") {
            iconName = focused ? "settings" : "settings-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: "Home" }}
      />
      <Tab.Screen
        name="Decks"
        component={DecksListScreen}
        options={{ title: "Decks" }}
      />
      <Tab.Screen
        name="Progress"
        component={ProgressScreen}
        options={{ title: "Progress" }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: "Settings" }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { isLoading, user } = useAuth();
  const hasCompletedOnboarding = useFlashcardStore((s) => s.hasCompletedOnboarding);
  const { colors } = useTheme();

  if (isLoading) {
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
            <ActivityIndicator size="large" color={colors.primary} />
        </View>
    );
  }

  const isAuthenticated = !!user || hasCompletedOnboarding;

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          color: colors.text,
        },
      }}
    >
      {isAuthenticated ? (
        <Stack.Group>
          <Stack.Screen
            name="MainTabs"
            component={MainTabs}
          />
          <Stack.Screen
            name="Deck"
            component={DeckScreen}
            options={{
              title: "Deck",
              headerShown: true,
              headerBackTitle: "Back",
            }}
          />
          <Stack.Screen
            name="DeckSettings"
            component={DeckSettingsScreen}
            options={{
              title: "Deck Settings",
              headerShown: true,
              headerBackTitle: "Back",
            }}
          />
          <Stack.Screen
            name="AccountSettings"
            component={AccountSettingsScreen}
            options={{
              title: "Account",
              headerShown: true,
              headerBackTitle: "Back",
            }}
          />
          {isAdmin(user?.email) && (
            <Stack.Screen
              name="AdminDebug"
              component={AdminDebugScreen}
              options={{
                title: "Admin Debug",
                headerShown: true,
                headerBackTitle: "Back",
              }}
            />
          )}
          <Stack.Screen
            name="DeckSelection"
            component={DeckSelectionScreen}
            options={{
              title: "Select Deck",
              headerShown: false,
              presentation: "modal",
            }}
          />
          <Stack.Screen
            name="Review"
            component={ReviewScreen}
            options={{
              title: "Review",
              headerShown: false,
              presentation: "fullScreenModal",
            }}
          />
          <Stack.Screen
            name="OptionalReview"
            component={OptionalReviewScreen}
            options={{
              title: "Optional Review",
              headerShown: false,
              presentation: "fullScreenModal",
            }}
          />
          <Stack.Screen
            name="LogicSimulator"
            component={LogicSimulatorScreen}
            options={{
              title: "Logic Simulator",
              headerShown: false,
            }}
          />
        </Stack.Group>
      ) : (
        <Stack.Screen
          name="OnboardingStack"
          component={OnboardingNavigator}
        />
      )}
    </Stack.Navigator>
  );
}
