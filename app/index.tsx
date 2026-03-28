import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

// This is just a splash screen.
// The root layout's auth guard handles all navigation.
export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.logoCircle}>
        <FontAwesome5 name="water" size={48} color="#FFFFFF" />
      </View>
      <Text style={styles.title}>HYDROMATE</Text>
      <Text style={styles.subtitle}>Pure Care. Pure Hydration.</Text>
      <ActivityIndicator size="large" color="#2EC4B6" style={{ marginTop: 32 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8FFF9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#2EC4B6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    elevation: 6,
    shadowColor: '#2EC4B6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0F9D8A',
    letterSpacing: 3,
  },
  subtitle: {
    fontSize: 12,
    color: '#2EC4B6',
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 4,
    textTransform: 'uppercase',
  },
});
