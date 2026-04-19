import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Platform, StatusBar, ScrollView, Alert, Dimensions } from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useUser } from '@clerk/clerk-expo';
import AddressModal from '@/components/AddressModal';
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
  const deleteAddress = useMutation(api.addresses.deleteAddress);
  const { user } = useUser();

  const [selectedMethod, setSelectedMethod] = useState('cod');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Address Management
  const addresses = useQuery(api.addresses.getAddresses);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  const selectedAddress = addresses?.find(a => 
    selectedAddressId ? a._id === selectedAddressId : a.isDefault
  ) || addresses?.[0];

  // Address Sections
  const primaryAddress = addresses?.find(a => a.isDefault);
  const otherAddresses = addresses?.filter(a => !a.isDefault) || [];

  const handleDeleteAddress = async (id: any) => {
    const doDelete = async () => {
      try {
        await deleteAddress({ id });
      } catch (error) {
        if (Platform.OS === 'web') window.alert('Failed to delete address: ' + (error as Error).message);
        else Alert.alert('Error', 'Failed to delete address: ' + (error as Error).message);
      }
    };
    
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to remove this address?')) doDelete();
    } else {
      Alert.alert('Delete Address', 'Are you sure you want to remove this address?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const handlePayment = async () => {
    if (!user) {
      if (Platform.OS === 'web') window.alert("You must be logged in to place an order.");
      else Alert.alert("Error", "You must be logged in to place an order.");
      return;
    }

    if (!selectedAddress) {
      if (Platform.OS === 'web') window.alert("Please provide a delivery address.");
      else Alert.alert("Missing Address", "Please provide a delivery address.");
      return;
    }

    setIsProcessing(true);
    
    // Final Availability Check (IST: UTC+5:30)
    const now = new Date();
    const istDate = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    const day = istDate.getUTCDay();
    const hour = istDate.getUTCHours();

    if (hour < 6 || hour >= 20) {
      const reason = "Orders open 6 AM - 8 PM";
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
        pincode: selectedAddress.pincode || 'N/A',
        buildingName: selectedAddress.buildingName || '',
        streetNo: selectedAddress.streetNo || '',
        floorNo: selectedAddress.floorNo || '',
        doorNo: selectedAddress.doorNo || '',
        streetName: selectedAddress.streetName || '',
        area: selectedAddress.area || '',
        location: selectedAddress.location || '',
        noBottleReturn: params.noBottleReturn === 'true',
        customerName: selectedAddress.name || user?.fullName || undefined,
        customerPhone: selectedAddress.phone || undefined,
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
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total to Pay</Text>
            <Text style={styles.totalValue}>₹ {params.totalPrice}</Text>
          </View>
          
          <View style={styles.deliveryInfoBox}>
             <View style={styles.deliveryInfoHeader}>
                <MaterialIcons name="local-shipping" size={16} color={COLORS.primary} />
                <Text style={styles.deliveryInfoTitle}>DELIVERING TO:</Text>
             </View>
             
             {addresses && addresses.length > 0 ? (
               <View style={styles.addressListContainer}>
                 {/* Primary Address Section */}
                 {primaryAddress && (
                   <View style={styles.addressSection}>
                     <Text style={styles.addressSectionHeading}>PRIMARY ADDRESS</Text>
                     <TouchableOpacity 
                       style={[styles.addressItemCard, selectedAddress?._id === primaryAddress._id && styles.selectedAddressBorder]}
                       onPress={() => setSelectedAddressId(primaryAddress._id)}
                     >
                        <View style={styles.addressItemRow}>
                           <MaterialIcons 
                             name={selectedAddress?._id === primaryAddress._id ? "radio-button-checked" : "radio-button-unchecked"} 
                             size={20} 
                             color={selectedAddress?._id === primaryAddress._id ? COLORS.primary : COLORS.gray} 
                           />
                           <View style={styles.addressItemInfo}>
                              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <Text style={styles.deliveryTextSmall}>
                                   <Text style={{ fontWeight: '800' }}>{primaryAddress.name} ({primaryAddress.phone})</Text>
                                   {"\n"}
                                   {primaryAddress.buildingName ? `${primaryAddress.buildingName}, ` : ''}
                                   {primaryAddress.doorNo ? `Door ${primaryAddress.doorNo}, ` : ''}
                                   {primaryAddress.streetName}, {primaryAddress.area}, {primaryAddress.location} - {primaryAddress.pincode}
                                </Text>
                              </ScrollView>
                           </View>
                           <View style={styles.addressActionsRow}>
                              <TouchableOpacity 
                                onPress={() => {
                                  setEditingAddress(primaryAddress);
                                  setShowAddressModal(true);
                                }}
                                style={styles.editAddressInlineBtn}
                              >
                                 <MaterialIcons name="edit" size={16} color={COLORS.secondary} />
                              </TouchableOpacity>
                              <TouchableOpacity 
                                onPress={() => handleDeleteAddress(primaryAddress._id)}
                                style={[styles.editAddressInlineBtn, { backgroundColor: '#FFF5F5' }]}
                              >
                                 <MaterialIcons name="delete-outline" size={16} color="#E53E3E" />
                              </TouchableOpacity>
                           </View>
                        </View>
                     </TouchableOpacity>
                   </View>
                 )}

                 {/* Other Addresses Section */}
                 {otherAddresses.length > 0 && (
                   <View style={[styles.addressSection, { marginTop: 12 }]}>
                     <Text style={styles.addressSectionHeading}>OTHER SAVED ADDRESSES</Text>
                     {otherAddresses.map((addr) => {
                       const isSelected = selectedAddress?._id === addr._id;
                       return (
                         <TouchableOpacity 
                           key={addr._id} 
                           style={[styles.addressItemCard, isSelected && styles.selectedAddressBorder, { marginBottom: 8 }]}
                           onPress={() => setSelectedAddressId(addr._id)}
                         >
                            <View style={styles.addressItemRow}>
                               <MaterialIcons 
                                 name={isSelected ? "radio-button-checked" : "radio-button-unchecked"} 
                                 size={20} 
                                 color={isSelected ? COLORS.primary : COLORS.gray} 
                               />
                               <View style={styles.addressItemInfo}>
                                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <Text style={styles.deliveryTextSmall}>
                                       <Text style={{ fontWeight: '800' }}>{addr.name} ({addr.phone})</Text>
                                       {"\n"}
                                       {addr.buildingName ? `${addr.buildingName}, ` : ''}
                                       {addr.doorNo ? `Door ${addr.doorNo}, ` : ''}
                                       {addr.streetName}, {addr.area}, {addr.location} - {addr.pincode}
                                    </Text>
                                  </ScrollView>
                               </View>
                               <View style={styles.addressActionsRow}>
                                  <TouchableOpacity 
                                    onPress={() => {
                                      setEditingAddress(addr);
                                      setShowAddressModal(true);
                                    }}
                                    style={styles.editAddressInlineBtn}
                                  >
                                     <MaterialIcons name="edit" size={16} color={COLORS.secondary} />
                                  </TouchableOpacity>
                                  <TouchableOpacity 
                                    onPress={() => handleDeleteAddress(addr._id)}
                                    style={[styles.editAddressInlineBtn, { backgroundColor: '#FFF5F5' }]}
                                  >
                                     <MaterialIcons name="delete-outline" size={16} color="#E53E3E" />
                                  </TouchableOpacity>
                               </View>
                            </View>
                         </TouchableOpacity>
                       );
                     })}
                   </View>
                 )}
               </View>
             ) : (
               <TouchableOpacity 
                  style={styles.addAddressInlineBtn}
                  onPress={() => {
                    setEditingAddress(null);
                    setShowAddressModal(true);
                  }}
               >
                  <MaterialIcons name="add-location-alt" size={20} color={COLORS.primary} />
                  <Text style={styles.addAddressInlineText}>Add Delivery Address</Text>
               </TouchableOpacity>
             )}

             <TouchableOpacity 
                style={styles.newAddressLink}
                onPress={() => {
                  setEditingAddress(null);
                  setShowAddressModal(true);
                }}
             >
                <Text style={styles.newAddressLinkText}>+ Add New Address</Text>
             </TouchableOpacity>
          </View>
        </View>

        {/* Address Modal */}
        <AddressModal 
          visible={showAddressModal}
          onClose={() => {
            setShowAddressModal(false);
            setEditingAddress(null);
          }}
          initialData={editingAddress}
          addressesCount={addresses?.length || 0}
          addresses={addresses || []}
        />

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
  deliveryInfoBox: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  deliveryInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  deliveryInfoTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.secondary,
    marginLeft: 6,
    textTransform: 'uppercase',
  },
  deliveryText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
    opacity: 0.8,
    marginTop: 8,
  },
  deliveryTextSmall: {
    fontSize: 12,
    color: COLORS.text,
    lineHeight: 16,
    opacity: 0.8,
  },
  addressSectionHeading: {
    fontSize: 10,
    fontWeight: '900',
    color: '#108678',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  addressSection: {
    marginBottom: 4,
  },
  addressListContainer: {
    marginTop: 10,
    gap: 8,
  },
  addressItemCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
  },
  selectedAddressBorder: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0FDF9',
  },
  addressItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addressItemInfo: {
    flex: 1,
  },
  editAddressInlineBtn: {
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  addressActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  editAddressBtn: {
    padding: 4,
  },
  addAddressInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    gap: 10,
  },
  addAddressInlineText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  newAddressLink: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  newAddressLinkText: {
    color: COLORS.secondary,
    fontSize: 13,
    fontWeight: '800',
    textDecorationLine: 'underline',
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
