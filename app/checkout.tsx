import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert, StatusBar, SafeAreaView } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { useRouter, Stack } from 'expo-router';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

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

  const [form, setForm] = useState({
    buildingName: '',
    streetNo: '',
    gateNo: '',
    floorNo: '',
    doorNo: '8/218A',
    streetName: 'CSI church street',
    area: 'Duraiyoor',
    location: 'Gangaikondan Tirunelveli',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateForm = (key: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (!form.streetName || !form.area || !form.location) {
      if (Platform.OS === 'web') {
        window.alert('Please fill out the required address fields.');
      } else {
        Alert.alert('Required Fields', 'Please fill out the required address fields.');
      }
      return;
    }

    setIsSubmitting(true);
    
    setTimeout(() => {
      setIsSubmitting(false);
      router.push('/(tabs)/profile');
    }, 800);
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
               <Text style={styles.inputLabel}>Building Name</Text>
               <TextInput
                style={styles.inputFull}
                placeholder="e.g. Wellness Heights"
                placeholderTextColor="#A0AEC0"
                value={form.buildingName}
                onChangeText={(v) => updateForm('buildingName', v)}
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
                  onChangeText={(v) => updateForm('streetNo', v)}
                />
              </View>
              <View style={[styles.inputGroup, { width: '48%' }]}>
                <Text style={styles.inputLabel}>Gate No</Text>
                <TextInput
                  style={styles.inputHalf}
                  placeholder="00"
                  placeholderTextColor="#A0AEC0"
                  value={form.gateNo}
                  onChangeText={(v) => updateForm('gateNo', v)}
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
                  onChangeText={(v) => updateForm('floorNo', v)}
                />
              </View>
              <View style={[styles.inputGroup, { width: '48%' }]}>
                <Text style={styles.inputLabel}>Door No</Text>
                <TextInput
                  style={styles.inputHalf}
                  placeholder="8/218A"
                  placeholderTextColor="#A0AEC0"
                  value={form.doorNo}
                  onChangeText={(v) => updateForm('doorNo', v)}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
               <Text style={styles.inputLabel}>Street Name</Text>
               <TextInput
                style={styles.inputFull}
                placeholder="CSI Church Street"
                placeholderTextColor="#A0AEC0"
                value={form.streetName}
                onChangeText={(v) => updateForm('streetName', v)}
              />
            </View>

            <View style={styles.inputGroup}>
               <Text style={styles.inputLabel}>Area / Neighborhood</Text>
               <TextInput
                style={styles.inputFull}
                placeholder="Duraiyoor"
                placeholderTextColor="#A0AEC0"
                value={form.area}
                onChangeText={(v) => updateForm('area', v)}
              />
            </View>

            <View style={styles.inputGroup}>
               <Text style={styles.inputLabel}>Full Location / City</Text>
               <TextInput
                style={styles.inputFull}
                placeholder="Gangaikondan, Tirunelveli"
                placeholderTextColor="#A0AEC0"
                value={form.location}
                onChangeText={(v) => updateForm('location', v)}
              />
            </View>

            <TouchableOpacity style={styles.getLocationBtn}>
              <MaterialIcons name="my-location" size={18} color="#cc3333" style={{ marginRight: 8 }} />
              <Text style={styles.getLocationText}>Get Current Location</Text>
            </TouchableOpacity>

          </View>

          <TouchableOpacity 
            style={[styles.submitBtn, { opacity: isSubmitting ? 0.7 : 1 }]}
            onPress={handleSave}
            disabled={isSubmitting}
          >
            <Text style={styles.submitBtnText}>
              {isSubmitting ? 'SAVING...' : 'CONFIRM ADDRESS'}
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
    height: 60,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    paddingHorizontal: 20,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
  },
  inputHalf: {
    height: 60,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    paddingHorizontal: 20,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
  },
  getLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 10,
    paddingVertical: 8,
  },
  getLocationText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#cc3333',
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
