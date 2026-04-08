import React, { useState } from 'react';
import {
  StyleSheet, View, Text, ScrollView, SafeAreaView, StatusBar,
  TouchableOpacity, ActivityIndicator, Alert, Linking, Platform, Modal, TextInput
} from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { scale } from '@/utils/responsive';
import { Id } from '@/convex/_generated/dataModel';

const COLORS = {
  primary: '#2EC4B6',
  secondary: '#0F9D8A',
  accent: '#E8FFF9',
  text: '#1B3A3A',
  white: '#FFFFFF',
  gray: '#718096',
  border: '#E2E8F0',
  danger: '#E53E3E',
  warning: '#F6AD55',
  success: '#38A169',
  info: '#3182CE',
};

type DeliveryStatus = 'Assigned' | 'Accepted' | 'Out for Delivery' | 'Delivered';

function statusColor(status: string) {
  switch (status.toLowerCase()) {
    case 'assigned':        return { bg: '#EBF8FF', text: '#2B6CB0', icon: 'assignment' };
    case 'accepted':        return { bg: '#E9D8FD', text: '#6B46C1', icon: 'check-circle' };
    case 'out for delivery': return { bg: '#FEFCBF', text: '#975A16', icon: 'local-shipping' };
    case 'delivered':       return { bg: '#C6F6D5', text: '#22543D', icon: 'done-all' };
    default:                return { bg: COLORS.accent, text: COLORS.secondary, icon: 'info' };
  }
}

