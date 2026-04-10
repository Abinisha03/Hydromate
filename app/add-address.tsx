import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Platform, Alert, SafeAreaView } from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useRouter } from 'expo-router';
import { skipAddressSetup } from './_layout';

const COLORS = {
  primary: '#2EC4B6',
  secondary: '#0F9D8A',
  accent: '#E8FFF9',
  text: '#1B3A3A',
  white: '#FFFFFF',
  gray: '#718096',
  border: '#E2E8F0',
};

export default function AddAddressScreen() {
  const router = useRouter();
  const createAddress = useMutation(api.addresses.createAddress);
  const addresses = useQuery(api.addresses.getAddresses);
  
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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

  const handleCancel = () => {
    // Mark as skipped for this session so layout doesn't redirect back
    skipAddressSetup();
    router.replace('/(tabs)');
  };

  const saveAddress = async () => {
    const { name, phone, buildingName, streetNo, gateNo, floorNo, doorNo, streetName, area, location, pincode } = formData;
    
    // Validation (Copied from AddressModal for consistency)
    if (!name || name.length < 3 || name.length > 30 || !/^[a-zA-Z\s]+$/.test(name)) {
      const msg = 'Name must be 3-30 characters and contain only letters.';
      if (Platform.OS === 'web') window.alert(msg); else Alert.alert('Invalid Name', msg);
      return;
    }

    if (!phone || phone.length !== 10 || !/^\d{10}$/.test(phone)) {
      const msg = 'Mobile number must be exactly 10 digits.';
      if (Platform.OS === 'web') window.alert(msg); else Alert.alert('Invalid Mobile', msg);
      return;
    }

    if (!buildingName || buildingName.length < 3 || buildingName.length > 50 || !/^[a-zA-Z0-9\s]+$/.test(buildingName)) {
      const msg = 'Building Name must be 3-50 characters (letters and numbers only).';
      if (Platform.OS === 'web') window.alert(msg); else Alert.alert('Invalid Building', msg);
      return;
    }

    if (!streetNo || streetNo.length < 1 || streetNo.length > 6 || !/^\d+$/.test(streetNo)) {
      const msg = 'Street No must be 1-6 digits (numbers only).';
      if (Platform.OS === 'web') window.alert(msg); else Alert.alert('Invalid Street No', msg);
      return;
    }

    if (!gateNo || gateNo.length < 1 || gateNo.length > 10 || !/^[a-zA-Z0-9\s]+$/.test(gateNo)) {
      const msg = 'Gate No must be 1-10 characters (letters and numbers only).';
      if (Platform.OS === 'web') window.alert(msg); else Alert.alert('Invalid Gate No', msg);
      return;
    }

    const floorNum = parseInt(floorNo, 10);
    if (floorNo === '' || isNaN(floorNum) || floorNum < 0 || floorNum > 100 || floorNo.length > 3) {
      const msg = 'Floor No must be a number between 0 and 100 (max 3 digits).';
      if (Platform.OS === 'web') window.alert(msg); else Alert.alert('Invalid Floor No', msg);
      return;
    }

    const doorNum = parseInt(doorNo, 10);
    if (doorNo === '' || isNaN(doorNum) || doorNum < 1 || doorNum > 1000 || doorNo.length > 4) {
      const msg = 'Door No must be a number between 1 and 1000 (max 4 digits).';
      if (Platform.OS === 'web') window.alert(msg); else Alert.alert('Invalid Door No', msg);
      return;
    }

    if (streetName && (streetName.length < 3 || streetName.length > 50 || !/^[a-zA-Z\s]+$/.test(streetName))) {
      const msg = 'Street Name must be 3-50 characters and contain only letters.';
      if (Platform.OS === 'web') window.alert(msg); else Alert.alert('Invalid Street Name', msg);
      return;
    }

    const combinedAddress = `${location} ${pincode}`.trim();
    if (combinedAddress.length < 10 || combinedAddress.length > 150 || !/\d{6}/.test(combinedAddress)) {
      const msg = 'Full Address (Location + Pincode) must be 10-150 characters and include a valid 6-digit pincode.';
      if (Platform.OS === 'web') window.alert(msg); else Alert.alert('Invalid Location', msg);
      return;
    }

    setIsSaving(true);
    try {
      await createAddress({
        ...formData,
        isDefault: true,
      });
      router.replace('/(tabs)');
    } catch (error) {
      console.error(error);
      const msg = 'Failed to save address.';
      if (Platform.OS === 'web') window.alert('Error\n\n' + msg);
      else Alert.alert('Error', msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.welcomeText}>Welcome to</Text>
          <Text style={styles.brandText}>HYDROMATE</Text>
        </View>
        <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
          <MaterialIcons name="close" size={28} color={COLORS.secondary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.illustrationCard}>
          <FontAwesome5 name="map-marker-alt" size={40} color={COLORS.primary} />
          <Text style={styles.setupTitle}>Add Delivery Address</Text>
          <Text style={styles.setupSubtitle}>Please provide your delivery location to continue exploring pure hydration.</Text>
        </View>

        <View style={styles.formCard}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Personal Details</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Full Name" 
              placeholderTextColor="#108678" 
              value={formData.name} 
              onChangeText={(v) => setFormData(p => ({ ...p, name: v.replace(/[^a-zA-Z\s]/g, '').slice(0, 30) }))} 
            />
            <TextInput 
              style={styles.input} 
              placeholder="Phone Number (10 digits)" 
              placeholderTextColor="#108678" 
              value={formData.phone} 
              onChangeText={(v) => setFormData(p => ({ ...p, phone: v.replace(/[^0-9]/g, '').slice(0, 10) }))} 
              keyboardType="phone-pad" 
              maxLength={10}
            />

            <Text style={[styles.label, { marginTop: 12 }]}>Address Details</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Building Name" 
              placeholderTextColor="#108678" 
              value={formData.buildingName} 
              onChangeText={(v) => setFormData(p => ({ ...p, buildingName: v.replace(/[^a-zA-Z0-9\s]/g, '').slice(0, 50) }))} 
            />
            
            <View style={styles.row}>
              <TextInput 
                style={[styles.input, { flex: 1 }]} 
                placeholder="Street No" 
                placeholderTextColor="#108678" 
                value={formData.streetNo} 
                onChangeText={(v) => setFormData(p => ({ ...p, streetNo: v.replace(/[^0-9]/g, '').slice(0, 6) }))} 
                keyboardType="numeric"
              />
              <TextInput 
                style={[styles.input, { flex: 1 }]} 
                placeholder="Gate No" 
                placeholderTextColor="#108678" 
                value={formData.gateNo} 
                onChangeText={(v) => setFormData(p => ({ ...p, gateNo: v.replace(/[^a-zA-Z0-9\s]/g, '').slice(0, 10) }))} 
              />
            </View>

            <View style={styles.row}>
              <TextInput 
                style={[styles.input, { flex: 1 }]} 
                placeholder="Floor No" 
                placeholderTextColor="#108678" 
                value={formData.floorNo} 
                onChangeText={(v) => setFormData(p => ({ ...p, floorNo: v.replace(/[^0-9]/g, '').slice(0, 3) }))} 
                keyboardType="numeric"
              />
              <TextInput 
                style={[styles.input, { flex: 1 }]} 
                placeholder="Door No" 
                placeholderTextColor="#108678" 
                value={formData.doorNo} 
                onChangeText={(v) => setFormData(p => ({ ...p, doorNo: v.replace(/[^0-9]/g, '').slice(0, 4) }))} 
                keyboardType="numeric"
              />
            </View>

            <TextInput 
              style={styles.input} 
              placeholder="Street Name" 
              placeholderTextColor="#108678" 
              value={formData.streetName} 
              onChangeText={(v) => setFormData(p => ({ ...p, streetName: v.replace(/[^a-zA-Z\s]/g, '').slice(0, 50) }))} 
            />
            
            <TextInput
              style={styles.input}
              placeholder="Area Name"
              placeholderTextColor="#108678"
              value={formData.area}
              onChangeText={(text) => setFormData({ ...formData, area: text.slice(0, 50) })}
            />

            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 2 }]}
                placeholder="City / Location"
                placeholderTextColor="#108678"
                value={formData.location}
                onChangeText={(text) => setFormData({ ...formData, location: text.slice(0, 150) })}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Pincode"
                placeholderTextColor="#108678"
                value={formData.pincode}
                onChangeText={(v) => setFormData(p => ({ ...p, pincode: v.replace(/[^0-9]/g, '').slice(0, 6) }))}
                keyboardType="numeric"
                maxLength={6}
              />
            </View>

            <TouchableOpacity style={styles.locationButton} onPress={getCurrentLocation} disabled={loadingLocation}>
              <MaterialIcons name="my-location" size={18} color="#e53e3e" style={{ marginRight: 8 }} />
              {loadingLocation ? <ActivityIndicator size="small" color="#e53e3e" /> : <Text style={styles.locationButtonText}>Get Current Location</Text>}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={saveAddress} disabled={isSaving}>
            {isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>SAVE & CONTINUE</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#E8FFF9',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 14,
    color: COLORS.secondary,
    fontWeight: '600',
  },
  brandText: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.secondary,
    letterSpacing: 2,
  },
  cancelButton: {
    padding: 8,
    backgroundColor: '#FFF',
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingTop: 10,
  },
  illustrationCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 4,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  setupTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.secondary,
    marginTop: 12,
  },
  setupSubtitle: {
    fontSize: 13,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    elevation: 4,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.secondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  formGroup: {
    gap: 8,
  },
  input: {
    backgroundColor: '#F0FDF9',
    minHeight: 50,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.secondary,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  locationButtonText: {
    color: '#e53e3e',
    fontWeight: '800',
    fontSize: 15,
  },
  saveButton: {
    backgroundColor: COLORS.secondary,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    elevation: 4,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
