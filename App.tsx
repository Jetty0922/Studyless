import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { NavigationContainer } from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { initAnalytics } from './src/services/analytics';

// Error boundary to catch top-level errors
import { ErrorBoundary } from './src/components/ErrorBoundary';

// Initialize Sentry for crash reporting
// Get your DSN from: https://sentry.io → Settings → Client Keys (DSN)
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    // Enable performance monitoring
    tracesSampleRate: 1.0,
    // Only send errors in production
    enabled: !__DEV__,
    // Attach user info for debugging (without PII)
    beforeSend(event) {
      // Don't send events in development
      if (__DEV__) {
        return null;
      }
      return event;
    },
  });
}

function App() {
  // Initialize analytics on app start
  useEffect(() => {
    initAnalytics();
  }, []);

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

// Wrap with Sentry for automatic error boundary
export default Sentry.wrap(App);

// Force Rebuild v6 - Revert to AsyncStorage
