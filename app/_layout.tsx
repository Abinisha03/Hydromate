import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { ClerkProvider, ClerkLoaded, useAuth, useUser } from '@clerk/clerk-expo';
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
  const { user } = useUser();
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useColorScheme();

  // Convex: store user and check if they have addresses
  const storeUser = useMutation(api.users.storeUser);
  const addresses = useQuery(
    api.addresses.getAddresses,
    isSignedIn ? {} : "skip"
  );

  const email = user?.primaryEmailAddress?.emailAddress;

  const hasPendingInvite = useQuery(
    api.invites.checkPendingInvite,
    (isSignedIn && email) ? { email } : "skip"
  );
  
  const convexUser = useQuery(
    api.users.getCurrentUser,
    isSignedIn ? {} : "skip"
  );

  const [hasStoredUser, setHasStoredUser] = useState(false);
  const [isReady, setIsReady] = useState(false);

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
    const inAdminGroup = segments[0] === '(admin)';
    const inStaffGroup = segments[0] === '(staff)';
    const inTabsGroup = segments[0] === '(tabs)';
    const onVerifyInvite = segments[0] === 'verify-invite';
    const isRoot = (segments as string[]).length === 0 || ((segments as string[]).length === 1 && segments[0] === 'index');

    const delay = isReady ? 0 : 800;
    const timer = setTimeout(() => {
      setIsReady(true);

      // ── 1. Not signed in → sign-in ──
      if (!isSignedIn) {
        if (!inAuthGroup) {
          router.replace('/(auth)/sign-in');
        }
        return;
      }

      // ── 2. Wait for convexUser to load (critical for role check) ──
      // undefined = query still loading, null = no user record yet (storeUser hasn't finished)
      if (convexUser === undefined || (convexUser === null && !hasStoredUser)) return;

      // ── 3. Determine role from DB (source of truth) ──
      const userRole = convexUser?.role || (email === 'abinishaa271@gmail.com' ? 'admin' : 'user');

      // ── 4. Admin → admin dashboard ──
      if (userRole === 'admin') {
        if (!inAdminGroup) {
          router.replace('/(admin)');
        }
        return;
      }

      // ── 5. Staff (already verified) → staff dashboard ──
      if (userRole === 'staff') {
        if (!inStaffGroup) {
          router.replace('/(staff)');
        }
        return;
      }

      // ── 6. Regular user flow ──
      // Only redirect when on auth/splash screens (don't interrupt if already in tabs)
      if (inAuthGroup || isRoot || onVerifyInvite) {
        // Wait for invite check to load
        if (hasPendingInvite === undefined) return;

        // Has a pending staff invite → show verify-invite page
        if (hasPendingInvite === true) {
          if (!onVerifyInvite) {
            router.replace('/verify-invite');
          }
          return;
        }

        // No pending invite → regular user, go to tabs or checkout
        if (hasStoredUser && addresses !== undefined) {
          if (Array.isArray(addresses) && addresses.length === 0) {
            router.replace('/checkout');
          } else {
            router.replace('/(tabs)');
          }
        }
        // If addresses still loading, wait...
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [isLoaded, isSignedIn, segments, hasStoredUser, addresses, convexUser, hasPendingInvite]);

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
        <Stack.Screen name="(admin)" options={{ headerShown: false }} />
        <Stack.Screen name="(staff)" options={{ headerShown: false }} />
        <Stack.Screen name="verify-invite" options={{ headerShown: false }} />
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
