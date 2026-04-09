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
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.accent} />
      <BackgroundAnimation />
      
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <FontAwesome5 name="id-badge" size={32} color={COLORS.primary} />
          </View>
          
          <Text style={styles.title}>Staff Verification</Text>
          <Text style={styles.subtitle}>
            Enter your unique invite code and phone number to activate your staff account.
          </Text>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="vpn-key" size={20} color={COLORS.secondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Invite Code (e.g. HM-QUS6F4)"
                  placeholderTextColor={COLORS.gray}
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
                  placeholder="Your Phone Number"
                  placeholderTextColor={COLORS.gray}
                  keyboardType="phone-pad"
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
                <Text style={styles.verifyBtnText}>VERIFY & JOIN TEAM</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <TouchableOpacity 
            style={styles.signOutBtn}
            onPress={handleSignOut}
          >
            <MaterialIcons name="logout" size={16} color={COLORS.gray} />
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
    backgroundColor: COLORS.accent,
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
    padding: scale(24),
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    elevation: 8,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
  },
  iconCircle: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(20),
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(20),
  },
  title: {
    fontSize: scale(22),
    fontWeight: '900',
    color: COLORS.secondary,
    marginBottom: scale(8),
  },
  subtitle: {
    fontSize: scale(13),
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: scale(18),
    marginBottom: scale(24),
    paddingHorizontal: scale(10),
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
    backgroundColor: COLORS.accent,
    borderRadius: scale(14),
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: scale(14),
    height: scale(50),
  },
  inputIcon: {
    marginRight: scale(10),
  },
  input: {
    flex: 1,
    fontSize: scale(15),
    fontWeight: '700',
    color: COLORS.text,
  },
  verifyBtn: {
    backgroundColor: COLORS.primary,
    width: '100%',
    height: scale(52),
    borderRadius: scale(16),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: scale(8),
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  verifyBtnText: {
    color: '#fff',
    fontSize: scale(14),
    fontWeight: '900',
    letterSpacing: 1,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    width: '100%',
    marginVertical: scale(20),
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  signOutBtnText: {
    color: COLORS.gray,
    fontSize: scale(12),
    fontWeight: '700',
  },
});
