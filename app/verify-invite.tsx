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
            <MaterialIcons name="local-shipping" size={32} color={COLORS.secondary} />
          </View>
          
          <Text style={styles.title}>Staff Verification</Text>
          <Text style={styles.subtitle}>
            We noticed you have a pending Staff Invite for your email address. Please enter your unique invite code and phone number to activate your account.
          </Text>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="vpn-key" size={20} color={COLORS.secondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. HM-QUS6F4"
                  placeholderTextColor="#718096"
                  autoCapitalize="characters"
                  value={code}
                  onChangeText={setCode}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="phone" size={20} color={COLORS.secondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="10-digit mobile number"
                  placeholderTextColor="#718096"
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
                   <Text style={styles.verifyBtnText}>VERIFY & JOIN</Text>
                   <MaterialIcons name="arrow-forward" size={18} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.signOutBtn}
            onPress={handleSignOut}
          >
            <Text style={styles.signOutBtnText}>I don't have a code, continue as customer.</Text>
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
    borderRadius: scale(24),
    padding: scale(20),
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    elevation: 10,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  iconCircle: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(16),
  },
  title: {
    fontSize: scale(20),
    fontWeight: '900',
    color: COLORS.secondary,
    marginBottom: scale(12),
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: scale(11.5),
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: scale(18),
    marginBottom: scale(24),
    paddingHorizontal: scale(10),
    fontWeight: '500',
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: scale(16),
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8FFF9',
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingHorizontal: scale(16),
    height: scale(50),
  },
  inputIcon: {
    marginRight: scale(10),
  },
  input: {
    flex: 1,
    fontSize: scale(14),
    fontWeight: '700',
    color: COLORS.text,
  },
  verifyBtn: {
    backgroundColor: COLORS.primary,
    width: '100%',
    height: scale(50),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: scale(12),
    marginBottom: scale(20),
  },
  verifyBtnText: {
    color: '#fff',
    fontSize: scale(14),
    fontWeight: '900',
    letterSpacing: 1,
  },
  signOutBtn: {
    alignItems: 'center',
    paddingVertical: scale(8),
  },
  signOutBtnText: {
    color: COLORS.gray,
    fontSize: scale(12),
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
