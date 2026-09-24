import { useEffect } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { ClerkProvider, ClerkLoaded, useAuth } from '@clerk/clerk-expo';
import { tokenCache } from '../src/auth/tokenCache';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from '../src/context/AppContext';
import api, { setAuthTokenGetter } from '../src/services/api';

const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

// Wake the Render backend on app launch so it's warm by the time the user needs it
api.health().then(() => { if (__DEV__) console.log('[app] Backend warm'); }).catch(() => {});

// Surfaces errors/success messages raised via showError/showSuccess anywhere in the app.
function Notifications() {
  const { state, clearNotification } = useApp();
  const { error, success } = state;

  useEffect(() => {
    if (!error && !success) return;
    Alert.alert(error ? 'Error' : 'Success', String(error || success));
    clearNotification();
  }, [error, success, clearNotification]);

  return null;
}

function AuthGate() {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Attach a fresh Clerk session token to every API request (covers users
  // who are already signed in on launch, not just fresh sign-ins). Registered
  // during render (idempotent) so it's in place before child screens' effects
  // run, e.g. the syncUser call in sign-in.jsx right after sign-in completes.
  setAuthTokenGetter(isSignedIn ? getToken : null);

  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === 'sign-in';

    if (!isSignedIn && !inAuthGroup) {
      router.replace('/sign-in');
    } else if (isSignedIn && inAuthGroup) {
      router.replace('/(drawer)');
    }
  }, [isSignedIn, isLoaded, segments]);

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F0E8' }}>
        <ActivityIndicator size="large" color="#E8820C" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ClerkProvider publishableKey={clerkPublishableKey} tokenCache={tokenCache}>
          <ClerkLoaded>
            <AppProvider>
              <StatusBar style="dark" backgroundColor="#F5F0E8" />
              <Notifications />
              <AuthGate />
            </AppProvider>
          </ClerkLoaded>
        </ClerkProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
