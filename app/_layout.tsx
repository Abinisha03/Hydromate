import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { ClerkProvider, ClerkLoaded, useAuth } from '@clerk/clerk-expo';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { ConvexReactClient } from 'convex/react';
import { tokenCache } from '@/utils/cache';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;
const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL!;

if (!publishableKey) {
  throw new Error('Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in .env');
}

if (!convexUrl) {
  throw new Error('Missing EXPO_PUBLIC_CONVEX_URL in .env');
}

const convex = new ConvexReactClient(convexUrl);

// Auth guard that handles routing based on Clerk auth state
function InitialLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';

    // Small delay on first load to show splash
    const delay = isReady ? 0 : 800;
    const timer = setTimeout(() => {
      setIsReady(true);
      if (isSignedIn && inAuthGroup) {
        // Signed in but on auth screen -> go to tabs
        router.replace('/(tabs)');
      } else if (!isSignedIn && !inAuthGroup) {
        // Not signed in and not on auth screen -> go to sign-in
        router.replace('/(auth)/sign-in');
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [isLoaded, isSignedIn, segments]);

  // Show loading splash while Clerk is initializing
  if (!isLoaded || !isReady) {
    return (
      <View style={loadingStyles.container}>
        <Text style={loadingStyles.brandTitle}>HYDROMATE</Text>
        <Text style={loadingStyles.brandSlogan}>Pure Care. Pure Hydration.</Text>
        <ActivityIndicator size="large" color="#2EC4B6" style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="checkout" options={{ presentation: 'modal', title: 'Complete Order' }} />
        <Stack.Screen name="book-water" options={{ title: 'Book Water' }} />
        <Stack.Screen name="payment" options={{ presentation: 'modal', title: 'Payment Options' }} />
        <Stack.Screen name="order-details" options={{ title: 'Order Details' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <InitialLayout />
        </ConvexProviderWithClerk>
      </ClerkLoaded>
    </ClerkProvider>
  );
}

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8FFF9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F9D8A',
    letterSpacing: 3,
  },
  brandSlogan: {
    fontSize: 12,
    color: '#2EC4B6',
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 4,
    textTransform: 'uppercase',
  },
});
