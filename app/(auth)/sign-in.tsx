import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useClerk, useOAuth, useAuth } from '@clerk/expo';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { MaterialIcons, FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { scale } from '@/utils/responsive';
import { useQuery, useConvexAuth } from 'convex/react';
import { api } from '@/convex/_generated/api';

const { width, height } = Dimensions.get('window');

const COLORS = {
  primary: '#2EC4B6',
  secondary: '#0F9D8A',
  accent: '#E8FFF9',
  text: '#1B3A3A',
  white: '#FFFFFF',
  gray: '#718096',
  border: '#E2E8F0',
};

// Warm up the browser for better UX
export const useWarmUpBrowser = () => {
  React.useEffect(() => {
    if (Platform.OS !== 'web') {
      void WebBrowser.warmUpAsync();
    }
    return () => {
      if (Platform.OS !== 'web') {
        void WebBrowser.coolDownAsync();
      }
    };
  }, []);
};

if (Platform.OS !== 'web') {
  WebBrowser.maybeCompleteAuthSession();
}

export default function SignInScreen() {
  useWarmUpBrowser();
  const router = useRouter();
  const clerk = useClerk();
  const { startOAuthFlow: googleAuth } = useOAuth({ strategy: 'oauth_google' });
  
  const { isLoading, isAuthenticated } = useConvexAuth();
  const [emailAddress, setEmailAddress] = useState('');
  const [code, setCode] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [isSignUpFlow, setIsSignUpFlow] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const addresses = useQuery(api.addresses.getAddresses, isAuthenticated ? {} : "skip");

  useEffect(() => {
    if (isAuthenticated && addresses !== undefined && addresses !== null) {
      if (Array.isArray(addresses) && addresses.length === 0) {
        router.replace('/(tabs)/profile');
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [isAuthenticated, addresses]);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const onSelectAuth = async () => {
    try {
      setLoadingAction('google');
      const redirectUrl = Linking.createURL('/(tabs)');
      const { createdSessionId, setActive } = await googleAuth({ redirectUrl });
      if (createdSessionId) {
        setActive!({ session: createdSessionId });
        // The useEffect will handle redirection
      }
    } catch (err: any) {
      const msg = err.errors?.[0]?.longMessage || err.message || JSON.stringify(err);
      if (!msg.toLowerCase().includes('already signed in')) {
        showAlert('Google Error', msg);
      } else {
        // Already signed in, the useEffect will handle redirection
      }
    } finally {
      setLoadingAction(null);
    }
  };

  const onSignInPress = async () => {
    if (!clerk.loaded) return;
    if (!emailAddress) {
      showAlert('Required', 'Please enter your email address.');
      return;
    }

    setLoadingAction('email');
    try {
      const client = clerk.client;
      try {
        await client.signIn.create({ identifier: emailAddress });
        const sIn = client.signIn;
        const factor = sIn.supportedFirstFactors?.find((f: any) => f.strategy === 'email_code');
        if (factor) {
          await sIn.prepareFirstFactor({ strategy: 'email_code', emailAddressId: (factor as any).emailAddressId });
          setPendingVerification(true);
          setIsSignUpFlow(false);
          return;
        }
      } catch (signInErr: any) {
        await client.signUp.create({ 
          emailAddress,
          password: `Hydromate!${Math.random().toString(36).slice(-8)}`,
          firstName: 'Hydromate',
          lastName: 'User'
        });
        await client.signUp.prepareVerification({ strategy: 'email_code' });
        setPendingVerification(true);
        setIsSignUpFlow(true);
      }
    } catch (err: any) {
      showAlert('Auth Error', err.errors?.[0]?.longMessage || err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const onPressVerify = async () => {
    if (!clerk.loaded) return;
    setLoadingAction('verify');
    try {
      const client = clerk.client;
      if (isSignUpFlow) {
        const completeSignUp = await client.signUp.attemptEmailAddressVerification({ code });
        if (completeSignUp.status === 'complete') {
          await clerk.setActive({ session: completeSignUp.createdSessionId });
          // Redirection handled by useEffect
        }
      } else {
        const completeSignIn = await client.signIn.attemptFirstFactor({ strategy: 'email_code', code });
        if (completeSignIn.status === 'complete') {
          await clerk.setActive({ session: completeSignIn.createdSessionId });
          // Redirection handled by useEffect
        }
      }
    } catch (err: any) {
      showAlert('Verification Error', err.errors?.[0]?.longMessage || 'Invalid code');
    } finally {
      setLoadingAction(null);
    }
  };

  const onCancel = () => {
    setPendingVerification(false);
    setCode('');
  };

  const isAnyLoading = loadingAction !== null;

  return (
    <View style={styles.page}>
      {/* Soft Wellness Background Decorations */}
      <View style={[styles.bgCircle, { top: -80, left: -80, width: 300, height: 300 }]} />
      <View style={[styles.bgCircle, { bottom: -100, right: -100, width: 350, height: 350 }]} />
      <View style={[styles.bgCircle, { top: height / 2 - 50, left: width - 80, width: 120, height: 120, opacity: 0.2 }]} />

      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          {/* Brand Identity */}
          <View style={styles.brandContainer}>
             <View style={styles.logoCircle}>
                <FontAwesome5 name="water" size={32} color={COLORS.white} />
             </View>
             <Text style={styles.brandTitle}>HYDROMATE</Text>
             <Text style={styles.brandSlogan}>Pure Care. Pure Hydration.</Text>
          </View>

          <View style={styles.headerBox}>
            <Text style={styles.introText}>
               {pendingVerification ? 'Verify your identity' : 'Welcome to Wellness'}
            </Text>
            <Text style={styles.subtitleText}>
              {pendingVerification ? `We've sent a code to ${emailAddress}` : 'Enter your email to join the hydration movement.'}
            </Text>
          </View>

          {!pendingVerification ? (
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="alternate-email" size={20} color={COLORS.primary} style={styles.inputIcon} />
                  <TextInput
                    autoCapitalize="none"
                    value={emailAddress}
                    placeholder="name@example.com"
                    placeholderTextColor="#A0AEC0"
                    onChangeText={setEmailAddress}
                    keyboardType="email-address"
                    style={styles.textInput}
                    editable={!isAnyLoading}
                  />
                </View>
              </View>

              <TouchableOpacity 
                style={[styles.primaryButton, isAnyLoading && styles.disabledBtn]} 
                onPress={onSignInPress}
                disabled={isAnyLoading}
              >
                {loadingAction === 'email' ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.primaryButtonText}>Continue</Text>
                    <MaterialIcons name="arrow-forward" size={20} color={COLORS.white} style={{ marginLeft: 8 }} />
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.dividerRow}>
                <View style={styles.line} />
                <Text style={styles.orText}>secured with Clerk</Text>
                <View style={styles.line} />
              </View>

              <TouchableOpacity 
                style={[styles.socialButton, isAnyLoading && styles.disabledBtn]} 
                onPress={onSelectAuth}
                disabled={isAnyLoading}
              >
                <FontAwesome name="google" size={18} color={COLORS.text} style={{ marginRight: 12 }} />
                <Text style={styles.socialButtonText}>Continue with Google</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Verification Code</Text>
                <View style={styles.inputWrapper}>
                   <MaterialIcons name="lock-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
                   <TextInput
                    value={code}
                    placeholder="000000"
                    placeholderTextColor="#A0AEC0"
                    onChangeText={setCode}
                    keyboardType="number-pad"
                    style={styles.textInput}
                    maxLength={6}
                    editable={!isAnyLoading}
                  />
                </View>
              </View>

              <TouchableOpacity 
                style={[styles.primaryButton, isAnyLoading && styles.disabledBtn]} 
                onPress={onPressVerify}
                disabled={isAnyLoading}
              >
                {loadingAction === 'verify' ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>Verify & Secure</Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity onPress={onCancel} style={styles.backBtn}>
                 <MaterialIcons name="keyboard-backspace" size={20} color={COLORS.gray} style={{ marginRight: 8 }} />
                 <Text style={styles.backBtnText}>Back to Sign In</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.footerBrand}>
           <FontAwesome5 name="leaf" size={14} color={COLORS.secondary} style={{ marginRight: 6 }} />
           <Text style={styles.footerBrandText}>Environmentally Conscious Delivery</Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    padding: scale(16),
    overflow: 'hidden',
  },
  bgCircle: {
    position: 'absolute',
    backgroundColor: 'rgba(46, 196, 182, 0.15)',
    borderRadius: 999,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: scale(24),
    padding: scale(20),
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: scale(20),
  },
  logoCircle: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(16),
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(12),
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  brandTitle: {
    fontSize: scale(22),
    fontWeight: '900',
    color: COLORS.secondary,
    letterSpacing: 2,
  },
  brandSlogan: {
    fontSize: scale(10),
    color: COLORS.primary,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: scale(2),
    textTransform: 'uppercase',
  },
  headerBox: {
    alignItems: 'center',
    marginBottom: scale(20),
  },
  introText: {
    fontSize: scale(16),
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: scale(4),
  },
  subtitleText: {
    fontSize: scale(12),
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: scale(16),
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 10,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.accent,
    borderRadius: scale(16),
    paddingHorizontal: scale(14),
    height: scale(48),
    backgroundColor: '#F8FAFC',
  },
  inputIcon: {
    marginRight: 14,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    height: scale(48),
    borderRadius: scale(16),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: scale(8),
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: scale(16),
    fontWeight: '800',
    letterSpacing: 1,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 32,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.accent,
  },
  orText: {
    marginHorizontal: 16,
    color: '#CBD5E0',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  socialButton: {
    backgroundColor: COLORS.white,
    height: scale(48),
    borderWidth: 2,
    borderColor: COLORS.accent,
    borderRadius: scale(16),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialButtonText: {
    color: COLORS.text,
    fontSize: scale(14),
    fontWeight: '700',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  backBtn: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    color: COLORS.gray,
    fontSize: 14,
    fontWeight: '700',
  },
  footerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerBrandText: {
    fontSize: 12,
    color: COLORS.secondary,
    fontWeight: '600',
  },
});
