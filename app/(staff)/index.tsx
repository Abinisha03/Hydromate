import React, { useState } from 'react';
import {
  StyleSheet, View, Text, ScrollView, SafeAreaView, StatusBar,
  TouchableOpacity, ActivityIndicator, Alert, Linking, Platform, Modal, TextInput, Animated
} from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { scale } from '@/utils/responsive';
import { Id } from '@/convex/_generated/dataModel';
import { useRouter } from 'expo-router';

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

// ─────────────────────────────────────────────────────────────────────────────
// STAFF ORDER CARD
// ─────────────────────────────────────────────────────────────────────────────
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
        setOtpError('Incorrect OTP. Please check with customer.');
      } else {
        Alert.alert('Error', typeof errorMsg === 'string' ? errorMsg : "An error occurred");
      }
    } finally {
      setLoading(null);
    }
  };

  const confirmDeliver = () => {
    setOtpInput(''); setOtpError('');
    setPaymentMode(order.paymentMode || 'COD');
    setDeliverModalVisible(true);
  };

  const isDelivered = status === 'Delivered';

  return (
    <View style={[styles.card, isDelivered && styles.cardDelivered]}>
      {/* Visual Status Bar */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: statusC.text }} />

      <View style={styles.cardHeader}>
        <View style={styles.orderIdBadge}>
          <MaterialIcons name={"receipt-long" as any} size={12} color="#64748B" />
          <Text style={styles.orderIdText}>{order.orderId}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusC.bg }]}>
          <MaterialIcons name={statusC.icon as any} size={11} color={statusC.text} />
          <Text style={[styles.statusText, { color: statusC.text }]}>{status}</Text>
        </View>
      </View>

      <View style={styles.customerBox}>
        <View style={styles.customerAvatar}>
          <MaterialIcons name="person" size={20} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.customerName}>{order.customerName || 'Customer'}</Text>
          <Text style={styles.customerPhone}>{order.customerPhone || 'No phone'}</Text>
        </View>
        <View style={styles.cansBadge}>
          <FontAwesome5 name="wine-bottle" size={11} color={COLORS.primary} />
          <Text style={styles.cansText}>{order.quantity} × 20L</Text>
        </View>
      </View>

      <View style={styles.addressBlock}>
        <MaterialIcons name={"location-on" as any} size={18} color={COLORS.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.addressMain}>{order.buildingName || 'Address Details'}</Text>
          <Text style={styles.addressSub}>
            {[order.doorNo && `Door ${order.doorNo}`, order.floorNo && `Floor ${order.floorNo}`, order.streetName, order.area].filter(Boolean).join(', ')}
          </Text>
          <Text style={styles.addressSub}>{order.location ? `${order.location} - ${order.pincode}` : order.pincode}</Text>
        </View>
        {status === 'Out for Delivery' && (
          <TouchableOpacity style={styles.mapsBtn} onPress={openMaps}>
            <MaterialIcons name={"near-me" as any} size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>AMOUNT</Text>
          <Text style={styles.metaValue}>₹{order.totalAmount}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>MODE</Text>
          <Text style={styles.metaValue}>{order.paymentMode}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>DATE</Text>
          <Text style={styles.metaValue}>{order.date}</Text>
        </View>
      </View>

      {isDelivered && order.deliveredAt && (
        <View style={styles.deliveredBadge}>
          <MaterialIcons name={"check-circle" as any} size={16} color={COLORS.success} />
          <Text style={styles.deliveredText}>Successfully delivered at {order.deliveredAt}</Text>
        </View>
      )}

      {!isDelivered && (
        <View style={styles.actionRow}>
          {status === 'Assigned' && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.info }]} onPress={() => doAction('accept')} disabled={!!loading}>
              {loading === 'accept' ? <ActivityIndicator size="small" color="#fff" /> : (
                <><MaterialIcons name={"thumb-up" as any} size={16} color="#fff" /><Text style={styles.actionBtnText}>Accept Order</Text></>
              )}
            </TouchableOpacity>
          )}

          {status === 'Accepted' && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.warning }]} onPress={() => doAction('out')} disabled={!!loading}>
              {loading === 'out' ? <ActivityIndicator size="small" color="#fff" /> : (
                <><MaterialIcons name={"local-shipping" as any} size={16} color="#fff" /><Text style={styles.actionBtnText}>Start Delivery</Text></>
              )}
            </TouchableOpacity>
          )}

          {status === 'Out for Delivery' && (
            <>
              <TouchableOpacity style={styles.mapsFullBtn} onPress={openMaps}>
                <MaterialIcons name="directions" size={16} color={COLORS.secondary} />
                <Text style={styles.mapsFullBtnText}>Navigate</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.success, flex: 1.5 }]} onPress={confirmDeliver} disabled={!!loading}>
                {loading === 'delivered' ? <ActivityIndicator size="small" color="#fff" /> : (
                  <><MaterialIcons name="verified" size={16} color="#fff" /><Text style={styles.actionBtnText}>Finish Delivery</Text></>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* OTP Delivery Verification Modal */}
      <Modal visible={deliverModalVisible} animationType="fade" transparent onRequestClose={() => setDeliverModalVisible(false)}>
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.sheet, { maxWidth: scale(400) }]}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>Security Check</Text>
              <TouchableOpacity onPress={() => setDeliverModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={modalStyles.sub}>Provide the 4-digit OTP from the customer to complete delivery.</Text>

              <Text style={modalStyles.label}>Verification Code</Text>
              <TextInput
                style={[modalStyles.input, { height: scale(64), letterSpacing: 10 }, otpError ? { borderColor: COLORS.danger } : {}]}
                keyboardType="number-pad"
                maxLength={4}
                value={otpInput}
                onChangeText={(text) => { setOtpInput(text); if (otpError) setOtpError(''); }}
                placeholder="0 0 0 0"
                placeholderTextColor="#CBD5E1"
              />
              {!!otpError && <Text style={styles.errorText}>{otpError}</Text>}

              <Text style={modalStyles.label}>Payment Method</Text>
              <View style={modalStyles.paymentRow}>
                <TouchableOpacity style={[modalStyles.paymentBtn, paymentMode === 'COD' && modalStyles.paymentBtnActive]} onPress={() => setPaymentMode('COD')}>
                  <Text style={[modalStyles.paymentBtnText, paymentMode === 'COD' && modalStyles.paymentBtnTextActive]}>Cash</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[modalStyles.paymentBtn, paymentMode === 'Online' && modalStyles.paymentBtnActive]} onPress={() => setPaymentMode('Online')}>
                  <Text style={[modalStyles.paymentBtnText, paymentMode === 'Online' && modalStyles.paymentBtnTextActive]}>UPI/Web</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={[modalStyles.primaryBtn, { backgroundColor: COLORS.success }, otpInput.length !== 4 && { opacity: 0.6 }]} 
                onPress={() => doAction('delivered', { otp: otpInput, paymentMode })} 
                disabled={!!loading || otpInput.length !== 4}
              >
                {loading === 'delivered' ? <ActivityIndicator size="small" color="#fff" /> : (
                  <><MaterialIcons name="done-all" size={20} color="#fff" /><Text style={modalStyles.primaryBtnText}>Confirm Delivery</Text></>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN STAFF DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
export default function StaffDashboard() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const orders = useQuery(api.orders.getStaffOrders);
  const convexUser = useQuery(api.users.getCurrentUser);

  const staffName = convexUser?.name || user?.fullName || 'Delivery Partner';
  const pending   = orders?.filter(o => ['Assigned', 'Accepted', 'Out for Delivery'].includes(o.status)) ?? [];
  const delivered = orders?.filter(o => o.status === 'Delivered') ?? [];

  const [filter, setFilter] = useState<'All' | 'Active' | 'Delivered'>('All');

  const handleSignOut = () => {
    const doSignOut = async () => { await signOut(); router.replace('/home'); };
    if (Platform.OS === 'web') { if (window.confirm("Logout?")) doSignOut(); }
    else { Alert.alert("Logout", "Are you sure?", [{ text: "No" }, { text: "Yes", onPress: doSignOut }]); }
  };

  const goHome = () => router.replace('/home');

  let displayOrders = orders ?? [];
  if (filter === 'Active') displayOrders = pending;
  if (filter === 'Delivered') displayOrders = delivered;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} />
      
      {/* Background patterns */}
      <View style={{ position: 'absolute', top: -40, left: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: COLORS.primary, opacity: 0.04 }} />
      <View style={{ position: 'absolute', top: 200, right: -60, width: 180, height: 180, borderRadius: 90, backgroundColor: COLORS.secondary, opacity: 0.03 }} />

      <View style={styles.stickyHeader}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.homeBtn} onPress={goHome} id="staff-home-btn">
            <MaterialIcons name="home" size={scale(20)} color="#fff" />
          </TouchableOpacity>
          <View style={styles.brandBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6) }}>
              <FontAwesome5 name="tint" size={scale(16)} color="#fff" />
              <Text style={styles.brandTitle}>HydroMate</Text>
            </View>
            <Text style={styles.brandBadge}>STAFF PORTAL</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconAction}>
              <MaterialIcons name="notifications-none" size={22} color="#fff" />
              <View style={styles.notificationBadge} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileBox} onPress={handleSignOut}>
              <View style={styles.avatarHolder}>
                <Text style={styles.avatarText}>{user?.firstName?.[0] || 'S'}</Text>
              </View>
              <View style={styles.adminMeta}>
                <Text style={styles.adminName} numberOfLines={1}>{user?.firstName || 'Staff'}</Text>
                <View style={styles.onlineDot} />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {orders !== undefined && (
        <View style={styles.gridStats}>
          <TouchableOpacity style={[styles.statCard, filter === 'All' && styles.statCardActive]} onPress={() => setFilter('All')}>
            <View style={[styles.statIconBox, { backgroundColor: '#F1F5F9' }]}><MaterialIcons name="grid-view" size={18} color={COLORS.gray} /></View>
            <View>
              <Text style={styles.statNum}>{orders.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.statCard, filter === 'Active' && { borderColor: '#3B82F6', backgroundColor: '#EFF6FF' }]} onPress={() => setFilter('Active')}>
            <View style={[styles.statIconBox, { backgroundColor: '#DBEAFE' }]}><MaterialIcons name="local-shipping" size={18} color="#2563EB" /></View>
            <View>
              <Text style={[styles.statNum, { color: '#2563EB' }]}>{pending.length}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.statCard, filter === 'Delivered' && { borderColor: COLORS.success, backgroundColor: '#F0FDF4' }]} onPress={() => setFilter('Delivered')}>
            <View style={[styles.statIconBox, { backgroundColor: '#DCFCE7' }]}><MaterialIcons name="check-circle" size={18} color={COLORS.success} /></View>
            <View>
              <Text style={[styles.statNum, { color: COLORS.success }]}>{delivered.length}</Text>
              <Text style={styles.statLabel}>Done</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {orders === undefined ? (
        <View style={styles.loadingBox}><ActivityIndicator size="large" color={COLORS.primary} /><Text style={styles.loadingText}>Loading deliveries...</Text></View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.sectionHeaderRow}>
            <MaterialIcons name="sort" size={16} color={COLORS.secondary} />
            <Text style={styles.sectionTitle}>{filter === 'All' ? 'All Assignments' : filter === 'Active' ? 'Pending Tasks' : 'Recent Deliveries'}</Text>
          </View>

          {displayOrders.length === 0 ? (
            <View style={styles.emptyBox}>
              <MaterialIcons name={"assignment-late" as any} size={60} color={COLORS.border} />
              <Text style={styles.emptyTitle}>Nothing here right now</Text>
              <Text style={styles.emptySubtitle}>You'll see new assignments here as soon as they're dispatched by admin.</Text>
            </View>
          ) : displayOrders.map(order => <StaffOrderCard key={order._id} order={order} />)}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { paddingHorizontal: scale(16), paddingBottom: scale(40), paddingTop: scale(12) },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, marginTop: 4 },
  sectionTitle: { fontSize: scale(15), fontWeight: '900', color: COLORS.text, textTransform: 'uppercase', letterSpacing: 1 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, color: COLORS.secondary, fontWeight: '700' },

  stickyHeader: { backgroundColor: COLORS.secondary, paddingTop: scale(8), borderBottomLeftRadius: scale(24), borderBottomRightRadius: scale(24), shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 15, elevation: 12, zIndex: 100 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: scale(20), paddingVertical: scale(14) },
  homeBtn: { width: scale(38), height: scale(38), borderRadius: scale(11), backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  brandBox: { flex: 1, gap: 0, alignItems: 'center' },
  brandTitle: { fontSize: scale(19), fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  brandBadge: { fontSize: scale(9), color: 'rgba(255,255,255,0.8)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginTop: -2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: scale(14) },
  iconAction: { width: scale(40), height: scale(40), borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  notificationBadge: { position: 'absolute', top: scale(10), right: scale(10), width: scale(8), height: scale(8), borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: COLORS.secondary },
  profileBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', padding: scale(6), paddingRight: scale(12), borderRadius: scale(14), gap: scale(8) },
  avatarHolder: { width: scale(32), height: scale(32), borderRadius: 10, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: scale(14), fontWeight: '900', color: COLORS.secondary },
  adminMeta: { gap: 2 },
  adminName: { fontSize: scale(12), color: '#fff', fontWeight: '800', maxWidth: scale(60) },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ADE80', position: 'absolute', right: -4, top: 0 },

  gridStats: { flexDirection: 'row', gap: scale(8), marginHorizontal: scale(16), marginBottom: scale(20), marginTop: scale(20) },
  statCard: { 
    flex: 1,
    backgroundColor: COLORS.white, 
    borderRadius: scale(16), 
    padding: scale(12), 
    gap: 4,
    borderWidth: 1, 
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statCardActive: { borderColor: COLORS.secondary, borderWidth: 1.5 },
  statIconBox: { width: scale(28), height: scale(28), borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  statNum: { fontSize: scale(16), fontWeight: '900', color: COLORS.text },
  statLabel: { fontSize: scale(8), fontWeight: '800', color: COLORS.gray, textTransform: 'uppercase' },

  card: { backgroundColor: COLORS.white, borderRadius: scale(24), padding: scale(16), marginBottom: scale(14), shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 4, borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden' },
  cardDelivered: { opacity: 0.9, borderColor: '#C6F6D5', backgroundColor: '#F0FDF4' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: scale(16) },
  orderIdBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', paddingHorizontal: scale(10), paddingVertical: scale(6), borderRadius: scale(10), gap: 6, borderWidth: 1, borderColor: '#F1F5F9' },
  orderIdText: { fontSize: scale(11), fontWeight: '900', color: COLORS.gray },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(10), paddingVertical: scale(6), borderRadius: scale(10), gap: scale(6) },
  statusText: { fontSize: scale(9), fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },

  customerBox: { flexDirection: 'row', alignItems: 'center', gap: scale(12), paddingVertical: scale(4), marginBottom: scale(16) },
  customerAvatar: { width: scale(44), height: scale(44), borderRadius: scale(16), backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  customerName: { fontSize: scale(16), fontWeight: '900', color: COLORS.text, letterSpacing: -0.3 },
  customerPhone: { fontSize: scale(13), color: COLORS.gray, fontWeight: '700', marginTop: 1 },
  cansBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F0F9FF', paddingHorizontal: scale(10), paddingVertical: scale(6), borderRadius: scale(10), borderWidth: 1, borderColor: '#BAE6FD' },
  cansText: { fontSize: scale(13), fontWeight: '900', color: '#0369A1' },

  addressBlock: { flexDirection: 'row', alignItems: 'center', gap: scale(12), marginBottom: scale(16), backgroundColor: '#F8FAFC', padding: scale(14), borderRadius: 16 },
  addressMain: { fontSize: scale(14), fontWeight: '800', color: COLORS.text, marginBottom: 2 },
  addressSub: { fontSize: scale(12), color: COLORS.gray, fontWeight: '600', lineHeight: 18 },
  mapsBtn: { width: scale(40), height: scale(40), borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },

  metaRow: { flexDirection: 'row', gap: scale(8), marginBottom: scale(12) },
  metaItem: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 12, padding: scale(10), alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  metaLabel: { fontSize: scale(8), color: '#94A3B8', fontWeight: '800', letterSpacing: 0.5 },
  metaValue: { fontSize: scale(13), fontWeight: '900', color: COLORS.text, marginTop: 2 },

  deliveredBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#DCFCE7', borderRadius: 14, padding: scale(12), marginTop: 4 },
  deliveredText: { fontSize: scale(12), color: '#166534', fontWeight: '800' },

  actionRow: { flexDirection: 'row', gap: scale(10), marginTop: scale(10), paddingTop: scale(16), borderTopWidth: 1, borderTopColor: '#F8FAFC' },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: scale(14), borderRadius: scale(16), gap: 8 },
  actionBtnText: { fontSize: scale(13), fontWeight: '900', color: '#fff' },
  mapsFullBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: scale(14), borderRadius: scale(16), gap: 8, borderWidth: 1.5, borderColor: COLORS.secondary, backgroundColor: COLORS.white },
  mapsFullBtnText: { fontSize: scale(13), fontWeight: '900', color: COLORS.secondary },

  emptyBox: { alignItems: 'center', paddingVertical: scale(70) },
  emptyTitle: { fontSize: scale(18), fontWeight: '900', color: COLORS.text, marginTop: 16 },
  emptySubtitle: { fontSize: scale(13), color: COLORS.gray, textAlign: 'center', marginTop: 8, lineHeight: 20, paddingHorizontal: 20 },
  errorText: { color: COLORS.danger, fontSize: scale(11), marginTop: scale(4), marginBottom: scale(12), textAlign: 'center', fontWeight: '700' },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.7)', justifyContent: 'center', alignItems: 'center', padding: scale(20) },
  sheet: { backgroundColor: COLORS.white, borderRadius: scale(28), padding: scale(24), width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 20, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: scale(20), paddingBottom: scale(14), borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  title: { fontSize: scale(20), fontWeight: '900', color: COLORS.secondary },
  sub: { fontSize: scale(14), color: COLORS.gray, textAlign: 'center', marginBottom: scale(24), fontWeight: '600' },
  label: { fontSize: scale(11), fontWeight: '800', color: COLORS.secondary, marginBottom: scale(8), marginTop: scale(16), textTransform: 'uppercase', letterSpacing: 1 },
  input: { borderWidth: 2, borderColor: '#F1F5F9', borderRadius: scale(18), padding: scale(16), fontSize: scale(24), fontWeight: '900', color: COLORS.primary, backgroundColor: '#F8FAFC', textAlign: 'center' },
  paymentRow: { flexDirection: 'row', gap: 12, marginBottom: scale(24) },
  paymentBtn: { flex: 1, paddingVertical: scale(14), borderRadius: 16, borderWidth: 2, borderColor: '#F1F5F9', alignItems: 'center', backgroundColor: '#F8FAFC' },
  paymentBtnActive: { borderColor: COLORS.primary, backgroundColor: '#F0F9FF' },
  paymentBtnText: { fontSize: scale(12), fontWeight: '800', color: '#94A3B8' },
  paymentBtnTextActive: { color: COLORS.primary },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: scale(56), borderRadius: scale(18), gap: 10 },
  primaryBtnText: { fontSize: scale(14), fontWeight: '900', color: '#fff' },
});
