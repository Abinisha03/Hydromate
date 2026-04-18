import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, ScrollView, SafeAreaView, StatusBar,
  TouchableOpacity, ActivityIndicator, Alert, Linking, Platform, Modal, TextInput, Animated, KeyboardAvoidingView
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

function statusColor(status: string) {
  switch (status.toLowerCase()) {
    case 'pending': return { bg: '#FFF5E6', text: '#C05621', icon: 'hourglass-empty' };
    case 'assigned': return { bg: '#EBF8FF', text: '#2B6CB0', icon: 'assignment' };
    case 'accepted': return { bg: '#E9D8FD', text: '#6B46C1', icon: 'check-circle' };
    case 'out for delivery': return { bg: '#FEFCBF', text: '#975A16', icon: 'local-shipping' };
    case 'delivered': return { bg: '#C6F6D5', text: '#22543D', icon: 'done-all' };
    default: return { bg: COLORS.accent, text: COLORS.secondary, icon: 'info' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// WATER ANIMATED BACKGROUND
// ─────────────────────────────────────────────────────────────────────────────
function WaterAnimatedBackground() {
  const anim1 = useRef(new Animated.Value(0)).current;
  const anim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim1, { toValue: 1, duration: 10000, useNativeDriver: true }),
        Animated.timing(anim1, { toValue: 0, duration: 10000, useNativeDriver: true })
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(anim2, { toValue: 1, duration: 14000, useNativeDriver: true }),
        Animated.timing(anim2, { toValue: 0, duration: 14000, useNativeDriver: true })
      ])
    ).start();
  }, []);

  const transY1 = anim1.interpolate({ inputRange: [0, 1], outputRange: [0, 50] });
  const transX1 = anim1.interpolate({ inputRange: [0, 1], outputRange: [0, 20] });
  const scale1 = anim1.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });
  
  const transY2 = anim2.interpolate({ inputRange: [0, 1], outputRange: [0, -60] });
  const transX2 = anim2.interpolate({ inputRange: [0, 1], outputRange: [0, -30] });
  const scale2 = anim2.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });

  return (
    <View style={[StyleSheet.absoluteFillObject, { overflow: 'hidden', backgroundColor: '#F8FAFC' }]} pointerEvents="none">
      <Animated.View style={{
        position: 'absolute', width: 400, height: 400, borderRadius: 200, 
        backgroundColor: COLORS.primary, opacity: 0.04,
        top: -100, left: -100,
        transform: [{ translateY: transY1 }, { translateX: transX1 }, { scale: scale1 }]
      }} />
      <Animated.View style={{
        position: 'absolute', width: 300, height: 300, borderRadius: 150, 
        backgroundColor: COLORS.info, opacity: 0.03,
        bottom: -50, right: -100,
        transform: [{ translateY: transY2 }, { translateX: transX2 }, { scale: scale2 }]
      }} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAFF ORDER CARD
// ─────────────────────────────────────────────────────────────────────────────
function StaffOrderCard({ order }: { order: any }) {
  const acceptOrder = useMutation(api.orders.acceptOrder);
  const markOutForDelivery = useMutation(api.orders.markOutForDelivery);
  const markDelivered = useMutation(api.orders.markDelivered);
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
        case 'accept': await acceptOrder({ orderId: order._id as Id<'orders'> }); break;
        case 'out': await markOutForDelivery({ orderId: order._id as Id<'orders'> }); break;
        case 'delivered':
          await markDelivered({ orderId: order._id as Id<'orders'>, ...payload });
          setDeliverModalVisible(false);
          break;
      }
    } catch (e: any) {
      const errorMsg = e.data || e.message || "";
      if (typeof errorMsg === 'string' && errorMsg.includes("Invalid Delivery OTP")) {
        setOtpError('Incorrect OTP. Please enter the correct code from the customer.');
      } else { 
        // Professional fallback error that doesn't show database/convex technicalities
        Alert.alert('System Message', 'Unable to complete delivery at this time. Please try again or contact support.'); 
      }
    } finally { setLoading(null); }
  };

  const confirmDeliver = () => { setOtpInput(''); setOtpError(''); setPaymentMode(order.paymentMode || 'COD'); setDeliverModalVisible(true); };
  const isDelivered = status === 'Delivered';

  return (
    <View style={[styles.card, isDelivered && styles.cardDelivered]}>
      {/* Visual Status Bar - Slimmer */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: statusC.text }} />

      <View style={styles.cardHeader}>
        <View style={styles.idSide}>
          <MaterialIcons name="receipt" size={12} color={COLORS.gray} style={{ marginRight: 4 }} />
          <Text style={styles.orderIdText}>#{order.orderId.slice(-6)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusC.bg }]}>
          <MaterialIcons name={statusC.icon as any} size={10} color={statusC.text} />
          <Text style={[styles.statusText, { color: statusC.text }]}>{status}</Text>
        </View>
      </View>

      <View style={styles.customerRow}>
        <View style={styles.avatarIcon}>
          <MaterialIcons name="person" size={24} color="#fff" />
        </View>
        <View style={styles.customerInfoCol}>
          <Text style={styles.customerName} numberOfLines={1}>{order.customerName || 'Customer'}</Text>
          <TouchableOpacity onPress={() => Linking.openURL(`tel:${order.customerPhone}`)} style={styles.phoneAction}>
             <Text style={styles.customerPhone}>{order.customerPhone || 'No phone'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.cansBadgeCompact}>
          <MaterialIcons name="local-drink" size={12} color={COLORS.secondary} style={{ marginRight: 6 }} />
          <Text style={styles.cansText}>{order.quantity} × 20L</Text>
        </View>
      </View>

      <View style={styles.addressBlockDetailed}>
        <View style={styles.addressIconWrapper}>
           <MaterialIcons name="location-on" size={18} color={COLORS.secondary} />
        </View>
        <View style={styles.addressTextContent}>
          <Text style={styles.buildingText}>{order.buildingName || 'Home Address'}</Text>
          <Text style={styles.fullAddressText}>
            {[
              order.doorNo ? `Door ${order.doorNo}` : null,
              order.floorNo ? `Floor ${order.floorNo}` : null,
              order.streetName,
              order.area
            ].filter(Boolean).join(', ')}
          </Text>
          <Text style={styles.locationPinText}>
            {order.location} {order.pincode ? `~ ${order.pincode}` : ''}
          </Text>
        </View>
        <TouchableOpacity style={styles.navigateBtnCircle} onPress={openMaps}>
          <MaterialIcons name="near-me" size={18} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.metaGrid}>
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
        <View style={styles.deliveredBadgeCompact}>
          <MaterialIcons name="check-circle" size={12} color={COLORS.success} />
          <Text style={styles.deliveredText}>Delivered at {order.deliveredAt}</Text>
        </View>
      )}

      {!isDelivered && (
        <View style={styles.actionRowCompact}>
          {status === 'Assigned' && (
            <TouchableOpacity style={[styles.actionBtnCompact, { backgroundColor: COLORS.info }]} onPress={() => doAction('accept')} disabled={!!loading}>
              {loading === 'accept' ? <ActivityIndicator size="small" color="#fff" /> : (
                <><MaterialIcons name="thumb-up" size={12} color="#fff" /><Text style={styles.actionBtnText}>Accept</Text></>
              )}
            </TouchableOpacity>
          )}

          {status === 'Accepted' && (
            <TouchableOpacity style={[styles.actionBtnCompact, { backgroundColor: COLORS.warning }]} onPress={() => doAction('out')} disabled={!!loading}>
              {loading === 'out' ? <ActivityIndicator size="small" color="#fff" /> : (
                <><MaterialIcons name="local-shipping" size={12} color="#fff" /><Text style={styles.actionBtnText}>Deliver</Text></>
              )}
            </TouchableOpacity>
          )}

          {status === 'Out for Delivery' && (
            <View style={styles.dualActionRow}>
              <TouchableOpacity style={styles.secondaryActionBtn} onPress={openMaps}>
                <MaterialIcons name="near-me" size={14} color={COLORS.secondary} style={{ marginRight: 6 }} />
                <Text style={styles.secondaryActionBtnText}>Navigate</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryActionBtn} onPress={confirmDeliver} disabled={!!loading}>
                {loading === 'delivered' ? <ActivityIndicator size="small" color="#fff" /> : (
                  <><MaterialIcons name="check-circle" size={14} color="#fff" style={{ marginRight: 6 }} /><Text style={styles.primaryActionBtnText}>Finish Delivery</Text></>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* OTP Delivery Verification Modal */}
      <Modal visible={deliverModalVisible} animationType="fade" transparent onRequestClose={() => setDeliverModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={modalStyles.overlay}>
          <View style={[modalStyles.sheet, { maxWidth: scale(400) }]}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>Security Check</Text>
              <TouchableOpacity onPress={() => setDeliverModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={modalStyles.sub}>Provide the 4-digit OTP from the customer to complete delivery.</Text>
              <Text style={modalStyles.label}>Verification Code</Text>
              <TextInput
                style={[modalStyles.input, otpError ? { borderColor: COLORS.danger } : {}]}
                keyboardType="number-pad"
                maxLength={4}
                value={otpInput}
                onChangeText={(text) => { setOtpInput(text); if (otpError) setOtpError(''); }}
                placeholder="0 0 0 0"
                placeholderTextColor="#CBD5E1"
              />
              {!!otpError && (
                <View style={modalStyles.errorBox}>
                  <MaterialIcons name="error-outline" size={16} color={COLORS.danger} />
                  <Text style={modalStyles.errorText}>{otpError}</Text>
                </View>
              )}

              <Text style={modalStyles.label}>Payment Method</Text>
              <View style={modalStyles.paymentRow}>
                <TouchableOpacity style={[modalStyles.paymentBtn, paymentMode === 'COD' && modalStyles.paymentBtnActive]} onPress={() => setPaymentMode('COD')}>
                  <Text style={[modalStyles.paymentBtnText, paymentMode === 'COD' && modalStyles.paymentBtnTextActive]}>Cash</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[modalStyles.paymentBtn, paymentMode === 'Online' && modalStyles.paymentBtnActive]} onPress={() => setPaymentMode('Online')}>
                  <Text style={[modalStyles.paymentBtnText, paymentMode === 'Online' && modalStyles.paymentBtnTextActive]}>UPI / Web</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={[modalStyles.primaryBtn, { backgroundColor: COLORS.success }, otpInput.length !== 4 && { opacity: 0.6 }]} 
                onPress={() => doAction('delivered', { otp: otpInput, paymentMode })} 
                disabled={!!loading || otpInput.length !== 4}
              >
                {loading === 'delivered' ? <ActivityIndicator size="small" color="#fff" /> : (
                  <><MaterialIcons name="done-all" size={18} color="#fff" /><Text style={modalStyles.primaryBtnText}>Confirm Delivery</Text></>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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

  // Stats Logic - maintaining existing behavior with Pending visually displayed 
  const total = orders?.length || 0;
  const pendingOrders = orders?.filter(o => o.status === 'Assigned') || []; // Staff sees assigned as pending action
  const activeOrders = orders?.filter(o => ['Accepted', 'Out for Delivery'].includes(o.status)) || []; // In progress
  const completedOrders = orders?.filter(o => o.status === 'Delivered') || [];

  const [filter, setFilter] = useState<'All' | 'Assigned' | 'Active' | 'Completed'>('All');

  const handleSignOut = () => {
    const doSignOut = async () => { await signOut(); router.replace('/home'); };
    if (Platform.OS === 'web') { if (window.confirm("Logout?")) doSignOut(); }
    else { Alert.alert("Logout", "Are you sure you want to sign out?", [{ text: "Cancel" }, { text: "Logout", style: 'destructive', onPress: doSignOut }]); }
  };

  const goHome = () => router.replace('/home');

  let displayOrders = orders ?? [];
  if (filter === 'Assigned') {
    displayOrders = pendingOrders;
  } else if (filter === 'Active') {
    displayOrders = activeOrders;
  } else if (filter === 'Completed') {
    displayOrders = completedOrders;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} />
      <WaterAnimatedBackground />

      {/* Modern Sticky Header */}
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
            <Text style={styles.brandBadge}>STAFF PANEL</Text>
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

      {/* Enhanced Stats Row (Moved outside the green header) */}
      {orders !== undefined && (
        <View style={styles.gridStats}>
          <TouchableOpacity style={[styles.statCard, filter === 'All' && styles.statCardActive]} onPress={() => setFilter('All')}>
            <View style={[styles.statIconBox, { backgroundColor: '#E0F2FE' }]}><MaterialIcons name="grid-view" size={16} color="#0369A1" /></View>
            <Text style={styles.statNum}>{total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.statCard, filter === 'Assigned' && styles.statCardActive]} onPress={() => setFilter('Assigned')}>
            <View style={[styles.statIconBox, { backgroundColor: '#FFF7ED' }]}><MaterialIcons name="assignment" size={16} color="#C2410C" /></View>
            <Text style={[styles.statNum, { color: '#C2410C' }]}>{pendingOrders.length}</Text>
            <Text style={styles.statLabel}>Assigned</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.statCard, filter === 'Active' && styles.statCardActive]} onPress={() => setFilter('Active')}>
            <View style={[styles.statIconBox, { backgroundColor: '#EFF6FF' }]}><MaterialIcons name="local-shipping" size={16} color="#1D4ED8" /></View>
            <Text style={[styles.statNum, { color: '#1D4ED8' }]}>{activeOrders.length}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.statCard, filter === 'Completed' && styles.statCardActive]} onPress={() => setFilter('Completed')}>
            <View style={[styles.statIconBox, { backgroundColor: '#F0FDF4' }]}><MaterialIcons name="check-circle" size={16} color="#15803D" /></View>
            <Text style={[styles.statNum, { color: '#15803D' }]}>{completedOrders.length}</Text>
            <Text style={styles.statLabel}>Done</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.mainContent}>
        {orders === undefined ? (
          <View style={styles.loadingBox}><ActivityIndicator size="large" color={COLORS.primary} /><Text style={styles.loadingText}>Loading deliveries...</Text></View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            
            <View style={styles.sectionHeaderRow}>
              <MaterialIcons name="sort" size={16} color={COLORS.secondary} />
              <Text style={styles.sectionTitle}>
                {filter === 'All' ? 'ALL ASSIGNMENTS' : filter === 'Assigned' ? 'ASSIGNED ORDERS' : filter === 'Active' ? 'ACTIVE TASKS' : 'COMPLETED TASKS'}
              </Text>
            </View>

            {/* Assignments List */}
            {displayOrders.length === 0 ? (
              <View style={styles.emptyBox}>
                <MaterialIcons name="inbox" size={48} color={COLORS.border} />
                <Text style={styles.emptyTitle}>All caught up!</Text>
                <Text style={styles.emptySubtitle}>You don't have any orders here.</Text>
              </View>
            ) : displayOrders.map(order => <StaffOrderCard key={order._id} order={order} />)}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  mainContent: { flex: 1, marginTop: scale(10) },
  scrollContent: { paddingHorizontal: scale(16), paddingBottom: scale(60) },
  
  stickyHeader: { backgroundColor: COLORS.secondary, paddingTop: scale(8), paddingBottom: scale(20), borderBottomLeftRadius: scale(20), borderBottomRightRadius: scale(20), shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 12, zIndex: 100 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: scale(20), paddingTop: scale(10) },
  homeBtn: { width: scale(36), height: scale(36), borderRadius: scale(10), backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  brandBox: { flex: 1, gap: 0, alignItems: 'center' },
  brandTitle: { fontSize: scale(18), fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  brandBadge: { fontSize: scale(8), color: 'rgba(255,255,255,0.8)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginTop: -2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: scale(12) },
  iconAction: { width: scale(36), height: scale(36), borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  notificationBadge: { position: 'absolute', top: scale(8), right: scale(8), width: scale(8), height: scale(8), borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: COLORS.secondary },
  profileBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', padding: scale(4), paddingRight: scale(10), borderRadius: scale(12), gap: scale(6) },
  avatarHolder: { width: scale(28), height: scale(28), borderRadius: 8, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: scale(12), fontWeight: '900', color: COLORS.secondary },
  adminMeta: { gap: 0 },
  adminName: { fontSize: scale(11), color: '#fff', fontWeight: '800', maxWidth: scale(60) },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ADE80', position: 'absolute', right: -4, top: 0 },

  gridStats: { flexDirection: 'row', gap: scale(6), marginHorizontal: scale(16), marginTop: scale(16), marginBottom: scale(14) },
  statCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: scale(12), paddingVertical: scale(8), paddingHorizontal: scale(2), gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  statCardActive: { borderColor: COLORS.secondary, borderWidth: 1.5 },
  statIconBox: { width: scale(24), height: scale(24), borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  statNum: { fontSize: scale(14), fontWeight: '900', color: COLORS.text, lineHeight: scale(16) },
  statLabel: { fontSize: scale(6.5), fontWeight: '800', color: COLORS.gray, textTransform: 'uppercase' },

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, paddingHorizontal: 4 },
  sectionTitle: { fontSize: scale(13), fontWeight: '900', color: COLORS.text, letterSpacing: 1 },

  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, color: COLORS.secondary, fontWeight: '700' },

  card: { backgroundColor: COLORS.white, borderRadius: scale(12), padding: scale(10), marginBottom: scale(10), shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1, borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden' },
  cardDelivered: { opacity: 0.9, backgroundColor: '#FAFAFA' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: scale(6) },
  idSide: { flexDirection: 'row', alignItems: 'center' },
  orderIdText: { fontSize: scale(11), fontWeight: '900', color: COLORS.text },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(6), paddingVertical: scale(3), borderRadius: scale(6), gap: scale(4) },
  statusText: { fontSize: scale(7.5), fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },

  customerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: scale(10), gap: 10 },
  avatarIcon: { width: scale(36), height: scale(36), borderRadius: 12, backgroundColor: COLORS.secondary, alignItems: 'center', justifyContent: 'center' },
  customerInfoCol: { flex: 1 },
  customerName: { fontSize: scale(13.5), fontWeight: '900', color: COLORS.text },
  phoneAction: { flexDirection: 'row', alignItems: 'center', marginTop: 1 },
  customerPhone: { fontSize: scale(10.5), color: COLORS.gray, fontWeight: '700' },
  cansBadgeCompact: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F9FF', paddingHorizontal: scale(10), paddingVertical: scale(5), borderRadius: scale(10), borderWidth: 1, borderColor: '#BAE6FD' },
  cansText: { fontSize: scale(11), fontWeight: '900', color: COLORS.secondary },

  addressBlockDetailed: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    padding: scale(10),
    marginBottom: scale(12),
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
  },
  addressIconWrapper: {
    marginRight: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  addressTextContent: {
    flex: 1,
  },
  buildingText: {
    fontSize: scale(12),
    fontWeight: '800',
    color: COLORS.secondary,
    marginBottom: 2,
  },
  fullAddressText: {
    fontSize: scale(10),
    color: '#64748B',
    fontWeight: '600',
    lineHeight: scale(14),
  },
  locationPinText: {
    fontSize: scale(10),
    color: '#64748B',
    fontWeight: '800',
    marginTop: 2,
  },
  navigateBtnCircle: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(12),
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    elevation: 4,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },

  metaGrid: { flexDirection: 'row', gap: scale(8), marginBottom: scale(12) },
  metaItem: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: scale(8), alignItems: 'center', borderWidth: 1.5, borderColor: '#F1F5F9' },
  metaLabel: { fontSize: scale(7), color: '#94A3B8', fontWeight: '800', letterSpacing: 0.5, marginBottom: 2 },
  metaValue: { fontSize: scale(11.5), fontWeight: '900', color: COLORS.text },

  deliveredBadgeCompact: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#DCFCE7', borderRadius: 12, padding: scale(10), marginTop: scale(4) },
  deliveredText: { fontSize: scale(10), color: '#166534', fontWeight: '800' },

  actionRowCompact: { marginTop: scale(4) },
  dualActionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryActionBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary,
    paddingVertical: scale(12),
    borderRadius: 14,
    elevation: 4,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  primaryActionBtnText: {
    fontSize: scale(11.5),
    fontWeight: '900',
    color: '#fff',
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: COLORS.secondary,
    paddingVertical: scale(12),
    borderRadius: 14,
  },
  secondaryActionBtnText: {
    fontSize: scale(11.5),
    fontWeight: '900',
    color: COLORS.secondary,
  },
  actionBtnCompact: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(12),
    borderRadius: 14,
    gap: 6,
  },
  actionBtnText: { fontSize: scale(11.5), fontWeight: '900', color: '#fff' },

  emptyBox: { alignItems: 'center', paddingTop: scale(40) },
  emptyTitle: { fontSize: scale(16), fontWeight: '900', color: COLORS.text, marginTop: 12 },
  emptySubtitle: { fontSize: scale(12), color: COLORS.gray, textAlign: 'center', marginTop: 4 },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'center', alignItems: 'center', padding: scale(20) },
  sheet: { backgroundColor: COLORS.white, borderRadius: scale(24), padding: scale(20), width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: scale(16), paddingBottom: scale(12), borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  title: { fontSize: scale(18), fontWeight: '900', color: COLORS.secondary },
  sub: { fontSize: scale(12), color: COLORS.gray, textAlign: 'center', marginBottom: scale(20), fontWeight: '600', lineHeight: 18 },
  label: { fontSize: scale(10), fontWeight: '800', color: COLORS.secondary, marginBottom: scale(6), marginTop: scale(12), textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 2, borderColor: '#F1F5F9', borderRadius: scale(16), padding: scale(14), fontSize: scale(20), fontWeight: '900', color: COLORS.secondary, backgroundColor: '#F8FAFC', textAlign: 'center', letterSpacing: 8 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: scale(10),
    borderRadius: 12,
    marginTop: scale(12),
    borderWidth: 1,
    borderColor: '#FEE2E2',
    gap: 8,
  },
  errorText: { color: COLORS.danger, fontSize: scale(10.5), flex: 1, fontWeight: '700', lineHeight: 14 },
  paymentRow: { flexDirection: 'row', gap: 10, marginBottom: scale(20) },
  paymentBtn: { flex: 1, paddingVertical: scale(12), borderRadius: 12, borderWidth: 2, borderColor: '#F1F5F9', alignItems: 'center', backgroundColor: '#F8FAFC' },
  paymentBtnActive: { borderColor: COLORS.primary, backgroundColor: '#F0F9FF' },
  paymentBtnText: { fontSize: scale(11), fontWeight: '800', color: '#94A3B8' },
  paymentBtnTextActive: { color: COLORS.primary },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: scale(14), borderRadius: scale(14), gap: 8 },
  primaryBtnText: { fontSize: scale(13), fontWeight: '900', color: '#fff' },
});
