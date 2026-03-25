import React from 'react';
import { StyleSheet, View, Text, SafeAreaView, ScrollView, StatusBar } from 'react-native';
import { Stack } from 'expo-router';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

const COLORS = {
  primary: '#2EC4B6',
  secondary: '#0F9D8A',
  accent: '#E8FFF9',
  text: '#1B3A3A',
  white: '#FFFFFF',
};

export default function TermsScreen() {
  const sections = [
    {
      title: 'Hydration Quality Promise',
      content: 'HYDROMATE provides premium demineralized water. We guarantee that every drop meets our strict wellness standards for purity and health-centric mineral balance.',
      icon: 'verified'
    },
    {
      title: 'Seamless Delivery Ecosystem',
      content: 'Our delivery partners are committed to timely distribution. Orders placed before 6 PM are fulfilled within the same cycle. Specific delivery windows may vary based on your wellness route.',
      icon: 'local-shipping'
    },
    {
      title: 'Circular Bottle System',
      content: 'To sustain our environment, we use a circular exchange system. Customers must return a clean, undamaged HYDROMATE can of the same size. If no bottle is available, a deposit of ₹200 applies.',
      icon: 'eco'
    },
    {
      title: 'Wellness Pricing',
      content: 'Standard pricing is ₹50 per 20L can. We reserve the right to adjust pricing based on sourcing health-grade resources or logistics. All taxes are inclusive.',
      icon: 'payments'
    },
    {
      title: 'Data Sovereignty',
      content: 'Your health and location data are encrypted. We only use your information to facilitate hydration delivery and wellness rewards. We never share data with third-party aggregators.',
      icon: 'security'
    }
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} />
      <Stack.Screen 
        options={{ 
          title: 'Wellness Guidelines', 
          headerTintColor: '#fff', 
          headerStyle: { backgroundColor: COLORS.secondary },
          headerTitleStyle: { fontWeight: '900' }
        }} 
      />
      
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
           <FontAwesome5 name="balance-scale-left" size={50} color={COLORS.secondary} />
           <Text style={styles.headerTitle}>Terms of Service</Text>
           <Text style={styles.headerSubtitle}>Last updated: March 2026</Text>
        </View>

        {sections.map((section, index) => (
          <View key={index} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconBox}>
                <MaterialIcons name={section.icon as any} size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.cardTitle}>{section.title}</Text>
            </View>
            <Text style={styles.cardContent}>{section.content}</Text>
          </View>
        ))}

        <View style={styles.footerBox}>
           <Text style={styles.footerText}>
             By using HYDROMATE, you agree to prioritize your hydration and respect our community standards. Stay healthy!
           </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.accent,
  },
  container: {
    padding: 24,
  },
  header: {
     alignItems: 'center',
     marginBottom: 40,
     marginTop: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.secondary,
    marginTop: 15,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 32,
    padding: 24,
    marginBottom: 20,
    elevation: 3,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    borderWidth: 1.5,
    borderColor: '#F8FAFC',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.secondary,
  },
  cardContent: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 24,
    opacity: 0.7,
  },
  footerBox: {
     marginTop: 20,
     padding: 24,
     backgroundColor: 'rgba(15, 157, 138, 0.05)',
     borderRadius: 24,
     marginBottom: 40,
  },
  footerText: {
     fontSize: 13,
     color: COLORS.secondary,
     fontStyle: 'italic',
     textAlign: 'center',
     fontWeight: '500',
  },
});
