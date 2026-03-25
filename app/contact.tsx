import React from 'react';
import { StyleSheet, View, Text, SafeAreaView, TouchableOpacity, ScrollView, Linking, StatusBar } from 'react-native';
import { MaterialIcons, FontAwesome5, FontAwesome } from '@expo/vector-icons';
import { Stack } from 'expo-router';

const COLORS = {
  primary: '#2EC4B6',
  secondary: '#0F9D8A',
  accent: '#E8FFF9',
  text: '#1B3A3A',
  white: '#FFFFFF',
  gray: '#718096',
};

export default function ContactUsScreen() {
  const contactOptions = [
    {
      title: 'Voice Call',
      value: '+91 84380 05206',
      icon: 'call',
      action: () => Linking.openURL('tel:+918438005206'),
      color: COLORS.secondary
    },
    {
      title: 'WhatsApp Support',
      value: 'Start Wellness Chat',
      icon: 'whatsapp',
      isBrand: true,
      action: () => Linking.openURL('whatsapp://send?phone=+918438005206&text=Hello Hydromate! I need assistance.'),
      color: '#25D366'
    },
    {
      title: 'Official Email',
      value: 'wellness@hydromate.app',
      icon: 'email',
      action: () => Linking.openURL('mailto:wellness@hydromate.app'),
      color: COLORS.primary
    }
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} />
      <Stack.Screen 
        options={{ 
          title: 'Wellness Support', 
          headerTintColor: '#fff', 
          headerStyle: { backgroundColor: COLORS.secondary },
          headerTitleStyle: { fontWeight: '900' }
        }} 
      />
      
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerBox}>
           <View style={styles.leafCircle}>
              <FontAwesome5 name="seedling" size={40} color={COLORS.white} />
           </View>
           <Text style={styles.headerTitle}>We're here to help.</Text>
           <Text style={styles.headerSubtitle}>Our hydration experts are available 24/7 to assist with your orders or concerns.</Text>
        </View>

        {contactOptions.map((option, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.contactCard}
            onPress={option.action}
          >
            <View style={[styles.iconBox, { backgroundColor: option.color + '15' }]}>
              {option.isBrand ? (
                <FontAwesome name={option.icon as any} size={24} color={option.color} />
              ) : (
                <MaterialIcons name={option.icon as any} size={24} color={option.color} />
              )}
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.optionTitle}>{option.title}</Text>
              <Text style={styles.optionValue}>{option.value}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={COLORS.accent} />
          </TouchableOpacity>
        ))}

        <View style={styles.addressSection}>
          <Text style={styles.sectionTitle}>Global HQ</Text>
          <View style={styles.addressCard}>
             <MaterialIcons name="location-pin" size={24} color={COLORS.primary} style={{ marginRight: 15 }} />
             <View style={{ flex: 1 }}>
                <Text style={styles.addressName}>HYDROMATE Wellness Solutions</Text>
                <Text style={styles.addressText}>8/218A, CSI Church Street, Duraiyoor, Gangaikondan, Tirunelveli - 627352</Text>
             </View>
          </View>
        </View>

        <View style={styles.footer}>
           <Text style={styles.footerText}>HYDROMATE is a registered trademark of Pure Hydration Ltd.</Text>
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
  headerBox: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 10,
  },
  leafCircle: {
     width: 100,
     height: 100,
     borderRadius: 36,
     backgroundColor: COLORS.secondary,
     justifyContent: 'center',
     alignItems: 'center',
     marginBottom: 20,
     elevation: 5,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.secondary,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.6,
  },
  contactCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
  },
  iconBox: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    opacity: 0.5,
    marginBottom: 2,
  },
  optionValue: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.secondary,
  },
  addressSection: {
    marginTop: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.secondary,
    marginBottom: 16,
    marginLeft: 4,
  },
  addressCard: {
    backgroundColor: COLORS.white,
    borderRadius: 30,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(46, 196, 182, 0.2)',
  },
  addressName: {
     fontSize: 16,
     fontWeight: '900',
     color: COLORS.secondary,
     marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    opacity: 0.7,
  },
  footer: {
     marginTop: 40,
     alignItems: 'center',
     paddingBottom: 20,
  },
  footerText: {
     fontSize: 11,
     color: COLORS.gray,
     textAlign: 'center',
  },
});
