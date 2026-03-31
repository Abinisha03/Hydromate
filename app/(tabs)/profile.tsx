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
import BackgroundAnimation from '@/components/BackgroundAnimation';
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
  const convexUser = useQuery(api.users.getCurrentUser, isAuthenticated ? {} : 'skip');
  const deleteAddress = useMutation(api.addresses.deleteAddress);
  const setDefaultAddress = useMutation(api.addresses.setDefaultAddress);
  const updateUserProfile = useMutation(api.users.updateUserProfile);

  // Address modal
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any>(null);
  const autoOpenedRef = useRef(false);

  // User profile editing
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Derived: has the user set a custom profile yet?
  const hasProfile = !!(convexUser?.displayName && convexUser?.phone);
  const displayName = convexUser?.displayName || convexUser?.name || 'Set your name';
  const displayPhone = convexUser?.phone || '';

  // Auto-open address modal for brand new users
  useEffect(() => {
    if (!autoOpenedRef.current && Array.isArray(addresses) && addresses.length === 0) {
      autoOpenedRef.current = true;
      setEditingAddress(null);
      setModalVisible(true);
    }
  }, [addresses]);

  // When convexUser loads, pre-fill edit fields
  useEffect(() => {
    if (convexUser) {
      setEditName(convexUser.displayName || convexUser.name || '');
      setEditPhone(convexUser.phone || '');
    }
  }, [convexUser]);

  // ── Profile save ──────────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Required', 'Please enter your name.');
      return;
    }
    if (!editPhone.trim() || editPhone.trim().length < 10) {
      Alert.alert('Invalid', 'Please enter a valid 10-digit phone number.');
      return;
    }
    setSavingProfile(true);
    try {
      await updateUserProfile({ displayName: editName.trim(), phone: editPhone.trim() });
      setIsEditingProfile(false);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not save profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancelEdit = () => {
    // Reset to saved values
    setEditName(convexUser?.displayName || convexUser?.name || '');
    setEditPhone(convexUser?.phone || '');
    setIsEditingProfile(false);
  };

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
      <BackgroundAnimation />

      {/* Header */}
      <View style={styles.header}>
        <FontAwesome5 name="user-circle" size={22} color={COLORS.white} style={{ marginRight: 10 }} />
        <Text style={styles.headerTitle}>Account Profile</Text>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.mainWrapper}>

          {/* ── User Card / Add Details Button ─────────────────────────────────────────── */}
          {!hasProfile && !isEditingProfile ? (
            <TouchableOpacity style={styles.addDetailsBox} onPress={() => setIsEditingProfile(true)}>
              <MaterialIcons name="person-add" size={24} color={COLORS.primary} style={{ marginRight: 12 }} />
              <Text style={styles.addDetailsText}>Add Details</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.userCard}>
              {/* Avatar */}
              <View style={styles.avatarWrapper}>
                <View style={styles.avatar}>
                  <MaterialIcons name="person" size={44} color="#fff" />
                </View>
              </View>

            {/* Info / Edit form */}
            <View style={styles.userInfo}>
              {isEditingProfile ? (
                /* ── Edit form ────────────── */
                <View>
                  <TextInput
                    style={styles.profileInput}
                    placeholder="Your Name (e.g. John)"
                    placeholderTextColor={COLORS.gray}
                    value={editName}
                    onChangeText={setEditName}
                  />
                  <TextInput
                    style={[styles.profileInput, { marginTop: 8 }]}
                    placeholder="Mobile Number (e.g. 9876543210)"
                    placeholderTextColor={COLORS.gray}
                    value={editPhone}
                    onChangeText={setEditPhone}
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </View>
              ) : (
                /* ── Display ────────────────── */
                <View>
                  <Text style={styles.userName}>{displayName}</Text>
                  {displayPhone ? (
                    <View style={styles.phoneBadge}>
                      <MaterialIcons name="phone" size={13} color={COLORS.secondary} style={{ marginRight: 5 }} />
                      <Text style={styles.userPhone}>{displayPhone}</Text>
                    </View>
                  ) : null}
                </View>
              )}
            </View>

            {/* ── Icon buttons (Edit / Cancel+Save) ── */}
            <View style={styles.profileActions}>
                {isEditingProfile ? (
                  <>
                    {/* Save icon */}
                    <TouchableOpacity
                      style={[styles.profileIconBtn, { backgroundColor: COLORS.primary }]}
                      onPress={handleSaveProfile}
                      disabled={savingProfile}
                    >
                      {savingProfile
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <MaterialIcons name="check" size={20} color="#fff" />}
                    </TouchableOpacity>
                    {/* Cancel icon */}
                    <TouchableOpacity
                      style={[styles.profileIconBtn, { backgroundColor: COLORS.danger, marginTop: 6 }]}
                      onPress={handleCancelEdit}
                    >
                      <MaterialIcons name="close" size={20} color="#fff" />
                    </TouchableOpacity>
                  </>
                ) : (
                /* Edit icon */
                <TouchableOpacity
                  style={[styles.profileIconBtn, { backgroundColor: COLORS.secondary }]}
                  onPress={() => setIsEditingProfile(true)}
                >
                  <MaterialIcons name="edit" size={20} color="#fff" />
                </TouchableOpacity>
                )}
              </View>
            </View>
          )}



          {/* ── Saved Addresses ──────────────────────────────────── */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderTitle}>Saved Addresses</Text>
          </View>

          {addresses === undefined || addresses === null ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
          ) : (
            (addresses ?? []).map((addr) => (
              <View key={addr._id} style={[styles.addressCard, addr.isDefault && styles.defaultBorder]}>
                {/* Card header with icon-only edit + delete */}
                <View style={styles.addressHeader}>
                  <View style={styles.addressNameRow}>
                    <MaterialIcons name="location-city" size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
                    <Text style={styles.addressNameText}>{addr.buildingName || 'Home'}</Text>
                    {addr.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>PRIMARY</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.addressActions}>
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => { setEditingAddress(addr); setModalVisible(true); }}
                    >
                      <MaterialIcons name="edit" size={16} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.iconBtn, { backgroundColor: COLORS.danger }]}
                      onPress={() => handleDelete(addr._id)}
                    >
                      <MaterialIcons name="delete" size={16} color="#fff" />
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
                    <Text style={styles.addressValue}>{item.value}</Text>
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
    borderRadius: scale(16),
    backgroundColor: COLORS.white,
    padding: scale(12),
    marginBottom: scale(10),
    elevation: 3,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
  },
  defaultBorder: { borderColor: COLORS.primary },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scale(10),
  },
  addressNameRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  addressNameText: { fontSize: scale(14), fontWeight: '800', color: COLORS.secondary },
  defaultBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  defaultBadgeText: { fontSize: scale(9), fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  addressActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(10),
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { height: 1, backgroundColor: COLORS.accent, marginBottom: scale(10) },
  addressRow: { flexDirection: 'row', marginBottom: scale(6), alignItems: 'center' },
  addressLabel: { flex: 1, fontSize: scale(12), color: COLORS.primary, fontWeight: '600' },
  labelColon: { paddingHorizontal: 8, fontSize: scale(12), color: COLORS.primary, fontWeight: '600' },
  addressValue: { flex: 1.5, fontSize: scale(13), fontWeight: '800', color: COLORS.secondary },
  useAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scale(10),
    paddingTop: scale(10),
    borderTopWidth: 1,
    borderTopColor: COLORS.accent,
  },
  useAddressText: { fontSize: scale(13), fontWeight: '700', color: COLORS.secondary },

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
