import React, { useState } from 'react';
import {
  StyleSheet, View, Text, SafeAreaView, StatusBar,
  TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { scale } from '@/utils/responsive';
import BackgroundAnimation from '@/components/BackgroundAnimation';

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
  const verifyInvite = useMutation(api.invites.verifyInvite);
  
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleVerify = async () => {
    if (!code.trim()) {
      Alert.alert('Required', 'Please enter your invite code.');
      return;
    }

    setIsLoading(true);
    try {
      await verifyInvite({ inviteCode: code.trim().toUpperCase() });
      Alert.alert('Success!', 'Your account has been upgraded to Delivery Staff.', [
        { text: 'Go to Dashboard', onPress: () => router.replace('/(staff)') }
      ]);
    } catch (e: any) {
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
          <View style={styles.iconBox}>
            <MaterialIcons name="local-shipping" size={40} color={COLORS.primary} />
          </View>
          
          <Text style={styles.title}>Staff Verification</Text>
          <Text style={styles.subtitle}>
            We noticed you have a pending Staff Invite for your email address. 
            Please enter your unique invite code below to activate your account.
          </Text>

          <View style={styles.inputContainer}>
            <MaterialIcons name="vpn-key" size={20} color={COLORS.secondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. HM-QUS6F4"
              placeholderTextColor={COLORS.gray}
              autoCapitalize="characters"
              value={code}
              onChangeText={setCode}
            />
          </View>

          <TouchableOpacity 
            style={[styles.verifyBtn, isLoading && { opacity: 0.7 }]} 
            onPress={handleVerify}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Text style={styles.verifyBtnText}>VERIFY INVITE CODE</Text>
                <MaterialIcons name="arrow-forward" size={18} color={COLORS.white} />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.skipBtn}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={styles.skipBtnText}>I don't have a code, continue as customer.</Text>
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
    maxWidth: 400,
    alignItems: 'center',
    elevation: 4,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  iconBox: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(20),
    borderWidth: 4,
    borderColor: '#F0FDF9',
  },
  title: {
    fontSize: scale(22),
    fontWeight: '900',
    color: COLORS.secondary,
    marginBottom: scale(10),
  },
  subtitle: {
    fontSize: scale(13),
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: scale(20),
    marginBottom: scale(24),
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: scale(14),
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: scale(14),
    paddingVertical: scale(4),
    marginBottom: scale(24),
    width: '100%',
  },
  inputIcon: {
    marginRight: scale(10),
  },
  input: {
    flex: 1,
    height: scale(46),
    fontSize: scale(16),
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 2,
  },
  verifyBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    width: '100%',
    height: scale(50),
    borderRadius: scale(14),
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(10),
    elevation: 2,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    marginBottom: scale(16),
  },
  verifyBtnText: {
    color: '#fff',
    fontSize: scale(14),
    fontWeight: '900',
    letterSpacing: 1,
  },
  skipBtn: {
    padding: scale(10),
  },
  skipBtnText: {
    color: COLORS.gray,
    fontSize: scale(12),
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
