import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Platform, StatusBar, Modal, FlatList, Animated, Dimensions, TextInput, Alert, Image as RNImage, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useClerk, useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { useQuery, useConvexAuth } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Image } from 'expo-image';
import { scale } from '@/utils/responsive';
import AddressModal from '@/components/AddressModal';

const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = width * 0.75;

const WATER_IMAGES = [
  require('@/assets/images/water_bg_1.jpg'),
  require('@/assets/images/water_bg_2.jpg'),
  require('@/assets/images/water_bg_3.jpg'),
  require('@/assets/images/water_bg_4.jpg'),
];

const BANNER_SLIDES = [
  {
    tag: 'CERTIFIED PURITY',
    tagIcon: 'verified' as const,
    title: 'PURE HYDRATION.\nPURE LIFE.',
    subtitle: 'Premium demineralized water\ndelivered to you.',
    image: require('@/assets/images/banner.png'),
    bg: 'rgba(15,100,86,0.60)',
  },
  {
    tag: 'WORKING HOURS',
    tagIcon: 'schedule' as const,
    title: '6 AM TO 8 PM',
    subtitle: 'We deliver your fresh water\nEvery single day.',
    image: require('@/assets/images/water_can.png'),
    bg: 'rgba(6,78,59,0.62)',
  },
  {
    tag: 'TRUSTED QUALITY',
    tagIcon: 'health-and-safety' as const,
    title: 'PURE CLARITY.\nPURE WELLNESS.',
    subtitle: 'OTP-verified delivery.\nZero compromise on quality.',
    image: require('@/assets/images/water_can.png'),
    bg: 'rgba(5,60,70,0.62)',
  },
  {
    tag: 'REAL-TIME TRACKING',
    tagIcon: 'local-shipping' as const,
    title: 'TRACK YOUR\nORDER LIVE.',
    subtitle: 'Know exactly when your\nwater can arrives.',
    image: require('@/assets/images/water_can.png'),
    bg: 'rgba(2,48,71,0.62)',
  },
];

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
  { label: 'Express Delivery - 50 Mins - 627004', value: '91176129' }
];

