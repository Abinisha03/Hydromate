import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Modal, TextInput, ActivityIndicator, Platform, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
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

interface AddressModalProps {
  visible: boolean;
  onClose: () => void;
  initialData?: any;
  userId?: string;
  onSuccess?: () => void;
  addressesCount: number;
  addresses?: any[];
}

export default function AddressModal({ visible, onClose, initialData, onSuccess, addressesCount, addresses }: AddressModalProps) {
  const createAddress = useMutation(api.addresses.createAddress);
  const updateAddress = useMutation(api.addresses.updateAddress);
  const setDefaultAddress = useMutation(api.addresses.setDefaultAddress);
  const deleteAddress = useMutation(api.addresses.deleteAddress);
  
  const [loadingLocation, setLoadingLocation] = useState(false);
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
    pincode: '',
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      if (initialData) {
        setEditingId(initialData._id);
        setFormData({
          name: initialData.name || '',
          phone: initialData.phone || '',
          buildingName: initialData.buildingName || '',
          streetNo: initialData.streetNo || '',
          gateNo: initialData.gateNo || '',
          floorNo: initialData.floorNo || '',
          doorNo: initialData.doorNo || '',
          streetName: initialData.streetName || '',
          area: initialData.area || '',
          location: initialData.location || '',
          pincode: initialData.pincode || '',
        });
      } else {
        setFormData({
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
          pincode: '',
        });
        setEditingId(null);
      }
    }
  }, [visible, initialData]);

  const getCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        const msg = 'Please enable location services (GPS) in your device settings.';
        if (Platform.OS === 'web') window.alert('Location Disabled\n\n' + msg);
        else Alert.alert('Location Disabled', msg);
        return;
      }

      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        const msg = 'Allow location access to fetch your current address.';
        if (Platform.OS === 'web') window.alert('Permission Denied\n\n' + msg);
        else Alert.alert('Permission Denied', msg);
        return;
      }

      let location = await Location.getCurrentPositionAsync({ 
        accuracy: Platform.OS === 'android' ? Location.Accuracy.Low : Location.Accuracy.High 
      });
      let reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (reverseGeocode.length > 0) {
        const addr = reverseGeocode[0];
        console.log('Detected Address:', addr);
        setFormData(prev => ({
          ...prev,
          streetName: addr.street || addr.name || '',
          area: addr.district || addr.subregion || addr.city || '',
          location: `${addr.city || addr.region || ''}, ${addr.region || ''}`,
          pincode: addr.postalCode || '',
        }));
      }
    } catch (error) {
      console.error(error);
      const msg = 'Could not fetch current location. Please try manually.';
      if (Platform.OS === 'web') window.alert('Error\n\n' + msg);
      else Alert.alert('Error', msg);
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleEditAddress = (address: any) => {
    setEditingId(address._id);
    setFormData({
      name: address.name || '',
      phone: address.phone || '',
      buildingName: address.buildingName || '',
      streetNo: address.streetNo || '',
      gateNo: address.gateNo || '',
      floorNo: address.floorNo || '',
      doorNo: address.doorNo || '',
      streetName: address.streetName || '',
      area: address.area || '',
      location: address.location || '',
      pincode: address.pincode || '',
    });
  };

  const handleDeleteAddress = async (id: any) => {
    try {
      if (Platform.OS === 'web') {
        if (!window.confirm('Delete this address?')) return;
      } else {
        const confirmed = await new Promise(resolve => {
          Alert.alert('Delete Address', 'Are you sure?', [
            { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
            { text: 'Delete', onPress: () => resolve(true), style: 'destructive' }
          ]);
        });
        if (!confirmed) return;
      }
      await deleteAddress({ id });
    } catch (err) {
      console.error(err);
    }
  };

  const saveAddress = async () => {
    const { name, phone, buildingName, streetNo, gateNo, floorNo, doorNo, streetName, area, location, pincode } = formData;
    
    // 1. Name validation: 3-30 characters, only letters
    if (!name || name.length < 3 || name.length > 30 || !/^[a-zA-Z\s]+$/.test(name)) {
      const msg = 'Name must be 3-30 characters and contain only letters.';
      if (Platform.OS === 'web') window.alert(msg); else Alert.alert('Invalid Name', msg);
      return;
    }

    // 2. Mobile Number validation: Exactly 10 digits
    if (!phone || phone.length !== 10 || !/^\d{10}$/.test(phone)) {
      const msg = 'Mobile number must be exactly 10 digits.';
      if (Platform.OS === 'web') window.alert(msg); else Alert.alert('Invalid Mobile', msg);
      return;
    }

    // 3. Building Name validation: 3-50 characters, letters + numbers
    if (!buildingName || buildingName.length < 3 || buildingName.length > 50 || !/^[a-zA-Z0-9\s]+$/.test(buildingName)) {
      const msg = 'Building Name must be 3-50 characters (letters and numbers only).';
      if (Platform.OS === 'web') window.alert(msg); else Alert.alert('Invalid Building', msg);
      return;
    }

    // 4. Street No validation: 1-6 digits, numbers only
    if (!streetNo || streetNo.length < 1 || streetNo.length > 6 || !/^\d+$/.test(streetNo)) {
      const msg = 'Street No must be 1-6 digits (numbers only).';
      if (Platform.OS === 'web') window.alert(msg); else Alert.alert('Invalid Street No', msg);
      return;
    }

    // 5. Gate No validation: 1-10 characters, letters + numbers
    if (!gateNo || gateNo.length < 1 || gateNo.length > 10 || !/^[a-zA-Z0-9\s]+$/.test(gateNo)) {
      const msg = 'Gate No must be 1-10 characters (letters and numbers only).';
      if (Platform.OS === 'web') window.alert(msg); else Alert.alert('Invalid Gate No', msg);
      return;
    }

    // 6. Floor No validation: 0-100 range, 1-3 digits
    const floorNum = parseInt(floorNo, 10);
    if (floorNo === '' || isNaN(floorNum) || floorNum < 0 || floorNum > 100 || floorNo.length > 3) {
      const msg = 'Floor No must be a number between 0 and 100 (max 3 digits).';
      if (Platform.OS === 'web') window.alert(msg); else Alert.alert('Invalid Floor No', msg);
      return;
    }

    // 7. Door No validation: 1-1000 range, 1-4 digits
    const doorNum = parseInt(doorNo, 10);
    if (doorNo === '' || isNaN(doorNum) || doorNum < 1 || doorNum > 1000 || doorNo.length > 4) {
      const msg = 'Door No must be a number between 1 and 1000 (max 4 digits).';
      if (Platform.OS === 'web') window.alert(msg); else Alert.alert('Invalid Door No', msg);
      return;
    }

    // 8. Street Name validation (Optional): 3-50 characters, letters only
    if (streetName && (streetName.length < 3 || streetName.length > 50 || !/^[a-zA-Z\s]+$/.test(streetName))) {
      const msg = 'Street Name must be 3-50 characters and contain only letters.';
      if (Platform.OS === 'web') window.alert(msg); else Alert.alert('Invalid Street Name', msg);
      return;
    }

    // 9. Area validation (Optional): 3-50 characters
    if (area && (area.length < 3 || area.length > 50)) {
      const msg = 'Area must be 3-50 characters.';
      if (Platform.OS === 'web') window.alert(msg); else Alert.alert('Invalid Area', msg);
      return;
    }

    // 10. Location validation: 10-150 characters, must include pincode
    const combinedAddress = `${location} ${pincode}`.trim();
    if (combinedAddress.length < 10 || combinedAddress.length > 150 || !/\d{6}/.test(combinedAddress)) {
      const msg = 'Full Address (Location + Pincode) must be 10-150 characters and include a valid 6-digit pincode.';
      if (Platform.OS === 'web') window.alert(msg); else Alert.alert('Invalid Location', msg);
      return;
    }

    try {
      if (editingId) {
        await updateAddress({
          id: editingId as any,
          ...formData,
          isDefault: initialData?.isDefault || false,
        });
      } else {
        await createAddress({
          ...formData,
          isDefault: addressesCount === 0,
        });
      }
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error(error);
      const msg = 'Failed to save address.';
      if (Platform.OS === 'web') window.alert('Error\n\n' + msg);
      else Alert.alert('Error', msg);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{initialData ? 'Edit address' : 'Add address'}</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll}>
            <View style={styles.formGroup}>
              <TextInput 
                style={styles.fullInput} 
                placeholder="Full Name" 
                placeholderTextColor="#108678" 
                value={formData.name} 
                onChangeText={(v) => setFormData(p => ({ ...p, name: v.replace(/[^a-zA-Z\s]/g, '').slice(0, 30) }))} 
              />
              <TextInput 
                style={styles.fullInput} 
                placeholder="Phone No" 
                placeholderTextColor="#108678" 
                value={formData.phone} 
                onChangeText={(v) => {
                  const cleaned = v.replace(/[^0-9]/g, '').slice(0, 10);
                  setFormData(p => ({ ...p, phone: cleaned }));
                }} 
                keyboardType="phone-pad" 
                maxLength={10}
              />
              <TextInput 
                style={styles.fullInput} 
                placeholder="Building Name" 
                placeholderTextColor="#108678" 
                value={formData.buildingName} 
                onChangeText={(v) => setFormData(p => ({ ...p, buildingName: v.replace(/[^a-zA-Z0-9\s]/g, '').slice(0, 50) }))} 
              />
              
              <View style={styles.formRow}>
                <TextInput 
                  style={styles.halfInput} 
                  placeholder="Street No" 
                  placeholderTextColor="#108678" 
                  value={formData.streetNo} 
                  onChangeText={(v) => setFormData(p => ({ ...p, streetNo: v.replace(/[^0-9]/g, '').slice(0, 6) }))} 
                  keyboardType="numeric"
                />
                <TextInput 
                  style={styles.halfInput} 
                  placeholder="Gate No" 
                  placeholderTextColor="#108678" 
                  value={formData.gateNo} 
                  onChangeText={(v) => setFormData(p => ({ ...p, gateNo: v.replace(/[^a-zA-Z0-9\s]/g, '').slice(0, 10) }))} 
                />
              </View>

              <View style={styles.formRow}>
                <TextInput 
                  style={styles.halfInput} 
                  placeholder="Floor No" 
                  placeholderTextColor="#108678" 
                  value={formData.floorNo} 
                  onChangeText={(v) => setFormData(p => ({ ...p, floorNo: v.replace(/[^0-9]/g, '').slice(0, 3) }))} 
                  keyboardType="numeric"
                />
                <TextInput 
                  style={styles.halfInput} 
                  placeholder="Door No" 
                  placeholderTextColor="#108678" 
                  value={formData.doorNo} 
                  onChangeText={(v) => setFormData(p => ({ ...p, doorNo: v.replace(/[^0-9]/g, '').slice(0, 4) }))} 
                  keyboardType="numeric"
                />
              </View>

              <TextInput 
                style={styles.fullInput} 
                placeholder="Street Name" 
                placeholderTextColor="#108678" 
                value={formData.streetName} 
                onChangeText={(v) => setFormData(p => ({ ...p, streetName: v.replace(/[^a-zA-Z\s]/g, '').slice(0, 50) }))} 
              />
              <TextInput
                style={styles.fullInput}
                placeholder="Area Name"
                placeholderTextColor="#108678"
                value={formData.area}
                onChangeText={(text) => setFormData({ ...formData, area: text.slice(0, 50) })}
              />

              <View style={styles.formRow}>
                <TextInput
                  style={[styles.halfInput, { flex: 2 }]}
                  placeholder="City / Location"
                  placeholderTextColor="#108678"
                  value={formData.location}
                  onChangeText={(text) => setFormData({ ...formData, location: text.slice(0, 150) })}
                />
                <TextInput
                  style={[styles.halfInput, { flex: 1 }]}
                  placeholder="Pincode"
                  placeholderTextColor="#108678"
                  value={formData.pincode}
                  onChangeText={(v) => {
                    const cleaned = v.replace(/[^0-9]/g, '').slice(0, 6);
                    setFormData(p => ({ ...p, pincode: cleaned }));
                  }}
                  keyboardType="numeric"
                  maxLength={6}
                />
              </View>

              <TouchableOpacity style={styles.locationLink} onPress={getCurrentLocation} disabled={loadingLocation}>
                <MaterialIcons name="my-location" size={16} color="#e53e3e" style={{ marginRight: 4 }} />
                {loadingLocation ? <ActivityIndicator size="small" color="#e53e3e" /> : <Text style={styles.locationLinkText}>Get current address</Text>}
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={saveAddress}>
              <Text style={styles.saveBtnText}>SAVE ADDRESS</Text>
            </TouchableOpacity>

            {/* Saved Addresses Section */}
            {addresses && addresses.length > 0 && (
              <View style={styles.savedAddressesContainer}>
                <Text style={styles.savedAddressesTitle}>Saved Addresses</Text>
                {addresses.map((addr) => (
                  <View key={addr._id} style={[styles.addressItem, addr.isDefault && styles.defaultItem]}>
                    <View style={styles.addressInfo}>
                      <Text style={styles.addressName}>{addr.name} {addr.isDefault && <Text style={styles.defaultLabel}>(Default)</Text>}</Text>
                      <Text style={styles.addressText} numberOfLines={2}>
                        {addr.buildingName ? `${addr.buildingName}, ` : ''}{addr.doorNo ? `Door ${addr.doorNo}, ` : ''}{addr.streetName}, {addr.area}, {addr.location} - {addr.pincode}
                      </Text>
                    </View>
                    <View style={styles.addressActions}>
                       {!addr.isDefault && (
                         <TouchableOpacity 
                           onPress={() => setDefaultAddress({ id: addr._id })}
                           style={styles.actionIcon}
                         >
                           <MaterialIcons name="check-circle-outline" size={20} color={COLORS.gray} />
                         </TouchableOpacity>
                       )}
                       <TouchableOpacity 
                         onPress={() => handleEditAddress(addr)}
                         style={styles.actionIcon}
                       >
                         <MaterialIcons name="edit" size={20} color={COLORS.primary} />
                       </TouchableOpacity>
                       <TouchableOpacity 
                         onPress={() => handleDeleteAddress(addr._id)}
                         style={styles.actionIcon}
                       >
                         <MaterialIcons name="delete-outline" size={20} color="#e53e3e" />
                       </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(27, 58, 58, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '88%',
    height: '70%',
    paddingHorizontal: 25,
    paddingVertical: 15,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.secondary,
  },
  modalScroll: {
    flex: 1,
  },
  formGroup: {
    gap: 6,
  },
  fullInput: {
    backgroundColor: '#F0FDF9',
    minHeight: 45,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.secondary,
    textAlignVertical: 'center',
    marginBottom: 0,
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
    minHeight: 45,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.secondary,
    textAlignVertical: 'center',
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
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  savedAddressesContainer: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 15,
  },
  savedAddressesTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.secondary,
    marginBottom: 12,
  },
  addressItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  defaultItem: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0FDF9',
  },
  addressInfo: {
    flex: 1,
  },
  addressName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 2,
  },
  defaultLabel: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '900',
  },
  addressText: {
    fontSize: 12,
    color: COLORS.gray,
    lineHeight: 16,
  },
  addressActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 10,
  },
  actionIcon: {
    padding: 6,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
});
