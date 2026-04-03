import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert, StatusBar, SafeAreaView } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { useRouter, Stack } from 'expo-router';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

const COLORS = {
  primary: '#2EC4B6',
  secondary: '#0F9D8A',
  accent: '#E8FFF9',
  text: '#1B3A3A',
  white: '#FFFFFF',
  gray: '#718096',
  border: '#E2E8F0',
};

export default function CheckoutScreen() {
  const { user } = useUser();
  const router = useRouter();
  const createAddress = useMutation(api.addresses.createAddress);

  const [form, setForm] = useState({
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

  // Pre-fill from Clerk
  React.useEffect(() => {
    if (user) {
      setForm(prev => ({
        ...prev,
        name: prev.name || user.fullName || user.firstName || '',
        phone: prev.phone || user.primaryPhoneNumber?.phoneNumber?.replace('+91', '') || '',
      }));
    }
  }, [user]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateForm = (key: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleSave = async () => {
    const { name, phone, buildingName, streetNo, gateNo, floorNo, doorNo, streetName, area, location, pincode } = form;

    // 1. Name validation (REQUIRED): 3-30 characters, only letters
    if (!name || name.length < 3 || name.length > 30 || !/^[a-zA-Z\s]+$/.test(name)) {
      showAlert('Invalid Name', 'Name must be 3-30 characters and contain only letters.');
      return;
    }

    // 2. Mobile Number validation (REQUIRED): Exactly 10 digits
    if (!phone || phone.length !== 10 || !/^\d{10}$/.test(phone)) {
      showAlert('Invalid Mobile', 'Mobile number must be exactly 10 digits.');
      return;
    }

    // 3. Building Name validation (Optional): 3-50 characters, letters + numbers
    if (buildingName && (buildingName.length < 3 || buildingName.length > 50 || !/^[a-zA-Z0-9\s-]+$/.test(buildingName))) {
      showAlert('Invalid Building', 'Building Name must be 3-50 characters (letters, numbers and hyphens only).');
      return;
    }

    // 4. Street No validation (Optional): 1-10 characters, numbers + letters
    if (streetNo && (streetNo.length < 1 || streetNo.length > 10 || !/^[a-zA-Z0-9\s/-]+$/.test(streetNo))) {
      showAlert('Invalid Street No', 'Street No must be 1-10 characters (numbers and letters only).');
      return;
    }

    // 5. Gate No validation (Optional): 1-10 characters, letters + numbers
    if (gateNo && (gateNo.length < 1 || gateNo.length > 10 || !/^[a-zA-Z0-9\s-]+$/.test(gateNo))) {
      showAlert('Invalid Gate No', 'Gate No must be 1-10 characters (letters and numbers only).');
      return;
    }

    // 6. Floor No validation (Optional): 0-100 range, 1-3 digits
    if (floorNo) {
      const floorNum = parseInt(floorNo, 10);
      if (isNaN(floorNum) || floorNum < 0 || floorNum > 100 || floorNo.length > 3) {
        showAlert('Invalid Floor No', 'Floor No must be a number between 0 and 100 (max 3 digits).');
        return;
      }
    }

    // 7. Door No validation (Optional): 1-10 characters
    if (doorNo && (doorNo.length < 1 || doorNo.length > 10 || !/^[a-zA-Z0-9\s/-]+$/.test(doorNo))) {
      showAlert('Invalid Door No', 'Door No must be 1-10 characters (e.g., 201 or 12/A).');
      return;
    }

    // 8. Street Name validation (REQUIRED): 3-50 characters, letters only
    if (!streetName || streetName.length < 3 || streetName.length > 50 || !/^[a-zA-Z\s]+$/.test(streetName)) {
      showAlert('Invalid Street Name', 'Street Name must be 3-50 characters and contain only letters.');
      return;
    }

    // 9. Area validation (REQUIRED): 3-50 characters
    if (!area || area.length < 3 || area.length > 50) {
      showAlert('Invalid Area', 'Area must be 3-50 characters.');
      return;
    }

    // 10. Location validation (REQUIRED): 3-150 characters
    if (!location || location.length < 3 || location.length > 150) {
      showAlert('Invalid Location', 'Full Location must be 3-150 characters.');
      return;
    }

    // 11. Pincode validation (REQUIRED): Exactly 6 digits
    if (!pincode || pincode.length !== 6 || !/^\d{6}$/.test(pincode)) {
      showAlert('Invalid Pincode', 'Pincode must be exactly 6 digits.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createAddress({
        name,
        phone,
        buildingName: buildingName || '-',
        streetNo: streetNo || '-',
        gateNo: gateNo || '-',
        floorNo: floorNo || '-',
        doorNo: doorNo || '-',
        streetName,
        area,
        location,
        pincode,
        isDefault: true,
      });
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Address save error:', error);
      showAlert('Error', 'Failed to save address. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} />
      <Stack.Screen 
        options={{ 
          title: 'Delivery Address', 
          headerTintColor: '#fff', 
          headerStyle: { backgroundColor: COLORS.secondary },
          headerTitleStyle: { fontWeight: '900' }
        }} 
      />

      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container}>
          
          <View style={styles.headerInfo}>
             <Text style={styles.headerTitle}>Where should we deliver?</Text>
             <Text style={styles.headerSubtitle}>Please provide accurate details for a seamless wellness delivery.</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
               <Text style={styles.inputLabel}>Full Name</Text>
               <TextInput
                style={styles.inputFull}
                placeholder="e.g. John Doe"
                placeholderTextColor="#A0AEC0"
                value={form.name}
                onChangeText={(v) => updateForm('name', v.replace(/[^a-zA-Z\s]/g, '').slice(0, 30))}
              />
            </View>

            <View style={styles.inputGroup}>
               <Text style={styles.inputLabel}>Mobile Number</Text>
               <TextInput
                style={styles.inputFull}
                placeholder="10 digit mobile number"
                placeholderTextColor="#A0AEC0"
                value={form.phone}
                onChangeText={(v) => updateForm('phone', v.replace(/[^0-9]/g, '').slice(0, 10))}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>

            <View style={styles.inputGroup}>
               <Text style={styles.inputLabel}>Building Name</Text>
               <TextInput
                style={styles.inputFull}
                placeholder="e.g. Wellness Heights"
                placeholderTextColor="#A0AEC0"
                value={form.buildingName}
                onChangeText={(v) => updateForm('buildingName', v.replace(/[^a-zA-Z0-9\s-]/g, '').slice(0, 50))}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { width: '48%' }]}>
                <Text style={styles.inputLabel}>Street No</Text>
                <TextInput
                  style={styles.inputHalf}
                  placeholder="00"
                  placeholderTextColor="#A0AEC0"
                  value={form.streetNo}
                  onChangeText={(v) => updateForm('streetNo', v.replace(/[^a-zA-Z0-9\s/-]/g, '').slice(0, 10))}
                />
              </View>
              <View style={[styles.inputGroup, { width: '48%' }]}>
                <Text style={styles.inputLabel}>Gate No</Text>
                <TextInput
                  style={styles.inputHalf}
                  placeholder="00"
                  placeholderTextColor="#A0AEC0"
                  value={form.gateNo}
                  onChangeText={(v) => updateForm('gateNo', v.replace(/[^a-zA-Z0-9\s-]/g, '').slice(0, 10))}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { width: '48%' }]}>
                <Text style={styles.inputLabel}>Floor No</Text>
                <TextInput
                  style={styles.inputHalf}
                  placeholder="00"
                  placeholderTextColor="#A0AEC0"
                  value={form.floorNo}
                  onChangeText={(v) => updateForm('floorNo', v.replace(/[^0-9]/g, '').slice(0, 3))}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { width: '48%' }]}>
                <Text style={styles.inputLabel}>Door No</Text>
                <TextInput
                  style={styles.inputHalf}
                  placeholder="8/218A"
                  placeholderTextColor="#A0AEC0"
                  value={form.doorNo}
                  onChangeText={(v) => updateForm('doorNo', v.replace(/[^a-zA-Z0-9\s/-]/g, '').slice(0, 10))}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
               <Text style={styles.inputLabel}>Street Name *</Text>
               <TextInput
                style={styles.inputFull}
                placeholder="CSI Church Street"
                placeholderTextColor="#A0AEC0"
                value={form.streetName}
                onChangeText={(v) => updateForm('streetName', v.replace(/[^a-zA-Z\s]/g, '').slice(0, 50))}
              />
            </View>

            <View style={styles.inputGroup}>
               <Text style={styles.inputLabel}>Area / Neighborhood *</Text>
               <TextInput
                style={styles.inputFull}
                placeholder="Duraiyoor"
                placeholderTextColor="#A0AEC0"
                value={form.area}
                onChangeText={(v) => updateForm('area', v.slice(0, 50))}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { width: '65%' }]}>
                <Text style={styles.inputLabel}>Full Location / City *</Text>
                <TextInput
                  style={styles.inputHalf}
                  placeholder="Gangaikondan, Tirunelveli"
                  placeholderTextColor="#A0AEC0"
                  value={form.location}
                  onChangeText={(v) => updateForm('location', v.slice(0, 150))}
                />
              </View>
              <View style={[styles.inputGroup, { width: '30%' }]}>
                <Text style={styles.inputLabel}>Pincode *</Text>
                <TextInput
                  style={styles.inputHalf}
                  placeholder="627001"
                  placeholderTextColor="#A0AEC0"
                  value={form.pincode}
                  onChangeText={(v) => updateForm('pincode', v.replace(/[^0-9]/g, '').slice(0, 6))}
                  keyboardType="numeric"
                  maxLength={6}
                />
              </View>
            </View>

          </View>

          <TouchableOpacity 
            style={[styles.submitBtn, { opacity: isSubmitting ? 0.7 : 1 }]}
            onPress={handleSave}
            disabled={isSubmitting}
          >
            <Text style={styles.submitBtnText}>
              {isSubmitting ? 'SAVING...' : 'SAVE ADDRESS & CONTINUE'}
            </Text>
            <MaterialIcons name="check-circle" size={22} color="#fff" style={{ marginLeft: 10 }} />
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingTop: 20,
  },
  headerInfo: {
     marginBottom: 32,
  },
  headerTitle: {
     fontSize: 24,
     fontWeight: '900',
     color: COLORS.secondary,
     marginBottom: 8,
  },
  headerSubtitle: {
     fontSize: 14,
     color: COLORS.text,
     opacity: 0.6,
     lineHeight: 20,
  },
  formContainer: {
    marginBottom: 40,
  },
  inputGroup: {
     marginBottom: 16,
  },
  inputLabel: {
     fontSize: 12,
     fontWeight: '800',
     color: COLORS.secondary,
     marginBottom: 8,
     marginLeft: 4,
     textTransform: 'uppercase',
     letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputFull: {
    minHeight: 52,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    textAlignVertical: 'center',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
  },
  inputHalf: {
    minHeight: 52,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    textAlignVertical: 'center',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
  },
  submitBtn: {
    height: 64,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 30,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
