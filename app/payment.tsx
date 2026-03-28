import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Platform, StatusBar, ScrollView, Alert, Dimensions } from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useUser } from '@clerk/clerk-expo';
import BackgroundAnimation from '@/components/BackgroundAnimation';
import { scale } from '@/utils/responsive';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#2EC4B6',
  secondary: '#0F9D8A',
  accent: '#E8FFF9',
  text: '#1B3A3A',
  white: '#FFFFFF',
  gray: '#718096',
  border: '#E2E8F0',
};

export default function PaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const createOrder = useMutation(api.orders.createOrder);
  const { user } = useUser();

  const [selectedMethod, setSelectedMethod] = useState('cod');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handlePayment = async () => {
    if (!user) {
      if (Platform.OS === 'web') window.alert("You must be logged in to place an order.");
      else Alert.alert("Error", "You must be logged in to place an order.");
      return;
    }

    setIsProcessing(true);
    
    // Final Availability Check (IST: UTC+5:30)
    const now = new Date();
    const istDate = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    const day = istDate.getUTCDay();
    const hour = istDate.getUTCHours();

    if (day === 0 || hour < 6 || hour >= 20) {
      const reason = day === 0 ? "Sunday is a holiday. Orders are closed." : "Orders are only accepted between 6:00 AM and 8:00 PM.";
      if (Platform.OS === 'web') window.alert(reason);
      else Alert.alert("Orders Closed", reason);
      setIsProcessing(false);
      return;
    }

    try {
      await createOrder({
        quantity: Number(params.qty) || 1,
        waterPrice: Number(params.waterPrice) || 35,
        bottlePrice: Number(params.bottlePrice) || 0,
        expressCharge: Number(params.expressCharge) || 0,
        totalAmount: Number(params.totalPrice) || 50,
        paymentMode: selectedMethod === 'cod' ? 'COD' : 'Online',
        pincode: (params.pincode as string) || 'N/A',
        noBottleReturn: params.noBottleReturn === 'true',
      });
      setShowSuccess(true);
    } catch (error: any) {
      let errorMsg = error.toString();
      if (errorMsg.includes("Not authenticated")) errorMsg = "Session expired. Please sign in again.";
      if (Platform.OS === 'web') window.alert(errorMsg);
      else Alert.alert("Error", errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  if (showSuccess) {
    return (
      <SafeAreaView style={styles.successContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.accent} />
        <BackgroundAnimation />
        <View style={styles.successContent}>
          <View style={styles.successIconCircle}>
            <MaterialIcons name="check" size={60} color={COLORS.white} />
          </View>
          <Text style={styles.successTitle}>Order Confirmed!</Text>
          <Text style={styles.successSubtitle}>
            Hydration is on the way. Your demineralized water will be delivered shortly.
          </Text>
          <TouchableOpacity 
            style={styles.viewOrdersBtn}
            onPress={() => router.replace({ pathname: '/(tabs)/orders', params: { success: 'true' } })}
          >
            <Text style={styles.viewOrdersBtnText}>GO TO HISTORY</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.accent} />
      <BackgroundAnimation />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.mainWrapper}>
        
        {/* Progress Indicator */}
        <View style={styles.progressRow}>
          <View style={styles.progressStepActive}>
            <Text style={styles.progressNum}>1</Text>
          </View>
          <View style={styles.progressLine} />
          <View style={styles.progressStepActive}>
            <Text style={styles.progressNum}>2</Text>
          </View>
          <View style={styles.progressLine} />
          <View style={styles.progressStep}>
             <MaterialIcons name="flag" size={14} color={COLORS.border} />
          </View>
        </View>

        <Text style={styles.sectionHeading}>Payment Details</Text>

        {/* Payment Methods */}
        <View style={styles.methodsWrapper}>
           {/* Online Option */}
           <TouchableOpacity 
             style={[styles.methodCard, selectedMethod === 'online' && styles.methodSelected]}
             onPress={() => setSelectedMethod('online')}
           >
              <View style={styles.methodHeader}>
                  <View style={styles.methodIconBox}>
                     <MaterialIcons name="payment" size={24} color={COLORS.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                     <Text style={styles.methodTitle}>Online Payment</Text>
                     <Text style={styles.methodSub}>UPI, Cards, Netbanking</Text>
                  </View>
                  <View style={[styles.radio, selectedMethod === 'online' && styles.radioActive]}>
                     {selectedMethod === 'online' && <View style={styles.radioInner} />}
                  </View>
              </View>
              
              {selectedMethod === 'online' && (
                <View style={styles.onlineDetails}>
                   <View style={styles.upiRow}>
                      <FontAwesome5 name="google-pay" size={32} color={COLORS.secondary} />
                      <FontAwesome5 name="amazon-pay" size={32} color={COLORS.secondary} style={{ marginHorizontal: 15 }} />
                      <Text style={styles.upiText}>+ More</Text>
                   </View>
                   <View style={styles.upiIdBox}>
                      <Text style={styles.upiIdLabel}>Merchant UPI ID</Text>
                      <Text style={styles.upiIdValue}>hydromate@wellness</Text>
                   </View>
                </View>
              )}
           </TouchableOpacity>

           {/* COD Option */}
           <TouchableOpacity 
             style={[styles.methodCard, selectedMethod === 'cod' && styles.methodSelected]}
             onPress={() => setSelectedMethod('cod')}
           >
              <View style={styles.methodHeader}>
                  <View style={[styles.methodIconBox, { backgroundColor: '#F0FDF4' }]}>
                     <MaterialIcons name="local-shipping" size={24} color={COLORS.secondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                     <Text style={styles.methodTitle}>Cash on Delivery</Text>
                     <Text style={styles.methodSub}>Pay at your doorstep</Text>
                  </View>
                  <View style={[styles.radio, selectedMethod === 'cod' && styles.radioActive]}>
                     {selectedMethod === 'cod' && <View style={styles.radioInner} />}
                  </View>
              </View>
           </TouchableOpacity>
        </View>

        {/* Summary Card - Soft Rounded */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
             <FontAwesome5 name="leaf" size={16} color={COLORS.primary} style={{ marginRight: 8 }} />
             <Text style={styles.summaryHeading}>Order Summary</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Hydration Volume</Text>
            <Text style={styles.summaryValue}>{params.qty} x 20L</Text>
          </View>
          {Number(params.expressCharge) > 0 && (
            <View style={[styles.summaryRow, { marginTop: 12 }]}>
              <Text style={styles.summaryLabel}>Express Delivery Charge</Text>
              <Text style={styles.summaryValue}>₹ {params.expressCharge}</Text>
            </View>
          )}
          <View style={[styles.summaryRow, { marginTop: 12 }]}>
            <Text style={styles.summaryLabel}>Total to Pay</Text>
            <Text style={styles.totalValue}>₹ {params.totalPrice}</Text>
          </View>
          <View style={styles.locationTag}>
             <MaterialIcons name="location-on" size={14} color={COLORS.primary} style={{ marginRight: 6 }} />
             <Text style={styles.locationText}>{params.pincode}</Text>
          </View>
        </View>

        {/* Place Order Button */}
        <TouchableOpacity 
          style={[styles.placeOrderBtn, { opacity: isProcessing ? 0.6 : 1 }]} 
          disabled={isProcessing}
          onPress={handlePayment}
        >
          <Text style={styles.placeOrderBtnText}>{isProcessing ? 'CONFIRMING...' : 'PLACE ORDER'}</Text>
          {!isProcessing && <MaterialIcons name="check-circle" size={22} color="#fff" style={{ marginLeft: 10 }} />}
        </TouchableOpacity>

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    height: scale(48),
  },
  backBtn: {
    padding: scale(8),
    marginRight: scale(10),
  },
  headerTitle: {
    fontSize: scale(16),
    fontWeight: '900',
    color: COLORS.secondary,
    letterSpacing: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: scale(12),
    paddingBottom: scale(20),
  },
  mainWrapper: {
    maxWidth: 550,
    width: '100%',
    alignSelf: 'center',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  progressStepActive: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressStep: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressNum: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressLine: {
    flex: 1,
    height: 2,
    maxWidth: 60,
    backgroundColor: COLORS.primary,
    marginHorizontal: 8,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 20,
  },
  methodsWrapper: {
    marginBottom: 32,
  },
  methodCard: {
    backgroundColor: COLORS.white,
    borderRadius: scale(14),
    padding: scale(12),
    marginBottom: scale(8),
    borderWidth: 2,
    borderColor: '#F8FAFC',
    elevation: 2,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  methodSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodIconBox: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(10),
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(10),
  },
  methodTitle: {
    fontSize: scale(14),
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: scale(2),
  },
  methodSub: {
    fontSize: scale(11),
    color: COLORS.gray,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: COLORS.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  onlineDetails: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.accent,
    alignItems: 'center',
  },
  upiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  upiText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  upiIdBox: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  upiIdLabel: {
    fontSize: 10,
    color: COLORS.secondary,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 2,
  },
  upiIdValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '700',
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 28,
    padding: 24,
    marginBottom: 32,
    elevation: 3,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.secondary,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.accent,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.text,
    opacity: 0.6,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.primary,
  },
  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 16,
  },
  locationText: {
    fontSize: 11,
    color: COLORS.secondary,
    fontWeight: '700',
  },
  placeOrderBtn: {
    height: scale(42),
    borderRadius: scale(14),
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  placeOrderBtnText: {
    color: COLORS.white,
    fontSize: scale(14),
    fontWeight: '900',
    letterSpacing: 2,
  },
  successContainer: {
    flex: 1,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successContent: {
    padding: 30,
    alignItems: 'center',
    width: '100%',
  },
  successIconCircle: {
    width: width * 0.25,
    height: width * 0.25,
    maxWidth: 100,
    maxHeight: 100,
    borderRadius: (width * 0.25) / 2.5,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    elevation: 6,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.secondary,
    marginBottom: 12,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 44,
    opacity: 0.7,
  },
  viewOrdersBtn: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 24,
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
    elevation: 3,
  },
  viewOrdersBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
});
