import React, { useState } from 'react';
import {
  StyleSheet, View, Text, SafeAreaView, StatusBar,
  TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { scale } from '@/utils/responsive';
import BackgroundAnimation from '@/components/BackgroundAnimation';
import * as Haptics from 'expo-haptics';
import { useUser, useClerk, useAuth } from '@clerk/clerk-expo';

const COLORS = {
  primary: '#2EC4B6',
  secondary: '#0F9D8A',
  accent: '#E8FFF9',
  text: '#1B3A3A',
  white: '#FFFFFF',
  gray: '#718096',
  border: '#E2E8F0',
};

export default function VerifyInviteScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useAuth();
  const verifyInvite = useMutation(api.invites.verifyInvite);
  
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    try {
      if (Platform.OS === 'web') {
        if (!window.confirm('Are you sure you want to sign in with a different account?')) return;
        console.log('Signing out from web...');
      } else {
        // Native platforms: use standard Alert
        const confirmed = await new Promise((resolve) => {
          Alert.alert('Switch Account', 'Sign in with a different account?', [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Switch', style: 'destructive', onPress: () => resolve(true) }
          ]);
        });
        if (!confirmed) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      
      await signOut();
      router.replace('/(auth)/sign-in');
    } catch (err) {
      console.error('Sign out error:', err);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  const handleVerify = async () => {
    if (!code.trim() || !phone.trim() || phone.trim().length < 10) {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Required', 'Please enter a valid invite code and phone number.');
      return;
    }

    const email = user?.primaryEmailAddress?.emailAddress;
    if (!email) {
      Alert.alert('Error', 'Wait for your email to load.');
      return;
    }

    setIsLoading(true);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await verifyInvite({ inviteCode: code.trim().toUpperCase(), email, phone: phone.trim() });
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Alert.alert('Success!', 'Your account has been upgraded to Delivery Staff.', [
        { text: 'Go to Dashboard', onPress: () => router.replace('/(staff)') }
      ]);
    } catch (e: any) {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Verification Failed', e.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      
      {/* Premium Background Elements */}
      <View style={{ position: 'absolute', top: -100, left: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: COLORS.primary, opacity: 0.05, zIndex: -1 }} />
      <View style={{ position: 'absolute', bottom: -50, right: -80, width: 250, height: 250, borderRadius: 125, backgroundColor: COLORS.secondary, opacity: 0.03, zIndex: -1 }} />

      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <MaterialIcons name="verified-user" size={36} color={COLORS.secondary} />
          </View>
          
          <Text style={styles.title}>Team Activation</Text>
          <Text style={styles.subtitle}>
            Enter the unique credentials from your invitation to join the HydroMate delivery network.
          </Text>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Invite Code</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="vpn-key" size={20} color={COLORS.primary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. HM-XXXXXX"
                  placeholderTextColor="#A0AEC0"
                  autoCapitalize="characters"
                  value={code}
                  onChangeText={setCode}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="phone-iphone" size={20} color={COLORS.primary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="10-digit mobile number"
                  placeholderTextColor="#A0AEC0"
                  keyboardType="number-pad"
                  maxLength={10}
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.verifyBtn, isLoading && { opacity: 0.8 }]} 
              onPress={handleVerify}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                   <Text style={styles.verifyBtnText}>ACTIVATE ACCOUNT</Text>
                   <MaterialIcons name="arrow-forward" size={18} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <TouchableOpacity 
            style={styles.signOutBtn}
            onPress={handleSignOut}
          >
            <MaterialIcons name="account-circle" size={18} color={COLORS.gray} />
            <Text style={styles.signOutBtnText}>Use a different account</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(20),
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: scale(32),
    padding: scale(28),
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    elevation: 10,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
  },
  iconCircle: {
    width: scale(72),
    height: scale(72),
    borderRadius: scale(24),
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(24),
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  title: {
    fontSize: scale(24),
    fontWeight: '900',
    color: COLORS.secondary,
    marginBottom: scale(8),
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: scale(14),
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: scale(20),
    marginBottom: scale(32),
    paddingHorizontal: scale(10),
    fontWeight: '500',
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: scale(20),
  },
  inputLabel: {
    fontSize: scale(12),
    fontWeight: '800',
    color: COLORS.secondary,
    marginBottom: scale(8),
    marginLeft: scale(4),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: scale(16),
    borderWidth: 2,
    borderColor: 'transparent',
    paddingHorizontal: scale(16),
    height: scale(56),
  },
  inputIcon: {
    marginRight: scale(12),
  },
  input: {
    flex: 1,
    fontSize: scale(16),
    fontWeight: '700',
    color: COLORS.text,
  },
  verifyBtn: {
    backgroundColor: COLORS.primary,
    width: '100%',
    height: scale(56),
    borderRadius: scale(18),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: scale(12),
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  verifyBtnText: {
    color: '#fff',
    fontSize: scale(15),
    fontWeight: '900',
    letterSpacing: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    width: '100%',
    marginVertical: scale(24),
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    paddingVertical: scale(8),
  },
  signOutBtnText: {
    color: COLORS.gray,
    fontSize: scale(14),
    fontWeight: '700',
  },
});
