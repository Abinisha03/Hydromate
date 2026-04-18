import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, SafeAreaView, Platform, StatusBar, Dimensions, Animated, ImageBackground } from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { Image } from 'expo-image';

const WATER_IMAGES = [
  require('@/assets/images/water_bg_1.jpg'),
  require('@/assets/images/water_bg_2.jpg'),
  require('@/assets/images/water_bg_3.jpg'),
  require('@/assets/images/water_bg_4.jpg'),
];

const WATER_WORDS = ['HEALTHY CHOICE.', 'PURE HYDRATION.', 'STAY REFRESHED.', 'FEEL THE PURITY.'];
const BANNER_SUBS = [
  'Demineralized water processed with advanced filtration for your wellness.',
  'Premium 20L cans delivered fresh to your doorstep every day.',
  'Pure water. Verified delivery. Zero compromise on quality.',
  '99.9% purity guaranteed. Trusted by thousands in Tirunelveli.',
];

const COLORS = {
  primary: '#2EC4B6',
  secondary: '#0F9D8A',
  accent: '#E8FFF9',
  text: '#1B3A3A',
  white: '#FFFFFF',
  gray: '#718096',
  border: '#E2E8F0',
};

export default function BookWaterScreen() {
  const router = useRouter();

  // Banner animation (same as about.tsx)
  const [bannerIndex, setBannerIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 1500,
        useNativeDriver: true,
      }).start(() => {
        setBannerIndex(prev => (prev + 1) % WATER_IMAGES.length);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }).start();
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const [qty, setQty] = useState(1);
  const [noBottleReturn, setNoBottleReturn] = useState(false);
  const [showPincodeDropdown, setShowPincodeDropdown] = useState(false);
  const [selectedPincode, setSelectedPincode] = useState('600091 - Madipakkam');

  const pincodes = [
    'Madipakkam - 600091',
    'keelkattalai - 600117',
    'Nanganallur - 600061',
    'S. Kolathur - 600129',
    'Express Delivery - 50 Mins'
  ];

  const waterPrice = 35;
  const bottlePrice = 200;
  const expressPricePerBottle = 75;

  const isExpress = selectedPincode.includes('Express');
  const totalWaterPrice = waterPrice * qty;
  const expressCharge = isExpress ? (expressPricePerBottle * qty) : 0;
  const totalBottlePrice = noBottleReturn ? (bottlePrice * qty) : 0;
  const totalPrice = totalWaterPrice + totalBottlePrice + expressCharge;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} />
      <Stack.Screen 
        options={{ 
          title: 'Premium Booking', 
          headerTintColor: '#fff', 
          headerStyle: { backgroundColor: COLORS.secondary },
          headerTitleStyle: { fontWeight: '900' }
        }} 
      />

      <ScrollView contentContainerStyle={styles.container}>
        
        {/* Wellness Banner - Animated */}
        <Animated.View style={[styles.bannerAnimated, { opacity: fadeAnim }]}>
          <ImageBackground
            source={WATER_IMAGES[bannerIndex]}
            style={styles.banner}
            imageStyle={styles.bannerImageStyle}
          >
            <View style={styles.bannerOverlay}>
              <View style={styles.bannerContent}>
                <Text style={styles.bannerTitle}>{WATER_WORDS[bannerIndex]}</Text>
                <Text style={styles.bannerSubtitle}>{BANNER_SUBS[bannerIndex]}</Text>
                <TouchableOpacity style={styles.statsBadge}>
                  <FontAwesome5 name="medal" size={12} color={COLORS.white} />
                  <Text style={styles.statsBadgeText}>99.9% Purity</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ImageBackground>
        </Animated.View>

        {/* Dynamic Booking Card */}
        <View style={styles.mainCard}>
          <View style={styles.productSection}>
             <Image 
                source={require('@/assets/images/water_can.png')} 
                style={styles.productImg}
                contentFit="contain"
             />
             <View style={styles.productInfo}>
                <Text style={styles.productName}>Premium 20L Can</Text>
                <Text style={styles.productPrice}>₹ {waterPrice}/can</Text>
             </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionLabel}>Volume Selection</Text>
          <View style={styles.stepperContainer}>
            <TouchableOpacity style={styles.stepperBtn} onPress={() => setQty(Math.max(1, qty - 1))}>
              <MaterialIcons name="remove" size={24} color={COLORS.white} />
            </TouchableOpacity>
            <View style={styles.stepperValueContainer}>
              <Text style={styles.stepperValue}>{qty}</Text>
            </View>
            <TouchableOpacity style={styles.stepperBtn} onPress={() => setQty(qty + 1)}>
              <MaterialIcons name="add" size={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          {/* Location Selector */}
          <Text style={styles.sectionLabel}>Delivery Node</Text>
          <TouchableOpacity 
            style={styles.dropdownSelector} 
            onPress={() => setShowPincodeDropdown(!showPincodeDropdown)}
          >
            <MaterialIcons name="location-pin" size={20} color={COLORS.primary} style={{ marginRight: 10 }} />
            <Text style={styles.dropdownText}>{selectedPincode}</Text>
            <MaterialIcons name="keyboard-arrow-down" size={24} color={COLORS.secondary} />
          </TouchableOpacity>

          {showPincodeDropdown && (
            <View style={styles.dropdownMenu}>
              {pincodes.map((pin, i) => (
                <TouchableOpacity 
                  key={i} 
                  style={styles.dropdownItem} 
                  onPress={() => {
                    setSelectedPincode(pin);
                    setShowPincodeDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{pin}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Circular Bottle Check */}
          <View style={styles.checkboxWrapper}>
            <TouchableOpacity 
              style={styles.checkboxContainer} 
              onPress={() => setNoBottleReturn(!noBottleReturn)}
            >
              <View style={[styles.checkbox, noBottleReturn && styles.checkboxActive]}>
                {noBottleReturn && <MaterialIcons name="check" size={16} color="#fff" />}
              </View>
              <Text style={styles.checkboxLabel}>I am starting fresh (No bottle exchange)</Text>
            </TouchableOpacity>
          </View>

          {/* Fine Summary */}
          <View style={styles.pricingContainer}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Water Value</Text>
              <Text style={styles.priceValue}>{"₹ " + totalWaterPrice}</Text>
            </View>
            {expressCharge > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Express Delivery : {qty} X 75</Text>
                <Text style={styles.priceValue}>{"₹ " + expressCharge}</Text>
              </View>
            )}
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Bottle Deposit : {qty} X 200</Text>
              <Text style={styles.priceValue}>{"₹ " + totalBottlePrice}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Grand Total</Text>
              <Text style={styles.totalValue}>₹ {totalPrice}</Text>
            </View>
          </View>

        </View>

        <TouchableOpacity 
          style={styles.buyBtn}
          onPress={() => {
            router.push({
              pathname: '/payment',
              params: {
                qty,
                pincode: selectedPincode,
                noBottleReturn: noBottleReturn ? 'true' : 'false',
                waterPrice: totalWaterPrice,
                bottlePrice: totalBottlePrice,
                expressCharge: expressCharge,
                totalPrice,
              }
            });
          }}
        >
          <Text style={styles.buyBtnText}>INITIATE TRANSACTION</Text>
          <MaterialIcons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 10 }} />
        </TouchableOpacity>

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
    paddingBottom: 40,
  },
  bannerAnimated: {
    borderRadius: 36,
    marginBottom: 24,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
  },
  banner: {
    width: '100%',
    height: 180,
    borderRadius: 36,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  bannerImageStyle: {
    borderRadius: 36,
  },
  bannerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 157, 138, 0.52)',
    justifyContent: 'center',
    padding: 24,
  },
  bannerContent: {
    width: '80%',
  },
  bannerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1,
  },
  bannerSubtitle: {
    fontSize: 12,
    marginTop: 8,
    color: '#E6FFFA',
    lineHeight: 18,
    opacity: 0.9,
  },
  statsBadge: {
     flexDirection: 'row',
     alignItems: 'center',
     backgroundColor: 'rgba(255,255,255,0.2)',
     paddingHorizontal: 12,
     paddingVertical: 6,
     borderRadius: 10,
     marginTop: 15,
     alignSelf: 'flex-start',
  },
  statsBadgeText: {
     color: '#fff',
     fontSize: 10,
     fontWeight: 'bold',
     marginLeft: 6,
     letterSpacing: 1,
  },
  mainCard: {
    backgroundColor: COLORS.white,
    borderRadius: 40,
    padding: 30,
    marginBottom: 32,
    elevation: 4,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
  },
  productSection: {
     flexDirection: 'row',
     alignItems: 'center',
     marginBottom: 24,
  },
  productImg: {
     width: 80,
     height: 100,
     marginRight: 20,
  },
  productInfo: {
     flex: 1,
  },
  productName: {
     fontSize: 18,
     fontWeight: '900',
     color: COLORS.secondary,
  },
  productPrice: {
     fontSize: 14,
     color: COLORS.primary,
     fontWeight: '700',
     marginTop: 4,
  },
  divider: {
     height: 1.5,
     backgroundColor: COLORS.accent,
     marginBottom: 24,
  },
  sectionLabel: {
     fontSize: 12,
     fontWeight: '900',
     color: COLORS.gray,
     marginBottom: 12,
     marginLeft: 4,
     textTransform: 'uppercase',
     letterSpacing: 1,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 6,
    marginBottom: 24,
  },
  stepperBtn: {
    width: 50,
    height: 50,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  stepperValueContainer: {
    flex: 1,
    alignItems: 'center',
  },
  stepperValue: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.secondary,
  },
  dropdownSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    borderRadius: 20,
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: '#F1F5F9',
    marginBottom: 24,
  },
  dropdownText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  dropdownMenu: {
     backgroundColor: COLORS.white,
     borderRadius: 20,
     borderWidth: 1,
     borderColor: COLORS.accent,
     padding: 10,
     marginBottom: 24,
     elevation: 6,
  },
  dropdownItem: {
     padding: 15,
     borderBottomWidth: 1,
     borderBottomColor: '#F8FAFC',
  },
  dropdownItemText: {
     fontSize: 14,
     color: COLORS.text,
     fontWeight: '600',
  },
  checkboxWrapper: {
     marginBottom: 32,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderRadius: 8,
    borderColor: COLORS.primary,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
     backgroundColor: COLORS.primary,
  },
  checkboxLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  pricingContainer: {
    backgroundColor: COLORS.accent,
    borderRadius: 24,
    padding: 20,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  priceLabel: {
    fontSize: 14,
    color: COLORS.gray,
    fontWeight: '600',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(46, 196, 182, 0.2)',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.secondary,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primary,
  },
  buyBtn: {
    width: '100%',
    height: 64,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
  },
  buyBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
});
