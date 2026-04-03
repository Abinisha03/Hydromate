import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { ClerkProvider, ClerkLoaded, useAuth } from '@clerk/clerk-expo';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { ConvexReactClient, useMutation, useQuery } from 'convex/react';
import { tokenCache } from '@/utils/cache';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { api } from '@/convex/_generated/api';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;
const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL!;

if (!publishableKey) {
  throw new Error('Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in .env');
}

if (!convexUrl) {
  throw new Error('Missing EXPO_PUBLIC_CONVEX_URL in .env');
}

const convex = new ConvexReactClient(convexUrl);

// Auth guard that handles routing and user sync
function InitialLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useColorScheme();

  // Convex: store user and check if they have addresses
  const storeUser = useMutation(api.users.storeUser);
  const addresses = useQuery(
    api.addresses.getAddresses,
    isSignedIn ? {} : "skip"
  );

  const [hasStoredUser, setHasStoredUser] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Store user in Convex when they sign in
  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setHasStoredUser(false);
      return;
    }

    const syncUser = async () => {
      try {
        await storeUser();
        setHasStoredUser(true);
      } catch (e) {
        console.error("Failed to store user:", e);
        // Still let them through — storeUser might fail on first render before token syncs
        setHasStoredUser(true);
      }
    };

    syncUser();
  }, [isLoaded, isSignedIn]);

  // Auth-based routing
  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';

    const delay = isReady ? 0 : 800;
    const timer = setTimeout(() => {
      setIsReady(true);

      const isRoot = (segments as string[]).length === 0 || ((segments as string[]).length === 1 && segments[0] === 'index');

      if (!isSignedIn && !inAuthGroup) {
        // Not signed in → send to sign-in
        router.replace('/(auth)/sign-in');
      } else if (isSignedIn && (inAuthGroup || isRoot)) {
        // Signed in but still on auth screen or splash screen → check if new user
        if (hasStoredUser && addresses !== undefined) {
          if (Array.isArray(addresses) && addresses.length === 0) {
            // New user with no addresses → address page
            router.replace('/checkout');
          } else {
            router.replace('/(tabs)');
          }
        }
        // If addresses are loading, we don't redirect yet.
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [isLoaded, isSignedIn, segments, hasStoredUser, addresses]);

  // Loading screen while Clerk initializes
  if (!isLoaded || !isReady) {
    return (
      <View style={loadingStyles.container}>
        <Image 
          source={require('@/assets/images/logo.png')} 
          style={loadingStyles.logo}
          contentFit="contain"
        />
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
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
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
