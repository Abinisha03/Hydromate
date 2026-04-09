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

    // ── 1. SPLASH: Check if user is logged in (Clerk) ──
    if (!isSignedIn) {
      // Not logged in → Force Login Screen
      if (!inAuthGroup) {
        router.replace('/(auth)/sign-in');
      }
      // Wait for router to stabilize at sign-in before clearing splash
      const timer = setTimeout(() => setIsReady(true), 100);
      return () => clearTimeout(timer);
    }

    // ── 2. LOGGED IN: Wait for Data & Role (Convex) ──
    // We stay on the Splash screen (isReady = false) until these are loaded
    if (convexUser === undefined || hasPendingInvite === undefined || !hasStoredUser) return;

    // ── 3. ROLE-BASED NAVIGATION ──
    const userRole = convexUser?.role || (email === 'abinishaa271@gmail.com' ? 'admin' : 'member');

    // CASE A: ADMIN (Verified Admin Role or Admin Email)
    if (userRole === 'admin' || email === 'abinishaa271@gmail.com') {
      if (!inAdminGroup) {
        router.replace('/(admin)');
      }
      setIsReady(true);
      return;
    }

    // CASE B: EXISTING STAFF (Verified Role)
    if (userRole === 'staff') {
      if (!inStaffGroup) {
        router.replace('/(staff)');
      }
      setIsReady(true);
      return;
    }

    // CASE C: NEW STAFF (Pending invite check for regular members)
    if (hasPendingInvite === true && userRole === 'member') {
      // FORCE them to verify-invite screen
      if (!onVerifyInvite) {
        router.replace('/verify-invite');
      }
      setIsReady(true);
      return;
    }

    // CASE D: NORMAL USER (No invite, Role is member)
    if (inAuthGroup || isRoot || onVerifyInvite) {
      router.replace('/(tabs)');
    } else if (segments[0] === '(admin)' || segments[0] === '(staff)') {
      // Safety: Prevent regular users from staying on admin/staff routes
      router.replace('/(tabs)');
    }
    
    setIsReady(true);
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
