import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider } from './src/context/AuthContext';

// Error boundary to catch top-level errors
import { ErrorBoundary } from './src/components/ErrorBoundary';

// Lazy load heavy dependencies to prevent startup crashes
let Sentry: any = null;
let initAnalytics: any = null;

function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        // Initialize Sentry (lazy load)
        const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
        if (SENTRY_DSN && !__DEV__) {
          try {
            Sentry = require('@sentry/react-native');
            Sentry.init({
              dsn: SENTRY_DSN,
              tracesSampleRate: 0.5,
              enabled: true,
            });
          } catch (e) {
            console.log('[App] Sentry init skipped:', e);
          }
        }

        // Initialize Analytics (lazy load)
        const MIXPANEL_TOKEN = process.env.EXPO_PUBLIC_MIXPANEL_TOKEN;
        if (MIXPANEL_TOKEN) {
          try {
            const analytics = require('./src/services/analytics');
            initAnalytics = analytics.initAnalytics;
            await initAnalytics();
            analytics.trackEvent('App Opened');
          } catch (e) {
            console.log('[App] Analytics init skipped:', e);
          }
        }
      } catch (error) {
        // Never crash on initialization
        console.log('[App] Initialization error (non-fatal):', error);
      } finally {
        setIsReady(true);
      }
    };

    initialize();
  }, []);

  // Show nothing while initializing (prevents flash)
  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <SafeAreaProvider>
          <ActionSheetProvider>
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
          </ActionSheetProvider>
          <StatusBar style="auto" />
        </SafeAreaProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

// Export without Sentry.wrap to prevent crashes (Sentry is already initialized above)
export default App;