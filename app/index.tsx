import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useConvexAuth, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

export default function SplashScreen() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const router = useRouter();
  const addresses = useQuery(api.addresses.getAddresses, isAuthenticated ? {} : "skip");

  useEffect(() => {
    if (isLoading) return;
    
    // If authenticated, we MUST wait for addresses to be non-undefined and non-null
    if (isAuthenticated && (addresses === undefined || addresses === null)) return;

    // Small delay for the splash screen to be visible
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        if (Array.isArray(addresses) && addresses.length === 0) {
          router.replace('/(tabs)/profile');
        } else {
          router.replace('/(tabs)');
        }
      } else {
        router.replace('/(auth)/sign-in');
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [isLoading, isAuthenticated, addresses, router]);

  return (
    <View style={styles.container}>
      <Ionicons name="water" size={120} color="#0096FF" style={styles.logo} />
      <Text style={styles.title}>Hydromate</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E6F4FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    marginBottom: 20,
    shadowColor: '#0096FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#005BBB',
    letterSpacing: 1.5,
  },
});
