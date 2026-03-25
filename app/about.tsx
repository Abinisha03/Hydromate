import React from 'react';
import { StyleSheet, View, Text, SafeAreaView, ScrollView, ImageBackground, StatusBar, Dimensions } from 'react-native';
import { Stack } from 'expo-router';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#2EC4B6',
  secondary: '#0F9D8A',
  accent: '#E8FFF9',
  text: '#1B3A3A',
  white: '#FFFFFF',
  gray: '#718096',
};

export default function AboutUsScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} />
      <Stack.Screen 
        options={{ 
          title: 'Our Wellness Story', 
          headerTintColor: '#fff', 
          headerStyle: { backgroundColor: COLORS.secondary },
          headerTitleStyle: { fontWeight: '900' }
        }} 
      />
      
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroSection}>
          <ImageBackground 
            source={{ uri: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?q=80&w=2070&auto=format&fit=crop' }}
            style={styles.heroImage}
            imageStyle={{ borderRadius: 40 }}
          >
            <View style={styles.heroOverlay}>
              <FontAwesome5 name="water" size={60} color="#fff" />
              <Text style={styles.heroTitle}>PURE CARE.{"\n"}PURE LIFE.</Text>
            </View>
          </ImageBackground>
        </View>

        <View style={styles.contentSection}>
          <View style={styles.sectionHeader}>
             <View style={styles.line} />
             <Text style={styles.sectionTag}>MISSION STATEMENT</Text>
             <View style={styles.line} />
          </View>
          
          <Text style={styles.mainText}>
            At <Text style={styles.boldText}>HYDROMATE</Text>, we believe that health begins with what you drink. In a world of over-processed resources, we stand for pure, demineralized hydration delivered with a wellness mindset.
          </Text>

          <View style={styles.cardRow}>
            <View style={styles.infoCard}>
               <MaterialIcons name="health-and-safety" size={32} color={COLORS.primary} />
               <Text style={styles.cardLabel}>Wellness Grade</Text>
               <Text style={styles.cardDesc}>Highest purity standards.</Text>
            </View>
            <View style={styles.infoCard}>
               <MaterialIcons name="eco" size={32} color={COLORS.primary} />
               <Text style={styles.cardLabel}>Eco Conscious</Text>
               <Text style={styles.cardDesc}>Circular bottle system.</Text>
            </View>
          </View>

          <View style={styles.visionBox}>
             <Text style={styles.visionTitle}>The HYDROMATE Vision</Text>
             <Text style={styles.visionText}>
               To become the most trusted name in health-centric hydration, ensuring every household in Tirunelveli and beyond has access to premium quality water without the environmental cost.
             </Text>
          </View>

          <View style={styles.statsGrid}>
             <View style={styles.statBox}>
               <Text style={styles.statValue}>10k+</Text>
               <Text style={styles.statLabel}>Healthy Users</Text>
             </View>
             <View style={styles.statBox}>
               <Text style={styles.statValue}>50k+</Text>
               <Text style={styles.statLabel}>Cans Delivered</Text>
             </View>
             <View style={styles.statBox}>
               <Text style={styles.statValue}>100%</Text>
               <Text style={styles.statLabel}>Purity Guaranteed</Text>
             </View>
          </View>
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
    paddingBottom: 40,
  },
  heroSection: {
    padding: 24,
  },
  heroImage: {
    width: '100%',
    height: 350,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
  },
  heroOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 157, 138, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    marginTop: 20,
    letterSpacing: 4,
  },
  contentSection: {
    paddingHorizontal: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.primary,
    opacity: 0.3,
  },
  sectionTag: {
     fontSize: 11,
     fontWeight: '900',
     color: COLORS.primary,
     marginHorizontal: 15,
     letterSpacing: 2,
  },
  mainText: {
    fontSize: 18,
    color: COLORS.secondary,
    lineHeight: 28,
    marginBottom: 32,
    textAlign: 'center',
  },
  boldText: {
    fontWeight: '900',
    color: COLORS.primary,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  infoCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 24,
    borderRadius: 30,
    alignItems: 'center',
    elevation: 3,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.secondary,
    marginTop: 12,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 10,
    color: COLORS.text,
    textAlign: 'center',
    opacity: 0.6,
  },
  visionBox: {
    backgroundColor: COLORS.secondary,
    padding: 32,
    borderRadius: 40,
    marginBottom: 32,
  },
  visionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 12,
  },
  visionText: {
    fontSize: 15,
    color: '#E6FFFA',
    lineHeight: 24,
    opacity: 0.9,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.white,
    padding: 24,
    borderRadius: 30,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(46, 196, 182, 0.1)',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '700',
  },
});
