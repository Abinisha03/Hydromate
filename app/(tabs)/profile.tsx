import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, ScrollView, SafeAreaView, Platform,
  StatusBar, TouchableOpacity, TextInput, ActivityIndicator, Alert, Animated
} from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useConvexAuth } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { scale } from '@/utils/responsive';
import AddressModal from '@/components/AddressModal';

const COLORS = {
  primary: '#2EC4B6',
  secondary: '#0F9D8A',
  accent: '#E8FFF9',
  text: '#1B3A3A',
  white: '#FFFFFF',
  gray: '#718096',
  border: '#E2E8F0',
  danger: '#E53E3E',
};

export default function ProfileScreen() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();

  const { isLoading, isAuthenticated } = useConvexAuth();
  const addresses = useQuery(api.addresses.getAddresses, isAuthenticated ? {} : 'skip');
  const deleteAddress = useMutation(api.addresses.deleteAddress);
  const setDefaultAddress = useMutation(api.addresses.setDefaultAddress);

  // Address modal
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any>(null);
  const autoOpenedRef = useRef(false);

  // Auto-open address modal for brand new users
  useEffect(() => {
    if (!autoOpenedRef.current && Array.isArray(addresses) && addresses.length === 0) {
      autoOpenedRef.current = true;
      setEditingAddress(null);
      setModalVisible(true);
    }
  }, [addresses]);

  // ── Address actions ───────────────────────────────────────────────────────
  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/(auth)/sign-in');
    } catch (err) {
      console.error('Error signing out', err);
    }
  };

  const handleDelete = async (id: any) => {
    const doDelete = async () => {
      try {
        await deleteAddress({ id });
      } catch (error) {
        Alert.alert('Error', 'Failed to delete address: ' + (error as Error).message);
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Remove this address?')) doDelete();
    } else {
      Alert.alert('Delete Address', 'Are you sure you want to remove this address?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const defaultAddress = addresses?.find(a => a.isDefault);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} />
      {/* Header */}
      <View style={styles.header}>
        <FontAwesome5 name="user-circle" size={22} color={COLORS.white} style={{ marginRight: 10 }} />
        <Text style={styles.headerTitle}>Account Profile</Text>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.mainWrapper}>

          {/* ── User Card ─────────────────────────────────────────── */}
          <View style={styles.userCard}>
            {/* Avatar */}
            <View style={styles.avatarWrapper}>
              <View style={styles.avatar}>
                <MaterialIcons name="person" size={44} color="#fff" />
              </View>
            </View>

            {/* Info Display */}
            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                {defaultAddress?.name || user?.fullName || user?.primaryEmailAddress?.emailAddress || 'HydroMate User'}
              </Text>
              {defaultAddress?.phone ? (
                <View style={styles.phoneBadge}>
                  <MaterialIcons name="phone" size={13} color={COLORS.secondary} style={{ marginRight: 5 }} />
                  <Text style={styles.userPhone}>{defaultAddress.phone}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* ── Saved Addresses ──────────────────────────────────── */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderTitle}>Saved Addresses</Text>
          </View>

          {addresses === undefined || addresses === null ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
          ) : (
            (addresses ?? []).map((addr) => (
              <View key={addr._id} style={[styles.addressCard, addr.isDefault && styles.defaultBorder]}>
                {/* Card header with icon-only edit + delete (Re-designed for professional look) */}
                <View style={styles.addressHeader}>
                  <View style={styles.addressNameRow}>
                    <MaterialIcons name="location-city" size={16} color={COLORS.secondary} style={{ marginRight: 6 }} />
                    <Text style={styles.addressNameText} numberOfLines={1}>{addr.buildingName || 'Home'}</Text>
                    {addr.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>PRIMARY</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.addressActions}>
                    <TouchableOpacity
                      style={styles.iconBtnProfessional}
                      onPress={() => { setEditingAddress(addr); setModalVisible(true); }}
                    >
                      <MaterialIcons name="edit" size={14} color={COLORS.secondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.iconBtnProfessional, { borderColor: '#FEE2E2' }]}
                      onPress={() => handleDelete(addr._id)}
                    >
                      <MaterialIcons name="delete" size={14} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.divider} />

                {[
                  { label: 'Building', value: addr.buildingName },
                  { label: 'Gate No', value: addr.gateNo },
                  { label: 'Floor / Door', value: [addr.floorNo, addr.doorNo].filter(Boolean).join(' / ') },
                  { label: 'Street', value: addr.streetName },
                  { label: 'Area', value: addr.area },
                  { label: 'Location', value: addr.location },
                ].map((item, idx) => item.value ? (
                  <View key={idx} style={styles.addressRow}>
                    <Text style={styles.addressLabel}>{item.label}</Text>
                    <Text style={styles.labelColon}>:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollValueContainer}>
                      <Text style={styles.addressValue}>{item.value}</Text>
                    </ScrollView>
                  </View>
                ) : null)}

                {!addr.isDefault && (
                  <TouchableOpacity
                    style={styles.useAddressBtn}
                    onPress={() => setDefaultAddress({ id: addr._id })}
                  >
                    <MaterialIcons name="radio-button-unchecked" size={18} color={COLORS.secondary} style={{ marginRight: 8 }} />
                    <Text style={styles.useAddressText}>Use as Primary</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}

          {/* Add new address */}
          <TouchableOpacity
            style={styles.addAddressBtn}
            onPress={() => { setEditingAddress(null); setModalVisible(true); }}
          >
            <MaterialIcons name="add-location-alt" size={20} color={COLORS.white} style={{ marginRight: 8 }} />
            <Text style={styles.addAddressBtnText}>ADD NEW ADDRESS</Text>
          </TouchableOpacity>

          {/* Bottom actions */}
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/orders')}>
            <View style={[styles.btnIconBox, { backgroundColor: COLORS.accent }]}>
              <MaterialIcons name="history" size={20} color={COLORS.secondary} />
            </View>
            <Text style={styles.secondaryBtnText}>View Order History</Text>
            <MaterialIcons name="chevron-right" size={24} color={COLORS.border} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <View style={[styles.btnIconBox, { backgroundColor: '#FFF5F5' }]}>
              <MaterialIcons name="logout" size={20} color={COLORS.danger} />
            </View>
            <Text style={styles.signOutBtnText}>Secure Sign Out</Text>
            <MaterialIcons name="chevron-right" size={24} color={COLORS.border} />
          </TouchableOpacity>

        </View>
      </ScrollView>

      <AddressModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        initialData={editingAddress}
        addressesCount={Array.isArray(addresses) ? addresses.length : 0}
        addresses={Array.isArray(addresses) ? addresses : []}
        onSuccess={() => {
          if (!editingAddress) router.replace('/(tabs)');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.accent },
  header: {
    backgroundColor: COLORS.secondary,
    height: scale(48),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  headerTitle: { fontSize: scale(16), fontWeight: '900', color: '#fff', letterSpacing: 1 },
  container: { flex: 1 },
  content: { padding: scale(12), paddingBottom: scale(24) },
  mainWrapper: { maxWidth: 550, width: '100%', alignSelf: 'center' },

  // User card
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(14),
    borderRadius: scale(18),
    backgroundColor: COLORS.white,
    marginBottom: scale(10),
    elevation: 3,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  avatarWrapper: { marginRight: 14 },
  avatar: {
    width: scale(54),
    height: scale(54),
    borderRadius: scale(18),
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: { flex: 1 },
  userName: { fontSize: scale(16), fontWeight: '900', color: COLORS.secondary, marginBottom: scale(4) },
  userNamePlaceholder: { fontSize: scale(13), color: COLORS.gray, fontStyle: 'italic' },
  phoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
    borderRadius: scale(8),
    alignSelf: 'flex-start',
  },
  userPhone: { fontSize: scale(12), color: COLORS.secondary, fontWeight: '700' },

  // Profile icon buttons
  profileActions: { alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
  profileIconBtn: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },

  // Profile inputs
  profileInput: {
    backgroundColor: COLORS.accent,
    borderRadius: scale(10),
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    fontSize: scale(14),
    fontWeight: '700',
    color: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // Setup card (for first-time users)
  addDetailsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: scale(14),
    borderRadius: scale(16),
    marginBottom: scale(14),
    elevation: 2,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
  },
  addDetailsText: { fontSize: scale(14), fontWeight: '800', color: COLORS.secondary },
  setupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: scale(14),
    padding: scale(14),
    marginBottom: scale(14),
    elevation: 2,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  setupTitle: { fontSize: scale(13), fontWeight: '800', color: COLORS.secondary },
  setupSub: { fontSize: scale(11), color: COLORS.gray, marginTop: 2 },

  // Section header
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(12),
    paddingHorizontal: 2,
  },
  sectionHeaderTitle: { fontSize: scale(16), fontWeight: '900', color: COLORS.text },

  // Address card
  addressCard: {
    borderRadius: scale(14),
    backgroundColor: COLORS.white,
    padding: scale(10),
    marginBottom: scale(8),
    elevation: 3,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
  },
  defaultBorder: { borderColor: COLORS.primary },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scale(8),
  },
  addressNameRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  addressNameText: { fontSize: scale(13), fontWeight: '800', color: COLORS.secondary },
  defaultBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: 6,
  },
  defaultBadgeText: { fontSize: scale(8.5), fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  addressActions: { flexDirection: 'row', gap: 6 },
  iconBtnProfessional: {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(8),
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: scale(8) },
  addressRow: { flexDirection: 'row', marginBottom: scale(4), alignItems: 'center' },
  addressLabel: { width: scale(85), fontSize: scale(10.5), color: '#064E3B', fontWeight: '800' },
  labelColon: { width: scale(15), textAlign: 'center', fontSize: scale(10.5), color: '#064E3B', fontWeight: '800' },
  addressValue: { fontSize: scale(11.5), fontWeight: '900', color: COLORS.text },
  scrollValueContainer: { flex: 1 },
  useAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scale(6),
    paddingTop: scale(6),
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  useAddressText: { fontSize: scale(11.5), fontWeight: '700', color: COLORS.secondary },

  // Add address button
  addAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary,
    height: scale(44),
    borderRadius: scale(22),
    marginBottom: scale(16),
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  addAddressBtnText: { fontSize: scale(14), fontWeight: '900', color: '#fff', letterSpacing: 0.5 },

  // Bottom rows
  secondaryBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    height: scale(48),
    borderRadius: scale(12),
    alignItems: 'center',
    paddingHorizontal: scale(14),
    marginBottom: scale(8),
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
  },
  btnIconBox: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  secondaryBtnText: { flex: 1, fontSize: scale(14), fontWeight: '800', color: COLORS.secondary },
  signOutBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    height: scale(48),
    borderRadius: scale(12),
    alignItems: 'center',
    paddingHorizontal: scale(14),
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    marginBottom: scale(8),
  },
  signOutBtnText: { flex: 1, fontSize: scale(14), fontWeight: '800', color: COLORS.danger },
});
