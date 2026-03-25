import React from 'react';
import { StyleSheet, View, Text, SafeAreaView, TouchableOpacity, Share, ImageBackground, StatusBar } from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';

const COLORS = {
  primary: '#2EC4B6',
  secondary: '#0F9D8A',
  accent: '#E8FFF9',
  text: '#1B3A3A',
  white: '#FFFFFF',
};

export default function InviteFriendsScreen() {
  const router = useRouter();
  const referralCode = "HYDRA-992";

  const onShare = async () => {
    try {
      await Share.share({
        message: `Join me on HYDROMATE for pure demineralized water! Use my code ${referralCode} to get 1 FREE can on your first order. Download now: https://hydromate.app`,
      });
    } catch (error: any) {
      console.error(error.message);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} />
      <Stack.Screen 
        options={{ 
          title: 'Invite Friends', 
          headerTintColor: '#fff', 
          headerStyle: { backgroundColor: COLORS.secondary },
          headerTitleStyle: { fontWeight: '900' }
        }} 
      />
      
      <ImageBackground 
        source={{ uri: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?q=80&w=1976&auto=format&fit=crop' }}
        style={styles.imageBg}
        imageStyle={{ opacity: 0.2 }}
      >
        <View style={styles.container}>
          <View style={styles.contentCard}>
            <View style={styles.iconCircle}>
               <FontAwesome5 name="gift" size={40} color={COLORS.white} />
            </View>
            <Text style={styles.title}>Spread the Wellness!</Text>
            <Text style={styles.subtitle}>
              Invite your friends to HYDROMATE. When they place their first order, you both get a **FREE 20L Premium Can**.
            </Text>

            <View style={styles.codeContainer}>
              <Text style={styles.codeLabel}>Your Personal Code</Text>
              <View style={styles.codeBox}>
                <Text style={styles.codeText}>{referralCode}</Text>
                <TouchableOpacity onPress={onShare}>
                  <MaterialIcons name="content-copy" size={20} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.shareBtn} onPress={onShare}>
              <Text style={styles.shareBtnText}>SHARE INVITE LINK</Text>
              <MaterialIcons name="share" size={20} color="#fff" style={{ marginLeft: 10 }} />
            </TouchableOpacity>

            <View style={styles.statsRow}>
               <View style={styles.statLine}>
                 <Text style={styles.statNum}>12</Text>
                 <Text style={styles.statLabel}>Invites</Text>
               </View>
               <View style={styles.vDivider} />
               <View style={styles.statLine}>
                 <Text style={styles.statNum}>2</Text>
                 <Text style={styles.statLabel}>Earned</Text>
               </View>
            </View>
          </View>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.accent,
  },
  imageBg: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  contentCard: {
    backgroundColor: COLORS.white,
    borderRadius: 40,
    padding: 30,
    alignItems: 'center',
    elevation: 10,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 36,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    elevation: 5,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.secondary,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    opacity: 0.7,
  },
  codeContainer: {
    width: '100%',
    marginBottom: 32,
  },
  codeLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  codeBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.accent,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(46, 196, 182, 0.2)',
  },
  codeText: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.secondary,
    letterSpacing: 2,
    marginRight: 10,
  },
  shareBtn: {
    backgroundColor: COLORS.primary,
    height: 64,
    borderRadius: 24,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
  },
  shareBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.accent,
    width: '100%',
  },
  statLine: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.secondary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.text,
    opacity: 0.5,
  },
  vDivider: {
    width: 1,
    backgroundColor: COLORS.accent,
  },
});
