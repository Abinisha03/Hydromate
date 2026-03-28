import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, SafeAreaView, Platform, StatusBar, Modal, FlatList, Animated, Dimensions, TextInput } from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { useQuery, useConvexAuth } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Image } from 'expo-image';
import BackgroundAnimation from '@/components/BackgroundAnimation';
import { scale } from '@/utils/responsive';

const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = width * 0.75;

// Theme Colors
const COLORS = {
  primary: '#2EC4B6',
  secondary: '#0F9D8A',
  accent: '#E8FFF9',
  text: '#1B3A3A',
  white: '#FFFFFF',
  cardBg: '#FFFFFF',
  border: '#E2E8F0',
  gray: '#94A3B8',
};

const PINCODES = [
  { label: 'Tirunelveli Town - 627006', value: '627006' },
  { label: 'Palayamkottai - 627002', value: '627002' },
  { label: 'Melapalayam - 627005', value: '627005' },
  { label: 'Thachanallur - 627001', value: '627001' },
  { label: 'Express Delivery - 50 Mins - 91176129', value: '91176129' }
];

export default function HomeScreen() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [hasNoBottle, setHasNoBottle] = useState(false);
  const [showPincodes, setShowPincodes] = useState(false);
  const [selectedPincodeLabel, setSelectedPincodeLabel] = useState<string | null>(null);
  const [selectedPincodeValue, setSelectedPincodeValue] = useState<string | null>(null);
  
  // Sidebar State
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;

  // Order Availability Check
  const [availability, setAvailability] = useState({ isAvailable: true, reason: '' });

  useEffect(() => {
    const checkAvailability = () => {
      const now = new Date();
      // IST is UTC+5:30. new Date().getTime() is always UTC. 
      const istDate = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
      const day = istDate.getUTCDay();
      const hour = istDate.getUTCHours();

      if (day === 0) {
        setAvailability({ isAvailable: false, reason: 'Sunday is a holiday' });
      } else if (hour < 6 || hour >= 20) {
        setAvailability({ isAvailable: false, reason: 'Orders open 6 AM - 8 PM' });
      } else {
        setAvailability({ isAvailable: true, reason: '' });
      }
    };

    checkAvailability();
    const interval = setInterval(checkAvailability, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  // Address Check
  const { isLoading, isAuthenticated } = useConvexAuth();
  const addresses = useQuery(api.addresses.getAddresses, isAuthenticated ? {} : "skip");

  useEffect(() => {
    if (!isLoading && isAuthenticated && Array.isArray(addresses) && addresses.length === 0) {
      router.replace('/(tabs)/profile');
    }
  }, [isLoading, isAuthenticated, addresses]);

  const waterPrice = 35;
  const bottlePricePerUnit = 200;
  const expressCharge = selectedPincodeValue === '91176129' ? (75 * quantity) : 0;
  const currentBottlePrice = hasNoBottle ? quantity * bottlePricePerUnit : 0;
  const totalPrice = (quantity * waterPrice) + currentBottlePrice + expressCharge;

  const toggleSidebar = (show: boolean) => {
    if (show) {
      setSidebarVisible(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -SIDEBAR_WIDTH,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setSidebarVisible(false));
    }
  };

  const navTo = (path: any) => {
    toggleSidebar(false);
    router.push(path);
  };

  const menuItems = [
    { label: 'Home', icon: 'home', action: () => toggleSidebar(false) },
    { label: 'Invite Friends', icon: 'send', action: () => navTo('/invite' as any) },
    { label: 'Contact Us', icon: 'headset-mic', action: () => navTo('/contact' as any) },
    { label: 'Terms & Condition', icon: 'assignment', action: () => navTo('/terms' as any) },
    { label: 'About us', icon: 'info', action: () => navTo('/about' as any) },
    { label: 'Logout', icon: 'exit-to-app', action: () => signOut() },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} />
      <BackgroundAnimation />
      
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuBtn} onPress={() => toggleSidebar(true)}>
          <MaterialIcons name="menu" size={28} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.brandRow}>
          <FontAwesome5 name="leaf" size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
          <Text style={styles.headerTitle}>HYDROMATE</Text>
        </View>
        <View style={{ width: 48 }} /> 
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.mainWrapper}>
        
        {/* Banner Card - Soft & Wellness Look */}
        <View style={styles.bannerCard}>
          <View style={styles.bannerContent}>
            <View style={styles.bannerTextContainer}>
              <Text style={styles.bannerTagline}>Health First</Text>
              <Text style={styles.bannerTitle}>PURE HYDRATION.{"\n"}PURE LIFE.</Text>
              <Text style={styles.bannerSubtitle}>Premium demineralized water for a healthier you.</Text>
            </View>
            <View style={styles.bannerImageWrapper}>
              <View style={styles.bannerBgDecoration} />
              <Image 
                source={require('@/assets/images/banner.png')} 
                style={styles.bannerImage}
                contentFit="contain"
              />
            </View>
          </View>
        </View>

        {/* Order Section - Soft Rounded Card */}
        <View style={styles.orderSection}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="local-drink" size={22} color={COLORS.primary} style={{ marginRight: 8 }} />
            <Text style={styles.orderTitle}>Select Quantity</Text>
          </View>
          
          <Image 
            source={require('@/assets/images/water_can.png')} 
            style={styles.productImage}
            contentFit="contain"
          />

          {/* Stepper - Modern Mint Style */}
          <View style={styles.stepperContainer}>
            <TouchableOpacity 
              style={styles.stepperBtn} 
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <MaterialIcons name="remove" size={24} color={COLORS.secondary} />
            </TouchableOpacity>
            
            <TextInput 
              style={styles.quantityInput}
              value={quantity.toString()}
              onChangeText={(text) => {
                const val = parseInt(text.replace(/[^0-9]/g, '')) || 0;
                setQuantity(val);
              }}
              keyboardType="numeric"
              selectTextOnFocus={true}
              textAlign="center"
              maxLength={3}
            />

            <TouchableOpacity 
              style={styles.stepperBtn} 
              onPress={() => setQuantity(quantity + 1)}
            >
              <MaterialIcons name="add" size={24} color={COLORS.secondary} />
            </TouchableOpacity>
          </View>

          {/* Delivery Dropdown - Mint Border */}
          <TouchableOpacity 
            style={styles.dropdown}
            onPress={() => setShowPincodes(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <MaterialIcons name="location-on" size={20} color={COLORS.primary} style={{ marginRight: 10 }} />
              <Text style={[styles.dropdownText, !selectedPincodeLabel && { color: COLORS.gray }]} numberOfLines={1}>
                {selectedPincodeLabel || 'Select your pincode'}
              </Text>
            </View>
            <MaterialIcons name="keyboard-arrow-down" size={24} color={COLORS.secondary} />
          </TouchableOpacity>

          {/* Checkbox - Themed Switch Style */}
          <View style={styles.checkboxWrapper}>
            <TouchableOpacity 
              style={styles.checkboxContainer} 
              onPress={() => setHasNoBottle(!hasNoBottle)}
            >
              <View style={[styles.customCheck, hasNoBottle && styles.customCheckActive]}>
                {hasNoBottle && <MaterialIcons name="check" size={16} color={COLORS.white} />}
              </View>
              <Text style={styles.checkboxText}>I don't have a bottle to return</Text>
            </TouchableOpacity>
          </View>

          {/* Price Summary - Clean & Readable */}
          <View style={styles.priceContainer}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Water Price : {quantity} X 35</Text>
              <Text style={styles.priceValue}>{"₹ " + (quantity * waterPrice)}</Text>
            </View>
            {hasNoBottle && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Bottle Price : {quantity} X 200</Text>
                <Text style={styles.priceValue}>₹ {currentBottlePrice}</Text>
              </View>
            )}
            {expressCharge > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Express Delivery : {quantity} X 75</Text>
                <Text style={styles.priceValue}>{"₹ " + expressCharge}</Text>
              </View>
            )}
            <View style={styles.summaryTotalRow}>
              <Text style={styles.totalLabel}>Total Price</Text>
              <Text style={styles.totalValue}>₹ {totalPrice}</Text>
            </View>
          </View>
        </View>

        {/* Action Button - Mint Teal Gradient Look */}
        <TouchableOpacity 
          style={[
            styles.buyBtn, 
            (!selectedPincodeLabel || !availability.isAvailable) && { opacity: 0.6 }
          ]}
          disabled={!availability.isAvailable}
          onPress={() => {
            if (!selectedPincodeLabel) {
              setShowPincodes(true);
              return;
            }
            router.push({
              pathname: '/payment',
              params: {
                qty: quantity,
                waterPrice: waterPrice,
                bottlePrice: currentBottlePrice,
                totalPrice: totalPrice,
                pincode: selectedPincodeLabel,
                noBottleReturn: hasNoBottle.toString(),
                expressCharge: expressCharge.toString(),
              }
            })
          }}
        >
          <Text style={styles.buyBtnText}>
            {availability.isAvailable ? 'BUY NOW' : availability.reason.toUpperCase()}
          </Text>
          {availability.isAvailable && (
            <MaterialIcons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
          )}
        </TouchableOpacity>

        </View>
      </ScrollView>

      {/* Sidebar Modal - Redesigned */}
      <Modal
        visible={sidebarVisible}
        transparent={true}
        animationType="none"
        onRequestClose={() => toggleSidebar(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity 
            style={styles.sidebarOverlay} 
            activeOpacity={1} 
            onPress={() => toggleSidebar(false)} 
          />
          <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}>
            <View style={styles.sidebarHeader}>
              <View style={styles.sidebarLogoBox}>
                 <FontAwesome5 name="water" size={40} color={COLORS.white} />
              </View>
              <Text style={styles.sidebarBrand}>HYDROMATE</Text>
              <Text style={styles.sidebarTagline}>HEALTHY HYDRATION</Text>
            </View>

            <View style={styles.sidebarMenu}>
              {menuItems.map((item, index) => (
                <TouchableOpacity key={index} style={styles.menuItem} onPress={item.action}>
                  <View style={styles.menuIconCircle}>
                    <MaterialIcons name={item.icon as any} size={22} color={COLORS.primary} />
                  </View>
                  <Text style={styles.menuText}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.sidebarFooter}>
              <Text style={styles.footerVersion}>v1.0.4</Text>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Pincode Selector Modal - Soft Rounded */}
      <Modal
        visible={showPincodes}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPincodes(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPincodes(false)}
        >
          <View style={styles.pincodeModalContent}>
            <Text style={styles.pincodeModalTitle}>Select your pincode</Text>
            <FlatList
              data={PINCODES}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.pincodeItem}
                  onPress={() => {
                    setSelectedPincodeLabel(item.label);
                    setSelectedPincodeValue(item.value);
                    setShowPincodes(false);
                  }}
                >
                  <MaterialIcons name="location-pin" size={20} color={COLORS.primary} style={{ marginRight: 15 }} />
                  <Text style={styles.pincodeItemText}>{item.label}</Text>
                  <MaterialIcons name="chevron-right" size={24} color={COLORS.border} />
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.accent,
  },
  header: {
    height: scale(54),
    paddingTop: scale(8),
    backgroundColor: COLORS.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(15),
  },
  menuBtn: {
    width: scale(44),
    height: scale(44),
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: scale(16),
    fontWeight: '900',
    letterSpacing: 2,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: scale(10),
    paddingBottom: scale(10),
  },
  mainWrapper: {
    maxWidth: 550,
    width: '100%',
    alignSelf: 'center',
  },
  bannerCard: {
    backgroundColor: COLORS.white,
    borderRadius: scale(16),
    overflow: 'hidden',
    marginBottom: scale(10),
    elevation: 3,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  bannerContent: {
    flexDirection: 'row',
    padding: scale(10),
    alignItems: 'center',
  },
  bannerTextContainer: {
    flex: 1.4,
    zIndex: 2,
  },
  bannerTagline: {
    fontSize: scale(9),
    color: COLORS.primary,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: scale(2),
  },
  bannerTitle: {
    fontSize: scale(14),
    fontWeight: '900',
    color: COLORS.text,
    lineHeight: scale(16),
    marginBottom: scale(2),
  },
  bannerSubtitle: {
    fontSize: scale(10),
    color: '#666',
    lineHeight: scale(12),
    marginBottom: scale(6),
  },
  discoverBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  discoverBtnText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  bannerImageWrapper: {
    flex: 1,
    height: Math.min(width * 0.18, 90), // Very compact height
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerBgDecoration: {
    position: 'absolute',
    width: Math.min(width * 0.18, 80),
    height: Math.min(width * 0.18, 80),
    borderRadius: 40,
    backgroundColor: COLORS.accent,
    zIndex: 1,
  },
  bannerImage: {
    width: '90%',
    height: '90%',
    zIndex: 2,
  },
  orderSection: {
    backgroundColor: COLORS.white,
    borderRadius: scale(16),
    padding: scale(10),
    alignItems: 'center',
    marginBottom: scale(8),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(6),
    width: '100%',
    justifyContent: 'center',
  },
  orderTitle: {
    fontSize: scale(13),
    fontWeight: '700',
    color: COLORS.text,
  },
  productImage: {
    width: width * 0.35,
    height: width * 0.45,
    maxHeight: 110,
    maxWidth: 100,
    marginBottom: 12,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: scale(12),
    padding: scale(4),
    marginBottom: scale(10),
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  stepperBtn: {
    backgroundColor: COLORS.white,
    width: scale(36),
    height: scale(36),
    borderRadius: scale(8),
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  quantityInput: {
    fontSize: scale(22),
    fontWeight: '900',
    color: COLORS.secondary,
    width: scale(60),
    textAlign: 'center',
    padding: 0,
    marginHorizontal: scale(5),
  },
  quantityBox: {
    width: scale(50),
    alignItems: 'center',
  },
  quantityText: {
    fontSize: scale(18),
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  dropdown: {
    backgroundColor: COLORS.white,
    width: '100%',
    height: 42,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  dropdownText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  checkboxWrapper: {
    width: '100%',
    marginBottom: 12,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customCheck: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  customCheckActive: {
    backgroundColor: COLORS.primary,
  },
  checkboxText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  priceContainer: {
    width: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    padding: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  priceLabel: {
    fontSize: 12,
    color: '#555',
  },
  priceValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  summaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(46, 196, 182, 0.2)',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.secondary,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.secondary,
  },
  buyBtn: {
    backgroundColor: COLORS.primary,
    height: scale(38),
    borderRadius: scale(19),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buyBtnText: {
    color: COLORS.white,
    fontSize: scale(14),
    fontWeight: '800',
    letterSpacing: 2,
  },
  // Sidebar Styles
  modalContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(27, 58, 58, 0.4)',
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: COLORS.white,
    paddingTop: 60,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
  },
  sidebarHeader: {
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  sidebarLogoBox: {
    width: 90,
    height: 90,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    elevation: 5,
  },
  sidebarBrand: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.secondary,
    letterSpacing: 2,
  },
  sidebarTagline: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: 'bold',
    letterSpacing: 3,
    marginTop: 4,
  },
  sidebarMenu: {
    flex: 1,
    paddingHorizontal: 15,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 16,
    marginBottom: 4,
  },
  menuIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '700',
  },
  sidebarFooter: {
    padding: 20,
    alignItems: 'center',
  },
  footerVersion: {
    fontSize: 12,
    color: '#CBD5E0',
  },
  // Pincode Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(27, 58, 58, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pincodeModalContent: {
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    width: '90%',
    maxWidth: 400,
    padding: 20,
    maxHeight: '80%',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  modalHandle: {
    width: 40,
    height: 5,
    backgroundColor: COLORS.accent,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  pincodeModalTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 16,
    color: COLORS.text,
    textAlign: 'center',
  },
  pincodeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 10,
    marginVertical: 4,
    elevation: 2,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  pincodeItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.secondary,
  },
});
