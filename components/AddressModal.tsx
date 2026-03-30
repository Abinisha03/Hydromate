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
}

export default function AddressModal({ visible, onClose, initialData, onSuccess, addressesCount }: AddressModalProps) {
  const createAddress = useMutation(api.addresses.createAddress);
  const updateAddress = useMutation(api.addresses.updateAddress);
  
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

  useEffect(() => {
    if (visible) {
      if (initialData) {
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
      }
    }
  }, [visible, initialData]);

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
          location: `${addr.city || ''}, ${addr.region || ''}, ${addr.country || ''}`,
          pincode: addr.postalCode || '',
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
    const mostImportant = ['phone', 'streetName', 'doorNo', 'area', 'location'];
    const missingFields: string[] = [];
    const fieldNames: Record<string, string> = {
      phone: "Phone Number",
      streetName: "Street Name",
      doorNo: "Door No",
      area: "Area",
      location: "Location",
    };

    for (const field of mostImportant) {
      if (!formData[field as keyof typeof formData]) {
        missingFields.push(fieldNames[field] || field);
      }
    }

    if (missingFields.length > 0) {
      const message = `The following details are mandatory:\n• ${missingFields.join('\n• ')}\n\nPlease provide these details to save your address.`;
      if (Platform.OS === 'web') window.alert(`Required Fields\n\n${message}`);
      else Alert.alert('Required Fields', message);
      return;
    }

    try {
      if (initialData?._id) {
        await updateAddress({
          id: initialData._id,
          ...formData,
          isDefault: initialData.isDefault,
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
              <TextInput style={styles.fullInput} placeholder="Full Name" placeholderTextColor="#108678" value={formData.name} onChangeText={(v) => setFormData(p => ({ ...p, name: v }))} />
              <TextInput style={styles.fullInput} placeholder="Phone No" placeholderTextColor="#108678" value={formData.phone} onChangeText={(v) => setFormData(p => ({ ...p, phone: v }))} keyboardType="phone-pad" />
              <TextInput style={styles.fullInput} placeholder="Building Name" placeholderTextColor="#108678" value={formData.buildingName} onChangeText={(v) => setFormData(p => ({ ...p, buildingName: v }))} />
              
              <View style={styles.formRow}>
                <TextInput style={styles.halfInput} placeholder="Street No" placeholderTextColor="#108678" value={formData.streetNo} onChangeText={(v) => setFormData(p => ({ ...p, streetNo: v }))} keyboardType="numeric" />
                <TextInput style={styles.halfInput} placeholder="Gate No" placeholderTextColor="#108678" value={formData.gateNo} onChangeText={(v) => setFormData(p => ({ ...p, gateNo: v }))} />
              </View>

              <View style={styles.formRow}>
                <TextInput style={styles.halfInput} placeholder="Floor No" placeholderTextColor="#108678" value={formData.floorNo} onChangeText={(v) => setFormData(p => ({ ...p, floorNo: v }))} keyboardType="numeric" />
                <TextInput style={styles.halfInput} placeholder="Door No" placeholderTextColor="#108678" value={formData.doorNo} onChangeText={(v) => setFormData(p => ({ ...p, doorNo: v }))} keyboardType="numeric" />
              </View>

              <TextInput style={styles.fullInput} placeholder="Street Name" placeholderTextColor="#108678" value={formData.streetName} onChangeText={(v) => setFormData(p => ({ ...p, streetName: v }))} />
              <TextInput
                style={styles.fullInput}
                placeholder="Area Name"
                placeholderTextColor="#108678"
                value={formData.area}
                onChangeText={(text) => setFormData({ ...formData, area: text })}
              />

              <TextInput
                style={styles.fullInput}
                placeholder="City/Location"
                placeholderTextColor="#108678"
                value={formData.location}
                onChangeText={(text) => setFormData({ ...formData, location: text })}
              />

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
    height: 32,
    borderRadius: 6,
    paddingHorizontal: 10,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.secondary,
    marginBottom: 0,
    elevation: 1,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
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
    height: 32,
    borderRadius: 6,
    paddingHorizontal: 10,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.secondary,
    elevation: 1,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
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
});
