import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, SafeAreaView, Platform, StatusBar, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert } from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useConvexAuth } from 'convex/react';
import { api } from '@/convex/_generated/api';
import * as Location from 'expo-location';
import BackgroundAnimation from '@/components/BackgroundAnimation';
import { scale } from '@/utils/responsive';

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
  const [loadingLocation, setLoadingLocation] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated && Array.isArray(addresses)) {
      if (addresses.length === 0) {
        openAddModal();
      } else if (!editingAddress) {
        setModalVisible(false);
      }
    }
  }, [isLoading, isAuthenticated, addresses]);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    buildingName: '',
    streetNo: '',
    gateNo: '',
    floorNo: '',
    doorNo: '',
    streetName: '',
    area: '',
    location: '',
  });

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
    setFormData({
      name: user?.fullName || '',
      phone: user?.primaryPhoneNumber?.phoneNumber || '',
      buildingName: '',
      streetNo: '',
      gateNo: '',
      floorNo: '',
      doorNo: '',
      streetName: '',
      area: '',
      location: '',
    });
    setModalVisible(true);
  };

  const openEditModal = (addr: any) => {
    setEditingAddress(addr);
    setFormData({
      name: addr.name,
      phone: addr.phone,
      buildingName: addr.buildingName,
      streetNo: addr.streetNo,
      gateNo: addr.gateNo,
      floorNo: addr.floorNo,
      doorNo: addr.doorNo,
      streetName: addr.streetName,
      area: addr.area,
      location: addr.location,
    });
    setModalVisible(true);
  };

  const getCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        const msg = 'Allow location access to fetch your current address.';
        if (Platform.OS === 'web') window.alert('Permission Denied\n\n' + msg);
        else Alert.alert('Permission Denied', msg);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      let reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (reverseGeocode.length > 0) {
        const addr = reverseGeocode[0];
        setFormData(prev => ({
          ...prev,
          streetName: addr.street || '',
          area: addr.district || addr.subregion || '',
          location: `${addr.city || ''}, ${addr.region || ''}, ${addr.postalCode || ''}, ${addr.country || ''}`,
        }));
      }
    } catch (error) {
      console.error(error);
      const msg = 'Could not fetch current location.';
      if (Platform.OS === 'web') window.alert('Error\n\n' + msg);
      else Alert.alert('Error', msg);
    } finally {
      setLoadingLocation(false);
    }
  };

  const saveAddress = async () => {
    // Validate most important fields as requested: phone, street name, door no, area, location
    const mostImportant = ['phone', 'streetName', 'doorNo', 'area', 'location'];
    const missingFields: string[] = [];
    
    // Human-friendly field names for the alert
    const fieldNames: Record<string, string> = {
      phone: "Phone Number",
      streetName: "Street Name",
      doorNo: "Door No",
      area: "Area",
      location: "Location"
    };

    for (const field of mostImportant) {
      if (!formData[field as keyof typeof formData]) {
        missingFields.push(fieldNames[field] || field);
      }
    }

    if (missingFields.length > 0) {
      const message = `The following details are mandatory:\n• ${missingFields.join('\n• ')}\n\nPlease provide these details to save your address.`;
      
      if (Platform.OS === 'web') {
        window.alert(`Required Fields\n\n${message}`);
      } else {
        Alert.alert('Required Fields', message);
      }
      return;
    }

    try {
      if (editingAddress) {
        await updateAddress({
          id: editingAddress._id,
          ...formData,
          isDefault: editingAddress.isDefault,
        });
      } else {
        await createAddress({
          ...formData,
          isDefault: (addresses?.length || 0) === 0,
        });
      }
      setModalVisible(false);
      router.replace('/(tabs)');
    } catch (error) {
      console.error(error);
      const msg = 'Failed to save address to Convex.';
      if (Platform.OS === 'web') window.alert('Error\n\n' + msg);
      else Alert.alert('Error', msg);
    }
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

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
               <Text style={styles.modalTitle}>{editingAddress ? 'Edit address' : 'Add address'}</Text>
               <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <MaterialIcons name="close" size={24} color={COLORS.text} />
               </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <View style={styles.formGroup}>
                 <TextInput style={styles.fullInput} placeholder="Full Name" value={formData.name} onChangeText={(v) => setFormData(p => ({ ...p, name: v }))} />
                 <TextInput style={styles.fullInput} placeholder="Phone No" value={formData.phone} onChangeText={(v) => setFormData(p => ({ ...p, phone: v }))} keyboardType="phone-pad" />
                 <TextInput style={styles.fullInput} placeholder="Building Name" value={formData.buildingName} onChangeText={(v) => setFormData(p => ({ ...p, buildingName: v }))} />
                 
                 <View style={styles.formRow}>
                    <TextInput style={styles.halfInput} placeholder="Street No" value={formData.streetNo} onChangeText={(v) => setFormData(p => ({ ...p, streetNo: v }))} keyboardType="numeric" />
                    <TextInput style={styles.halfInput} placeholder="Gate No" value={formData.gateNo} onChangeText={(v) => setFormData(p => ({ ...p, gateNo: v }))} />
                 </View>

                 <View style={styles.formRow}>
                    <TextInput style={styles.halfInput} placeholder="Floor No" value={formData.floorNo} onChangeText={(v) => setFormData(p => ({ ...p, floorNo: v }))} keyboardType="numeric" />
                    <TextInput style={styles.halfInput} placeholder="Door No" value={formData.doorNo} onChangeText={(v) => setFormData(p => ({ ...p, doorNo: v }))} keyboardType="numeric" />
                 </View>

                 <TextInput style={styles.fullInput} placeholder="Street Name" value={formData.streetName} onChangeText={(v) => setFormData(p => ({ ...p, streetName: v }))} />
                 <TextInput style={styles.fullInput} placeholder="Area" value={formData.area} onChangeText={(v) => setFormData(p => ({ ...p, area: v }))} />
                 <TextInput style={styles.fullInput} placeholder="Location" value={formData.location} onChangeText={(v) => setFormData(p => ({ ...p, location: v }))} multiline />

                 <TouchableOpacity style={styles.locationLink} onPress={getCurrentLocation} disabled={loadingLocation}>
                    {loadingLocation ? <ActivityIndicator size="small" color="#e53e3e" /> : <Text style={styles.locationLinkText}>Get current address</Text>}
                 </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={saveAddress}>
                 <Text style={styles.saveBtnText}>SAVE ADDRESS</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
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