// ─── Staff Order Card ─────────────────────────────────────────────────────────
function StaffOrderCard({ order }: { order: any }) {
  const acceptOrder       = useMutation(api.orders.acceptOrder);
  const markOutForDelivery = useMutation(api.orders.markOutForDelivery);
  const markDelivered     = useMutation(api.orders.markDelivered);
  const [loading, setLoading] = useState<string | null>(null);

  const status = order.status as string;
  const statusC = statusColor(status);

  const [deliverModalVisible, setDeliverModalVisible] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');
  const [paymentMode, setPaymentMode] = useState(order.paymentMode || 'COD');

  const openMaps = () => {
    const query = encodeURIComponent(
      [order.buildingName, order.streetName, order.area, order.location, order.pincode]
        .filter(Boolean).join(', ')
    );
    Linking.openURL(`https://maps.google.com/?q=${query}`).catch(() =>
      Alert.alert('Error', 'Could not open Google Maps.')
    );
  };

  const doAction = async (action: string, payload?: any) => {
    setLoading(action);
    try {
      switch (action) {
        case 'accept':
          await acceptOrder({ orderId: order._id as Id<'orders'> });
          break;
        case 'out':
          await markOutForDelivery({ orderId: order._id as Id<'orders'> });
          break;
        case 'delivered':
          await markDelivered({ orderId: order._id as Id<'orders'>, ...payload });
          setDeliverModalVisible(false);
          break;
      }
    } catch (e: any) {
      const errorMsg = e.data || e.message || "";
      if (typeof errorMsg === 'string' && errorMsg.includes("Invalid Delivery OTP")) {
        setOtpError('Incorrect OTP. Please check and try again.');
      } else {
        Alert.alert('Error', typeof errorMsg === 'string' ? errorMsg : "An unexpected error occurred");
      }
    } finally {
      setLoading(null);
    }
  };

  const confirmDeliver = () => {
    setOtpInput('');
    setOtpError('');
    setPaymentMode(order.paymentMode || 'COD');
    setDeliverModalVisible(true);
  };

  const isDelivered = status === 'Delivered';

  return (
    <View style={[styles.card, isDelivered && styles.cardDelivered]}>
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <View style={styles.orderIdBadge}>
          <MaterialIcons name="receipt" size={13} color={COLORS.secondary} />
          <Text style={styles.orderIdText}>#{order.orderId}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusC.bg }]}>
          <MaterialIcons name={statusC.icon as any} size={11} color={statusC.text} />
          <Text style={[styles.statusText, { color: statusC.text }]}>{status}</Text>
        </View>
      </View>

      {/* Customer Info */}
      <View style={styles.customerBox}>
        <View style={styles.customerAvatar}>
          <MaterialIcons name="person" size={18} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.customerName}>
            {order.customerName || 'Customer'}
          </Text>
          <Text style={styles.customerPhone}>
            {order.customerPhone || 'No phone'}
          </Text>
        </View>
        <View style={styles.cansBadge}>
          <FontAwesome5 name="water" size={11} color={COLORS.primary} />
          <Text style={styles.cansText}>{order.quantity} × 20L</Text>
        </View>
      </View>

      {/* Address */}
      <View style={styles.addressBlock}>
        <MaterialIcons name="location-on" size={15} color={COLORS.primary} />
        <View style={{ flex: 1 }}>
          {order.buildingName ? (
            <Text style={styles.addressMain}>{order.buildingName}</Text>
          ) : null}
          <Text style={styles.addressSub}>
            {[
              order.doorNo && `Door ${order.doorNo}`,
              order.floorNo && `Floor ${order.floorNo}`,
              order.streetName,
              order.area,
            ].filter(Boolean).join(', ')}
          </Text>
          {order.location ? (
            <Text style={styles.addressSub}>{order.location} - {order.pincode}</Text>
          ) : (
            <Text style={styles.addressSub}>{order.pincode}</Text>
          )}
        </View>
        {/* Maps button — visible when out for delivery */}
        {status === 'Out for Delivery' && (
          <TouchableOpacity style={styles.mapsBtn} onPress={openMaps}>
            <MaterialIcons name="map" size={18} color={COLORS.white} />
          </TouchableOpacity>
        )}
      </View>


      {/* Order Meta */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Amount</Text>
          <Text style={styles.metaValue}>₹{order.totalAmount}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Payment</Text>
          <Text style={styles.metaValue}>{order.paymentMode}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Date</Text>
          <Text style={styles.metaValue}>{order.date}</Text>
        </View>
      </View>

      {/* Delivered timestamp */}
      {isDelivered && order.deliveredAt && (
        <View style={styles.deliveredBadge}>
          <MaterialIcons name="check-circle" size={14} color={COLORS.success} />
          <Text style={styles.deliveredText}>Delivered at {order.deliveredAt}</Text>
        </View>
      )}

      {/* Action Buttons */}
      {!isDelivered && (
        <View style={styles.actionRow}>
          {status === 'Assigned' && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: COLORS.info }]}
              onPress={() => doAction('accept')}
              disabled={!!loading}
            >
              {loading === 'accept' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="thumb-up" size={14} color="#fff" />
                  <Text style={styles.actionBtnText}>Accept Order</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {status === 'Accepted' && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: COLORS.warning }]}
              onPress={() => doAction('out')}
              disabled={!!loading}
            >
              {loading === 'out' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="local-shipping" size={14} color="#fff" />
                  <Text style={styles.actionBtnText}>Out for Delivery</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {status === 'Out for Delivery' && (
            <>
              <TouchableOpacity style={styles.mapsFullBtn} onPress={openMaps}>
                <MaterialIcons name="directions" size={14} color={COLORS.secondary} />
                <Text style={styles.mapsFullBtnText}>Navigate</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: COLORS.success, flex: 1.5 }]}
                onPress={confirmDeliver}
                disabled={!!loading}
              >
                {loading === 'delivered' ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="done-all" size={14} color="#fff" />
                    <Text style={styles.actionBtnText}>Mark Delivered</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* OTP Delivery Verification Modal */}
      <Modal visible={deliverModalVisible} animationType="fade" transparent onRequestClose={() => setDeliverModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Verify Delivery</Text>
            <Text style={styles.modalSub}>Ask the customer for their 4-digit OTP to confirm this delivery.</Text>

            <Text style={styles.modalLabel}>Enter Customer OTP</Text>
            <TextInput
              style={[styles.otpSingleInput, otpError ? { borderColor: COLORS.danger, borderWidth: 1 } : {}]}
              keyboardType="number-pad"
              maxLength={4}
              value={otpInput}
              onChangeText={(text) => {
                setOtpInput(text);
                if (otpError) setOtpError('');
              }}
              placeholder="0000"
              placeholderTextColor={COLORS.gray}
            />
            {!!otpError && (
              <Text style={{ color: COLORS.danger, fontSize: 13, marginTop: 4, marginBottom: 8, textAlign: 'center', fontWeight: '500' }}>{otpError}</Text>
            )}

            <Text style={styles.modalLabel}>Payment Method Collected</Text>
            <View style={styles.paymentRow}>
              <TouchableOpacity
                style={[styles.paymentBtn, paymentMode === 'COD' && styles.paymentBtnActive]}
                onPress={() => setPaymentMode('COD')}
              >
                <Text style={[styles.paymentBtnText, paymentMode === 'COD' && styles.paymentBtnTextActive]}>Cash (COD)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.paymentBtn, paymentMode === 'Online' && styles.paymentBtnActive]}
                onPress={() => setPaymentMode('Online')}
              >
                <Text style={[styles.paymentBtnText, paymentMode === 'Online' && styles.paymentBtnTextActive]}>Online / UPI</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setDeliverModalVisible(false)}
                disabled={!!loading}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.verifyBtn, otpInput.length !== 4 && { opacity: 0.6 }]}
                onPress={() => doAction('delivered', { otp: otpInput, paymentMode })}
                disabled={!!loading || otpInput.length !== 4}
              >
                {loading === 'delivered' ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="verified-user" size={16} color="#fff" />
                    <Text style={styles.verifyBtnText}>Verify & Deliver</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Main Staff Dashboard ─────────────────────────────────────────────────────
export default function StaffDashboard() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const orders = useQuery(api.orders.getStaffOrders);

  const pending   = orders?.filter(o => ['Assigned', 'Accepted', 'Out for Delivery'].includes(o.status)) ?? [];
  const delivered = orders?.filter(o => o.status === 'Delivered') ?? [];

  const [filter, setFilter] = useState<'All' | 'Active' | 'Delivered'>('All');

  const handleSignOut = () => {
    if (Platform.OS === 'web') {
      const ok = window.confirm("Are you sure you want to log out?");
      if (ok) {
        signOut();
      }
    } else {
      Alert.alert(
        "Log Out",
        "Are you sure you want to log out?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Log Out", style: "destructive", onPress: () => signOut() },
        ]
      );
    }
  };

  let displayOrders = orders ?? [];
  if (filter === 'Active') displayOrders = pending;
  if (filter === 'Delivered') displayOrders = delivered;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.staffAvatarBox}>
            <MaterialIcons name="delivery-dining" size={20} color="#fff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Staff Dashboard</Text>
            <Text style={styles.headerSub}>
              {user?.fullName || 'Delivery Partner'}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <MaterialIcons name="logout" size={18} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Stats Bar */}
      {orders !== undefined && (
        <View style={styles.statsBar}>
          <TouchableOpacity 
            style={[styles.statItem, filter === 'All' && { opacity: 1 }]} 
            onPress={() => setFilter('All')}
          >
            <Text style={[styles.statNum, filter === 'All' && { textDecorationLine: 'underline' }]}>{orders.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </TouchableOpacity>
          <View style={[styles.statDivider]} />
          <TouchableOpacity 
            style={[styles.statItem, filter === 'Active' && { opacity: 1 }]} 
            onPress={() => setFilter('Active')}
          >
            <Text style={[styles.statNum, { color: '#C05621' }, filter === 'Active' && { textDecorationLine: 'underline' }]}>{pending.length}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity 
            style={[styles.statItem, filter === 'Delivered' && { opacity: 1 }]} 
            onPress={() => setFilter('Delivered')}
          >
            <Text style={[styles.statNum, { color: COLORS.success }, filter === 'Delivered' && { textDecorationLine: 'underline' }]}>{delivered.length}</Text>
            <Text style={styles.statLabel}>Delivered</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      {orders === undefined ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading your deliveries...</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Deliveries Section */}
          <Text style={styles.sectionTitle}>
            <MaterialIcons name={filter === 'Delivered' ? 'done-all' : filter === 'Active' ? 'local-shipping' : 'list'} size={14} color={COLORS.secondary} />
            {'  '}{filter === 'All' ? 'All Deliveries' : filter === 'Active' ? 'Active Deliveries' : 'Completed Deliveries'}
          </Text>

          {displayOrders.length === 0 ? (
            <View style={styles.emptyBox}>
              <MaterialIcons name="inbox" size={48} color={COLORS.border} />
              <Text style={styles.emptyTitle}>No orders found</Text>
              <Text style={styles.emptySubtitle}>
                {filter === 'All' 
                  ? 'When the admin assigns an order to you, it will appear here in real time.' 
                  : filter === 'Active' 
                  ? 'No active orders right now.' 
                  : 'No delivered orders yet.'}
              </Text>
            </View>
          ) : (
            displayOrders.map(order => <StaffOrderCard key={order._id} order={order} />)
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.accent },

  // Header
  header: {
    backgroundColor: COLORS.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
    elevation: 4,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: scale(10) },
  staffAvatarBox: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(12),
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: scale(16), fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  headerSub: { fontSize: scale(11), color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  signOutBtn: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(12),
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Stats Bar
  statsBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingVertical: scale(10),
    paddingHorizontal: scale(20),
    elevation: 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: scale(20), fontWeight: '900', color: COLORS.secondary },
  statLabel: { fontSize: scale(10), color: COLORS.gray, fontWeight: '700', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: COLORS.border, marginVertical: scale(4) },

  // Scroll
  scrollContent: { padding: scale(12), paddingBottom: scale(30) },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, color: COLORS.secondary, fontWeight: '700', fontSize: scale(13) },

  // Section
  sectionTitle: {
    fontSize: scale(13),
    fontWeight: '900',
    color: COLORS.secondary,
    marginBottom: scale(10),
    marginTop: scale(4),
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center' },
  sectionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scale(10),
    marginTop: scale(8),
    marginBottom: scale(6),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  // Empty State
  emptyBox: {
    alignItems: 'center',
    paddingVertical: scale(40),
    paddingHorizontal: scale(20),
  },
  emptyTitle: {
    fontSize: scale(15),
    fontWeight: '800',
    color: COLORS.text,
    marginTop: scale(12),
  },
  emptySubtitle: {
    fontSize: scale(12),
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: scale(6),
    lineHeight: scale(18),
  },

  // Card
  card: {
    backgroundColor: COLORS.white,
    borderRadius: scale(16),
    padding: scale(12),
    marginBottom: scale(12),
    elevation: 3,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardDelivered: {
    borderColor: '#C6F6D5',
    opacity: 0.85,
  },

  // Card Header
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(10),
  },
  orderIdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
    borderRadius: scale(8),
    gap: scale(4),
  },
  orderIdText: { fontSize: scale(11), fontWeight: '900', color: COLORS.secondary },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
    borderRadius: scale(8),
    gap: scale(4),
  },
  statusText: {
    fontSize: scale(9),
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Customer
  customerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    backgroundColor: COLORS.accent,
    borderRadius: scale(12),
    padding: scale(10),
    marginBottom: scale(10),
  },
  customerAvatar: {
    width: scale(34),
    height: scale(34),
    borderRadius: scale(10),
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerName: { fontSize: scale(13), fontWeight: '800', color: COLORS.text },
  customerPhone: { fontSize: scale(11), color: COLORS.gray, fontWeight: '600' },
  cansBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    backgroundColor: COLORS.white,
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  cansText: { fontSize: scale(11), fontWeight: '900', color: COLORS.primary },

  // Address
  addressBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scale(6),
    marginBottom: scale(8),
  },
  addressMain: { fontSize: scale(12), fontWeight: '800', color: COLORS.text },
  addressSub: { fontSize: scale(11), color: COLORS.gray, fontWeight: '500' },
  mapsBtn: {
    width: scale(34),
    height: scale(34),
    borderRadius: scale(10),
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // OTP
  otpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    marginBottom: scale(8),
    backgroundColor: '#FFFBEB',
    borderRadius: scale(10),
    padding: scale(8),
  },
  otpLabel: { fontSize: scale(11), color: COLORS.gray, fontWeight: '600', flex: 1 },
  otpValue: {
    fontSize: scale(16),
    fontWeight: '900',
    color: COLORS.secondary,
    letterSpacing: 4,
  },

  // Meta
  metaRow: {
    flexDirection: 'row',
    marginBottom: scale(8),
    gap: scale(6),
  },
  metaItem: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: scale(10),
    padding: scale(8),
    alignItems: 'center',
  },
  metaLabel: { fontSize: scale(9), color: COLORS.gray, fontWeight: '600' },
  metaValue: { fontSize: scale(11), fontWeight: '800', color: COLORS.text, marginTop: 2 },

  // Delivered
  deliveredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    backgroundColor: '#F0FFF4',
    borderRadius: scale(10),
    padding: scale(8),
    marginBottom: scale(4),
  },
  deliveredText: { fontSize: scale(11), color: COLORS.success, fontWeight: '700' },

  // Actions
  actionRow: {
    flexDirection: 'row',
    gap: scale(8),
    marginTop: scale(8),
    paddingTop: scale(10),
    borderTopWidth: 1,
    borderTopColor: COLORS.accent,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(10),
    borderRadius: scale(12),
    gap: scale(6),
    elevation: 2,
  },
  actionBtnText: { fontSize: scale(12), fontWeight: '900', color: '#fff' },
  mapsFullBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(10),
    borderRadius: scale(12),
    gap: scale(6),
    borderWidth: 1.5,
    borderColor: COLORS.secondary,
    backgroundColor: COLORS.accent,
  },
  mapsFullBtnText: { fontSize: scale(12), fontWeight: '900', color: COLORS.secondary },

  // Modal Actions
  modalOverlay: { flex: 1, backgroundColor: 'rgba(27,58,58,0.7)', justifyContent: 'center', padding: scale(20) },
  modalCard: { backgroundColor: '#fff', borderRadius: scale(24), padding: scale(24), elevation: 10 },
  modalTitle: { fontSize: scale(18), fontWeight: '900', color: COLORS.secondary, marginBottom: scale(8), textAlign: 'center' },
  modalSub: { fontSize: scale(12), color: COLORS.gray, textAlign: 'center', marginBottom: scale(20), lineHeight: scale(18) },
  modalLabel: { fontSize: scale(12), fontWeight: '800', color: COLORS.text, marginBottom: scale(8) },
  otpSingleInput: { 
    height: scale(55), borderRadius: scale(12), backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: COLORS.border, 
    fontSize: scale(24), fontWeight: '900', textAlign: 'center', color: COLORS.primary, letterSpacing: scale(10), marginBottom: scale(20) 
  },
  paymentRow: { flexDirection: 'row', gap: scale(10), marginBottom: scale(24) },
  paymentBtn: { flex: 1, paddingVertical: scale(12), borderRadius: scale(12), borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', backgroundColor: '#F8FAFC' },
  paymentBtnActive: { borderColor: COLORS.primary, backgroundColor: '#F0FDF4' },
  paymentBtnText: { fontSize: scale(12), fontWeight: '800', color: COLORS.gray },
  paymentBtnTextActive: { color: COLORS.primary },
  modalActionRow: { flexDirection: 'row', gap: scale(12) },
  cancelBtn: { flex: 1, paddingVertical: scale(14), borderRadius: scale(14), backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontSize: scale(13), fontWeight: '800', color: COLORS.gray },
  verifyBtn: { flex: 1.5, paddingVertical: scale(14), borderRadius: scale(14), backgroundColor: COLORS.success, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: scale(6) },
  verifyBtnText: { fontSize: scale(13), fontWeight: '900', color: '#fff' },
});
