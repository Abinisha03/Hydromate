import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, SafeAreaView, Platform, StatusBar, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert } from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useConvexAuth } from 'convex/react';
import { api } from '@/convex/_generated/api';
import * as Location from 'expo-location';
import BackgroundAnimation from '@/components/BackgroundAnimation';
import { scale } from '@/utils/responsive';
import AddressModal from '@/components/AddressModal';

const COLORS = {
  primary: '#2EC4B6',
  secondary: '#0F9D8A',
  accent: '#E8FFF9',
  text: '#1B3A3A',
  white: '#FFFFFF',
  gray: '#718096',
  border: '#E2E8F0',
};

export default function ProfileScreen() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();
  
  const { isLoading, isAuthenticated } = useConvexAuth();
  const addresses = useQuery(api.addresses.getAddresses, isAuthenticated ? {} : "skip");
  const createAddress = useMutation(api.addresses.createAddress);
  const updateAddress = useMutation(api.addresses.updateAddress);
  const deleteAddress = useMutation(api.addresses.deleteAddress);
  const setDefaultAddress = useMutation(api.addresses.setDefaultAddress);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any>(null);
  const autoOpenedRef = useRef(false);

  // Auto-open Add Address modal for new users with no addresses
  useEffect(() => {
    if (
      !autoOpenedRef.current &&
      Array.isArray(addresses) &&
      addresses.length === 0
    ) {
      autoOpenedRef.current = true;
      setEditingAddress(null);
      setModalVisible(true);
    }
  }, [addresses]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/(auth)/sign-in');
    } catch (err) {
      console.error('Error signing out', err);
    }
  };

  const openAddModal = () => {
    setEditingAddress(null);
    setModalVisible(true);
  };

  const openEditModal = (addr: any) => {
    setEditingAddress(addr);
    setModalVisible(true);
  };

  const handleDelete = async (id: any) => {
    console.log('Attempting to delete address:', id);
    
    const onConfirm = async () => {
      try {
        await deleteAddress({ id });
        if (Platform.OS === 'web') alert('Address deleted successfully');
      } catch (error) {
        console.error('Delete error:', error);
        alert('Failed to delete address: ' + (error as Error).message);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to remove this address?')) {
        onConfirm();
      }
    } else {
      Alert.alert('Delete Address', 'Are you sure you want to remove this address?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onConfirm },
      ]);
    }
  };

  const defaultAddress = addresses?.find(a => a.isDefault);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} />
      <BackgroundAnimation />
      <View style={styles.header}>
        <FontAwesome5 name="user-circle" size={24} color={COLORS.white} style={{ marginRight: 12 }} />
        <Text style={styles.headerTitle}>Account Profile</Text>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.mainWrapper}>
        
        {/* User Info Card - Wellness Style */}
        <View style={styles.userCard}>
          <View style={styles.avatarWrapper}>
             <View style={styles.avatar}>
               <MaterialIcons name="person" size={50} color="#fff" />
             </View>
             <View style={styles.avatarRing} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {defaultAddress ? defaultAddress.name : (user?.primaryEmailAddress?.emailAddress || 'Loading...')}
            </Text>
            {defaultAddress && (
              <View style={styles.phoneBadge}>
                 <MaterialIcons name="phone" size={14} color={COLORS.secondary} style={{ marginRight: 6 }} />
                 <Text style={styles.userPhone}>
                   {defaultAddress.phone}
                 </Text>
              </View>
            )}
          </View>
        </View>

        {/* Address Management Section */}
        <View style={styles.sectionHeaderRow}>
           <Text style={styles.sectionHeaderTitle}>Saved Addresses</Text>
        </View>

        {addresses === undefined || addresses === null ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
        ) : (
          addresses.map((addr) => (
            <View key={addr._id} style={[styles.addressCard, addr.isDefault && styles.defaultBorder]}>
              <View style={styles.addressHeader}>
                <View style={styles.addressNameRow}>
                   <MaterialIcons name="location-city" size={18} color={COLORS.primary} style={{ marginRight: 10 }} />
                   <Text style={styles.addressNameText}>{addr.buildingName || 'Home'}</Text>
                </View>
                <View style={styles.addressActions}>
                  <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(addr)}>
                    <MaterialIcons name="edit" size={18} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.trashBtn} onPress={() => handleDelete(addr._id)}>
                    <MaterialIcons name="delete" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.divider} />

              {[
                { label: 'Building Name', value: addr.buildingName },
                { label: 'Gate No', value: addr.gateNo },
                { label: 'Floor No', value: addr.floorNo },
                { label: 'Door No', value: addr.doorNo },
                { label: 'Street Name', value: addr.streetName },
                { label: 'Area', value: addr.area },
                { label: 'Location', value: addr.location },
              ].map((item, idx) => (
                <View key={idx} style={styles.addressRow}>
                  <Text style={styles.addressLabel}>{item.label}</Text>
                  <Text style={styles.labelColon}>:</Text>
                  <Text style={styles.addressValue}>{item.value || '-'}</Text>
                </View>
              ))}

              <View style={styles.useAddressContainer}>
                <TouchableOpacity 
                   style={[styles.useAddressBtn, addr.isDefault && styles.activeAddressBtn]} 
                   onPress={() => setDefaultAddress({ id: addr._id })}
                >
                  <Text style={[styles.useAddressText, addr.isDefault && { color: '#fff' }]}>
                    {addr.isDefault ? 'PRIMARY ADDRESS' : 'Use This Address'}
                  </Text>
                  <MaterialIcons 
                    name={addr.isDefault ? "check-circle" : "radio-button-unchecked"} 
                    size={20} 
                    color={addr.isDefault ? "#fff" : "#007AFF"} 
                    style={{ marginLeft: 10 }} 
                  />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <View style={styles.centerAddBtn}>
          <TouchableOpacity style={styles.mobileAddBtn} onPress={openAddModal}>
             <Text style={styles.mobileAddBtnText}>ADD NEW</Text>
          </TouchableOpacity>
        </View>

        {/* Global Action Buttons */}
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/orders')}>
          <View style={[styles.btnIconBox, { backgroundColor: COLORS.accent }]}>
             <MaterialIcons name="history" size={20} color={COLORS.secondary} />
          </View>
          <Text style={styles.secondaryBtnText}>View Order History</Text>
          <MaterialIcons name="chevron-right" size={24} color={COLORS.border} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
           <View style={[styles.btnIconBox, { backgroundColor: '#FFF5F5' }]}>
             <MaterialIcons name="logout" size={20} color="#e53e3e" />
          </View>
          <Text style={styles.signOutBtnText}>Secure Sign Out</Text>
          <MaterialIcons name="chevron-right" size={24} color={COLORS.border} />
        </TouchableOpacity>

        </View>
      </ScrollView>

      <AddressModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        initialData={editingAddress}
        addressesCount={Array.isArray(addresses) ? addresses.length : 0}
        onSuccess={() => {
          // After saving a NEW address (not editing), go to home
          if (!editingAddress) {
            router.replace('/(tabs)');
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.accent,
  },
  header: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: scale(20),
    height: scale(48),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  headerTitle: {
    fontSize: scale(16),
    fontWeight: '900',
    color: '#ffffff',
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
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(12),
    borderRadius: scale(16),
    backgroundColor: COLORS.white,
    marginBottom: scale(12),
    elevation: 3,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  avatarWrapper: {
     marginRight: 20,
     position: 'relative',
  },
  avatar: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(16),
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  avatarRing: {
     position: 'absolute',
     width: 72,
     height: 72,
     borderRadius: 28,
     borderWidth: 2,
     borderColor: COLORS.accent,
     top: -4,
     left: -4,
     zIndex: 1,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: scale(16),
    fontWeight: '900',
    color: COLORS.secondary,
    marginBottom: scale(2),
  },
  phoneBadge: {
     flexDirection: 'row',
     alignItems: 'center',
     backgroundColor: COLORS.accent,
     paddingHorizontal: scale(10),
     paddingVertical: scale(4),
     borderRadius: scale(8),
     alignSelf: 'flex-start',
  },
  userPhone: {
    fontSize: scale(12),
    color: COLORS.secondary,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.text,
  },
  addBtn: {
    backgroundColor: '#007AFF', // Blue like image 2
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    elevation: 2,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  addressCard: {
    borderRadius: scale(16),
    backgroundColor: COLORS.white,
    padding: scale(12),
    marginBottom: scale(12),
    elevation: 3,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    borderWidth: 1.5,
    borderColor: '#F8FAFC',
  },
  defaultBorder: {
    borderColor: COLORS.primary,
  },
  addressHeader: {
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'space-between',
     marginBottom: 16,
  },
  addressNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressNameText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.secondary,
  },
  addressActions: {
    flexDirection: 'row',
    gap: 10,
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trashBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E53E3E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.accent,
    marginBottom: 20,
  },
  addressRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'center',
  },
  addressLabel: {
    flex: 1,
    fontSize: 13,
    color: '#2EC4B6',
    fontWeight: '600',
  },
  labelColon: {
    paddingHorizontal: 10,
    fontSize: 13,
    color: '#2EC4B6',
    fontWeight: '600',
  },
  addressValue: {
    flex: 1.5,
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.secondary,
  },
  useAddressContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  useAddressBtn: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: COLORS.secondary,
    paddingHorizontal: 20,
    height: 54,
    borderRadius: 18,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeAddressBtn: {
    backgroundColor: COLORS.secondary,
  },
  useAddressText: {
    color: COLORS.secondary,
    fontSize: 14,
    fontWeight: '900',
  },
  centerAddBtn: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 10,
  },
  mobileAddBtn: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: scale(24),
    height: scale(42),
    borderRadius: scale(21),
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    width: '80%',
  },
  mobileAddBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  secondaryBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    height: scale(44),
    borderRadius: scale(12),
    alignItems: 'center',
    paddingHorizontal: scale(14),
    marginBottom: scale(8),
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
  },
  btnIconBox: {
     width: 40,
     height: 40,
     borderRadius: 12,
     alignItems: 'center',
     justifyContent: 'center',
     marginRight: 16,
  },
  secondaryBtnText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.secondary,
  },
  signOutBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
  },
  signOutBtnText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: '#e53e3e',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(27, 58, 58, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    width: '94%',
    height: '80%',
    padding: 20,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.secondary,
  },
  modalScroll: {
    flex: 1,
  },
  formGroup: {
    gap: 10,
  },
  fullInput: {
    backgroundColor: '#F0FDF9',
    height: scale(46),
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.secondary,
    marginBottom: 2,
    elevation: 2,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
    backgroundColor: '#F0FDF9',
    height: scale(46),
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.secondary,
    elevation: 2,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  locationLink: {
    alignSelf: 'flex-end',
    paddingVertical: 10,
  },
  locationLinkText: {
    color: '#e53e3e',
    fontWeight: '800',
    fontSize: 15,
  },
  saveBtn: {
    backgroundColor: COLORS.secondary,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    marginBottom: 40,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
});