export default function HomeScreen() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [hasNoBottle, setHasNoBottle] = useState(false);
  const [showPincodes, setShowPincodes] = useState(false);
  const [selectedPincodeLabel, setSelectedPincodeLabel] = useState<string | null>(null);
  const [selectedPincodeValue, setSelectedPincodeValue] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(width - scale(20));
  const goHome = () => router.replace('/(tabs)');

  
  // Sidebar State
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  // Availability Check
  const [availability, setAvailability] = useState({ isAvailable: true, reason: '' });

  // Banner Animation State
  const [bannerIndex, setBannerIndex] = useState(0);
  const bannerFadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(bannerFadeAnim, {
        toValue: 0,
        duration: 1500,
        useNativeDriver: true,
      }).start(() => {
        setBannerIndex((prev) => (prev + 1) % WATER_IMAGES.length);
        Animated.timing(bannerFadeAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }).start();
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const checkAvailability = () => {
      const now = new Date();
      // IST is UTC+5:30. new Date().getTime() is always UTC. 
      const istDate = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
      const day = istDate.getUTCDay();
      const hour = istDate.getUTCHours();

      if (hour < 6 || hour >= 20) {
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

  const defaultAddress = Array.isArray(addresses) ? addresses.find(a => a.isDefault) : null;
  
  useEffect(() => {
    // We no longer auto-set pincode from address as per the new requirement 
    // to strictly select it from the home page dropdown.
  }, [defaultAddress]);

  const pricing = useQuery(api.pricing.getPricing);

  const waterPrice = pricing?.waterPrice || 35;
  const bottlePricePerUnit = pricing?.bottlePrice || 200;
  const expressChargePerUnit = pricing?.expressCharge || 75;

  const expressCharge = selectedPincodeValue === '91176129' ? (expressChargePerUnit * quantity) : 0;
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
    { label: 'Logout', icon: 'exit-to-app', action: async () => { await signOut(); router.replace('/(auth)/sign-in'); } },
  ];

  const handleBuyNow = () => {
    if (!availability.isAvailable) {
      if (Platform.OS === 'web') {
        window.alert(availability.reason);
      } else {
        Alert.alert('Orders Closed', availability.reason);
      }
      return;
    }
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
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} />
      <View style={{ flex: 1, backgroundColor: COLORS.accent }}>
      
      {/* Centered Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuBtn} onPress={() => toggleSidebar(true)}>
          <MaterialIcons name="menu" size={24} color={COLORS.white} />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <View style={styles.brandRow}>
            <Image 
              source={require('@/assets/images/logo.png')} 
              style={styles.headerLogo} 
            />
            <Text style={styles.headerTitle}>HYDROMATE</Text>
          </View>
        </View>
        
        <View style={{ width: scale(32) }} />
      </View>

      {/* Compact Left-Aligned Location Bar */}
      <TouchableOpacity 
        style={styles.locationBar} 
        onPress={() => setAddressModalVisible(true)}
      >
        <MaterialIcons name="location-on" size={14} color={COLORS.primary} style={{ marginRight: 6 }} />
        <View style={styles.locationInfo}>
           <Text style={styles.locationLabel}>HOME <MaterialIcons name="keyboard-arrow-down" size={12} color={COLORS.gray} /></Text>
           <Text style={styles.locationAddress}>
             {defaultAddress 
               ? `${defaultAddress.buildingName || ''}, ${defaultAddress.area || ''}`
               : "Set delivery address"}
           </Text>
        </View>
      </TouchableOpacity>


      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.mainWrapper} onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
        
        {/* Banner — Fade animation only, 4 slides */}
        <View style={[styles.bannerCard, { marginBottom: scale(10) }]}>
          <Animated.View style={[{ flex: 1 }, { opacity: bannerFadeAnim }]}>
            <ImageBackground
              source={WATER_IMAGES[bannerIndex]}
              style={{ flex: 1 }}
              imageStyle={{ borderRadius: scale(16) }}
            >
              <View style={[styles.bannerContent, { backgroundColor: BANNER_SLIDES[bannerIndex].bg }]}>
                <View style={styles.bannerTextContainer}>
                  <View style={[styles.bannerTagRow, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
                    <MaterialIcons name={BANNER_SLIDES[bannerIndex].tagIcon} size={10} color={COLORS.white} style={{ marginRight: 4 }} />
                    <Text style={styles.bannerTagline}>{BANNER_SLIDES[bannerIndex].tag}</Text>
                  </View>
                  <Text style={styles.bannerTitle}>{BANNER_SLIDES[bannerIndex].title}</Text>
                  <Text style={styles.bannerSubtitle}>{BANNER_SLIDES[bannerIndex].subtitle}</Text>
                </View>
                <View style={styles.bannerImageWrapper}>
                  <Image
                    source={BANNER_SLIDES[bannerIndex].image}
                    style={bannerIndex === 0 ? styles.bannerImage : styles.bannerImageSlide2}
                    contentFit="contain"
                  />
                </View>
              </View>
            </ImageBackground>
          </Animated.View>
        </View>

        {/* Order Section - Soft Rounded Card */}
        <View style={styles.orderSection}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="local-drink" size={22} color={COLORS.primary} style={{ marginRight: 8 }} />
            <Text style={styles.orderTitle}>Select Quantity</Text>
          </View>
          
          <RNImage 
            source={require('@/assets/images/water_can.png')} 
            style={styles.productImage}
            resizeMode="contain"
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

          {/* Delivery Dropdown - Only show if no default address or for manual override if needed */}
          {/* Delivery Dropdown - Always visible and required */}
          <TouchableOpacity 
            style={[styles.dropdown, !selectedPincodeLabel && { borderColor: COLORS.primary }]}
            onPress={() => setShowPincodes(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <MaterialIcons name="location-on" size={20} color={COLORS.primary} style={{ marginRight: 10 }} />
              <Text style={[styles.dropdownText, !selectedPincodeLabel && { color: COLORS.gray }]}>
                {selectedPincodeLabel || 'Select your pincode'}
              </Text>
            </View>
            <MaterialIcons name="arrow-drop-down" size={24} color="#64748b" />
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

          <View style={styles.priceContainer}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Water Price :</Text>
              <Text style={styles.priceCalc}>{quantity} X {waterPrice}</Text>
              <Text style={styles.priceValue}>₹ {quantity * waterPrice}</Text>
            </View>
            {hasNoBottle && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Bottle Price :</Text>
                <Text style={styles.priceCalc}>{quantity} X {bottlePricePerUnit}</Text>
                <Text style={styles.priceValue}>₹ {currentBottlePrice}</Text>
              </View>
            )}
            {expressCharge > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Express Delivery :</Text>
                <Text style={styles.priceCalc}>{quantity} X {expressChargePerUnit}</Text>
                <Text style={styles.priceValue}>₹ {expressCharge}</Text>
              </View>
            )}
            <View style={styles.summaryTotalRow}>
              <Text style={styles.totalLabel}>Total Price</Text>
              <Text style={styles.totalValue}>₹ {totalPrice}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={[
            styles.buyBtn, 
            (!selectedPincodeLabel || !availability.isAvailable) && { opacity: 0.6 }
          ]}
          onPress={handleBuyNow}
        >
          <Text style={styles.buyBtnText}>
            BUY NOW
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
                <Image 
                  source={require('@/assets/images/logo.png')} 
                  style={styles.sidebarLogo} 
                />
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
      <AddressModal
        visible={addressModalVisible}
        onClose={() => setAddressModalVisible(false)}
        initialData={defaultAddress}
        addressesCount={Array.isArray(addresses) ? addresses.length : 0}
        addresses={Array.isArray(addresses) ? addresses : []}
      />

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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.secondary,
  },
  header: {
    height: scale(42),
    backgroundColor: COLORS.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(12),
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBtn: {
    width: scale(32),
    height: scale(32),
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: scale(14),
    fontWeight: '900',
    letterSpacing: 1,
  },
  headerLogo: {
    width: scale(20),
    height: scale(20),
    marginRight: 6,
  },
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(15),
    paddingVertical: scale(2),
    backgroundColor: 'transparent',
    marginTop: scale(0),
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: scale(10),
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  locationAddress: {
    fontSize: scale(9),
    color: COLORS.gray,
    fontWeight: '600',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: scale(6),
    paddingBottom: 2,
  },
  mainWrapper: {
    maxWidth: 550,
    width: '100%',
    alignSelf: 'center',
  },
  bannerCard: {
    borderRadius: scale(12),
    overflow: 'hidden',
    marginBottom: scale(8),
    height: scale(165),
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  bannerContent: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.secondary,
    position: 'relative',
  },
  bannerTextContainer: {
    flex: 2,
    padding: scale(18),
    justifyContent: 'center',
    zIndex: 10,
  },
  bannerTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 5,
  },
  bannerTagline: {
    fontSize: scale(12),
    color: COLORS.white,
    fontWeight: '900',
    letterSpacing: 1,
  },
  bannerTitle: {
    fontSize: scale(21),
    fontWeight: '900',
    color: COLORS.white,
    marginBottom: 4,
    lineHeight: scale(26),
  },
  bannerSubtitle: {
    fontSize: scale(14),
    color: COLORS.white,
    opacity: 0.9,
    fontWeight: '600',
    lineHeight: scale(18),
  },
  bannerImageWrapper: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    marginRight: scale(4),
  },
  bannerImageSlide2: {
    width: '100%',
    height: '90%',
    marginRight: scale(5),
    marginTop: scale(10),
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: scale(6),
  },
  dot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    backgroundColor: '#CBD5E0',
    marginHorizontal: scale(3),
  },
  activeDot: {
    width: scale(16),
    backgroundColor: COLORS.primary,
  },
  orderSection: {
    backgroundColor: COLORS.white,
    borderRadius: scale(16),
    padding: scale(12),
    alignItems: 'center',
    marginBottom: scale(6),
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(2),
    width: '100%',
    justifyContent: 'center',
  },
  orderTitle: {
    fontSize: scale(15),
    fontWeight: '700',
    color: COLORS.text,
  },
  productImage: {
    width: scale(45),
    height: scale(45),
    marginBottom: scale(6),
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: scale(8),
    padding: scale(2),
    marginBottom: scale(4),
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  stepperBtn: {
    backgroundColor: COLORS.white,
    width: scale(26),
    height: scale(26),
    borderRadius: scale(6),
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  quantityInput: {
    fontSize: scale(14),
    fontWeight: '900',
    color: COLORS.secondary,
    width: scale(40),
    minHeight: scale(26),
    textAlign: 'center',
    padding: 0,
    marginHorizontal: scale(4),
    textAlignVertical: 'center',
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
    borderWidth: 1,
    borderColor: '#94a3b8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginBottom: scale(8),
  },
  dropdownText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  addressDisplayCard: {
    backgroundColor: COLORS.white,
    borderRadius: scale(16),
    padding: scale(12),
    marginBottom: scale(10),
    elevation: 3,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(46, 196, 182, 0.1)',
  },
  addressCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(8),
    paddingBottom: scale(6),
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  deliveryInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveryLabel: {
    fontSize: scale(11),
    color: COLORS.gray,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(8),
  },
  editBtnText: {
    color: COLORS.white,
    fontSize: scale(10),
    fontWeight: '800',
    marginLeft: scale(4),
  },
  addressInfoBox: {
    paddingVertical: scale(2),
  },
  addressLine1: {
    fontSize: scale(14),
    fontWeight: '800',
    color: COLORS.secondary,
    marginBottom: scale(2),
  },
  addressLine2: {
    fontSize: scale(12),
    color: COLORS.text,
    opacity: 0.8,
    fontWeight: '500',
    marginBottom: scale(6),
  },
  pincodeBadge: {
    backgroundColor: COLORS.accent,
    alignSelf: 'flex-start',
    paddingHorizontal: scale(8),
    paddingVertical: scale(2),
    borderRadius: scale(6),
  },
  pincodeBadgeText: {
    fontSize: scale(10),
    color: COLORS.secondary,
    fontWeight: '800',
  },
  noAddressCard: {
    backgroundColor: COLORS.white,
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: scale(10),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  noAddressText: {
    fontSize: scale(14),
    fontWeight: '800',
    color: COLORS.primary,
    marginLeft: scale(10),
  },
  checkboxWrapper: {
    width: '100%',
    marginBottom: 4,
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(6),
  },
  priceLabel: {
    width: scale(95),
    fontSize: scale(11),
    color: COLORS.text,
    fontWeight: '700',
    opacity: 0.8,
  },
  priceCalc: {
    flex: 1,
    fontSize: scale(11),
    color: COLORS.text,
    fontWeight: '600',
    opacity: 0.8,
    textAlign: 'left',
    paddingLeft: scale(4),
  },
  priceValue: {
    width: scale(65),
    textAlign: 'left',
    fontSize: scale(12),
    fontWeight: '800',
    color: COLORS.text,
  },
  summaryTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scale(4),
    paddingTop: scale(8),
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(15, 157, 138, 0.2)',
  },
  totalLabel: {
    flex: 1,
    fontSize: scale(16),
    fontWeight: '900',
    color: COLORS.secondary,
  },
  totalValue: {
    width: scale(65),
    textAlign: 'left',
    fontSize: scale(18),
    fontWeight: '900',
    color: COLORS.secondary,
  },
  buyBtn: {
    backgroundColor: COLORS.primary,
    height: scale(48),
    width: '75%',
    alignSelf: 'center',
    borderRadius: scale(12),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    marginTop: scale(15),
    marginBottom: scale(5),
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
    borderRadius: 45,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    elevation: 8,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  sidebarLogo: {
    width: '100%',
    height: '100%',
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
    padding: 14,
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
    padding: 8,
    marginVertical: 3,
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
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.secondary,
  },
});
