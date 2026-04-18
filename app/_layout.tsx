import { api } from '@/convex/_generated/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { tokenCache } from '@/utils/cache';
import { ClerkLoaded, ClerkProvider, useAuth, useUser } from '@clerk/clerk-expo';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { ConvexReactClient, useMutation, useQuery } from 'convex/react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { Image } from 'expo-image';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, LogBox } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';

// Prevent splash screen from hiding automatically
SplashScreen.preventAutoHideAsync().catch(() => {});

// Ignore specific logs that might clutter initialization
LogBox.ignoreLogs(['Clerk: Clerk has been loaded with more than one publishable key']);

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;
const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL!;

// DEBUG: Check which Clerk key is being used
console.log('--- CLERK AUTH DEBUG ---');
console.log('FULL CLERK KEY:', publishableKey);
console.log('------------------------');

// Session-level flag to allow skipping address setup until app restart
let sessionSkipAddress = false;

export const skipAddressSetup = () => {
  sessionSkipAddress = true;
};

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
  const [initialized, setInitialized] = useState(false);


  // Safety timeout: Force app forward after 2.5 seconds regardless of Convex status
  useEffect(() => {
    console.log('[Layout] Auth State Change:', { isLoaded, isSignedIn });
    
    // Safety: don't let the app stay stuck forever
    const timer = setTimeout(() => {
      console.log('[Layout] ⚠️ Initialization taking too long, forcing entry...');
      setInitialized(true);
      setIsReady(true); // Emergency skip
    }, 3000);

    if (!isSignedIn && isLoaded) {
      setInitialized(true);
      clearTimeout(timer);
      return;
    }

    const timeout = setTimeout(() => {
      console.log('[Layout] ✅ Safety Timeout: Proceeding...');
      setInitialized(true);
    }, 2000);

    return () => {
      clearTimeout(timer);
      clearTimeout(timeout);
    };
  }, [isLoaded, isSignedIn]);


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
        setHasStoredUser(true);
      }
    };

    syncUser();
  }, [isLoaded, isSignedIn, storeUser]);

  // Auth-based routing
  useEffect(() => {
    if (!isLoaded) return;

    try {
      // ── 1. SEGMENTS SAFETY ──
      const safeSegments = segments || [];
      const inAuthGroup = safeSegments[0] === '(auth)';
      const inAdminGroup = safeSegments[0] === '(admin)';
      const inStaffGroup = safeSegments[0] === '(staff)';
      const onVerifyInvite = safeSegments[0] === 'verify-invite';
      const onHomePage = safeSegments[0] === 'home';
      const isRoot = safeSegments.length === 0 || (safeSegments.length === 1 && safeSegments[0] === 'index');

      // ── 2. NOT SIGNED IN ──
      if (!isSignedIn) {
        if (!inAuthGroup && !onHomePage) {
          console.log('[Layout] Not signed in, replacing to /home');
          router.replace('/home');
        }
        const timer = setTimeout(() => setIsReady(true), 100);
        return () => clearTimeout(timer);
      }

      // ── 3. SIGNED IN: Wait for Convex data (with fallback) ──
      const convexLoaded = convexUser !== undefined && hasPendingInvite !== undefined && hasStoredUser;
      
      // FORCE BYPASS: If we've been waiting too long, just go to the home page or tabs
      if (!initialized && !convexLoaded) {
        return;
      }
      
      // Safety: Ensure we have a role before deciding
      const userRole = convexUser?.role || (email === 'abinishaa271@gmail.com' ? 'admin' : 'member');
      console.log('[Layout] Routing check:', { userRole, segment: safeSegments[0], isRoot });



      // CASE A: ADMIN
      if (userRole === 'admin' || email === 'abinishaa271@gmail.com') {
        if (!inAdminGroup && !onHomePage) {
          router.replace('/(admin)');
        }
        setIsReady(true);
        return;
      }

      // CASE B: EXISTING STAFF
      if (userRole === 'staff') {
        if (!inStaffGroup && !onHomePage) {
          router.replace('/(staff)');
        }
        setIsReady(true);
        return;
      }

      // CASE C: PENDING STAFF INVITE
      if (hasPendingInvite === true && userRole === 'member') {
        if (!onVerifyInvite) {
          router.replace('/verify-invite');
        }
        setIsReady(true);
        return;
      }

      // CASE D: NORMAL USER
      if (userRole === 'member' || userRole === 'user') {
        if (addresses && addresses.length === 0 && !sessionSkipAddress && !initialized) {
          if (safeSegments[0] !== 'add-address') {
            router.replace('/add-address');
            return;
          }
          setIsReady(true);
          return;
        }

        if (isRoot || inAuthGroup || onVerifyInvite || onHomePage) {
          console.log('[Layout] Member/User routing to tabs');
          router.replace('/(tabs)');
        }
      }

      setIsReady(true);
    } catch (err) {
      console.error('[Layout] Routing Error:', err);
      setIsReady(true);
    }
  }, [isLoaded, isSignedIn, segments, hasStoredUser, addresses, convexUser, hasPendingInvite, email, router, initialized]);

  // Handle Splash Screen hiding
  useEffect(() => {
    const checkReady = async () => {
      // Force hide if initialized takes too long
      if ((isReady && isLoaded) || initialized) {
        try {
          console.log('[Layout] 🚀 Dismissing Launch Screens');
          await SplashScreen.hideAsync();
          if (!isReady && initialized) setIsReady(true);
        } catch (e) {
          console.warn('Splash hide failed:', e);
        }
      }
    };
    checkReady();
  }, [isReady, isLoaded, initialized]);

  // Loading screen while Clerk initializes
  if (!isLoaded || !isReady) {
    return (
      <View style={loadingStyles.container}>
        {/* Background Motifs */}
        <View style={{ position: 'absolute', top: -100, left: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: '#2EC4B6', opacity: 0.05, zIndex: -1 }} />
        <View style={{ position: 'absolute', bottom: -50, right: -80, width: 250, height: 250, borderRadius: 125, backgroundColor: '#0F9D8A', opacity: 0.05, zIndex: -1 }} />

        <View style={loadingStyles.logoContainer}>
          <Image
            source={require('@/assets/images/logo.png')}
            style={loadingStyles.logo}
            contentFit="contain"
          />
        </View>
        <Text style={loadingStyles.brandTitle}>HYDROMATE</Text>
        <Text style={loadingStyles.brandSlogan}>Pure Care. Pure Hydration.</Text>
        
        <View style={loadingStyles.footer}>
          <ActivityIndicator size="small" color="#2EC4B6" />
          <Text style={loadingStyles.loadingText}>Initializing Wellness...</Text>
        </View>
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="home" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(admin)" options={{ headerShown: false }} />
        <Stack.Screen name="(staff)" options={{ headerShown: false }} />
        <Stack.Screen name="verify-invite" options={{ headerShown: false }} />
        <Stack.Screen name="add-address" options={{ headerShown: false }} />
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
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: 140,
    height: 140,
    borderRadius: 40,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F9D8A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    marginBottom: 24,
  },
  logo: {
    width: 100,
    height: 100,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0F9D8A',
    letterSpacing: 4,
  },
  brandSlogan: {
    fontSize: 12,
    color: '#2EC4B6',
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: 6,
    textTransform: 'uppercase',
  },
  footer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
