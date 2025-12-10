import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider } from './src/context/AuthContext';

// Error boundary to catch top-level errors
import { ErrorBoundary } from './src/components/ErrorBoundary';

export default function App() {
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

// Force Rebuild v6 - Revert to AsyncStorage
