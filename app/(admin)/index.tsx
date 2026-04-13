import React, { useState } from 'react';
import {
  StyleSheet, View, Text, ScrollView, SafeAreaView, StatusBar,
  TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput,
  Linking, Share, Platform, Animated
} from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { useAuth, useUser } from '@clerk/clerk-expo';
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

type Tab = 'orders' | 'staff' | 'pricing';

function statusColor(status: string) {
  switch (status.toLowerCase()) {
    case 'pending': return { bg: '#FFF5E6', text: '#C05621' };
    case 'assigned': return { bg: '#EBF8FF', text: '#2B6CB0' };
    case 'approved': return { bg: '#F0FFF4', text: '#276749' };
    case 'accepted': return { bg: '#E9D8FD', text: '#6B46C1' };
    case 'out for delivery': return { bg: '#FEFCBF', text: '#975A16' };
    case 'delivered': return { bg: '#C6F6D5', text: '#22543D' };
    case 'rejected': return { bg: '#FED7D7', text: '#822727' };
    case 'cancel': return { bg: '#FED7D7', text: '#822727' };
    default: return { bg: COLORS.accent, text: COLORS.secondary };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSIGN STAFF MODAL
// ─────────────────────────────────────────────────────────────────────────────
function AssignStaffModal({
  visible,
  orderId,
  onClose,
}: {
  visible: boolean;
  orderId: Id<'orders'> | null;
  onClose: () => void;
}) {
  const staffList = useQuery(api.users.getStaffMembers);
  const assignStaff = useMutation(api.orders.assignStaff);
  const [assigning, setAssigning] = useState(false);

  const handleAssign = async (staffId: string, staffName: string, staffPhone?: string) => {
    if (!orderId) return;
    setAssigning(true);
    try {
      await assignStaff({ orderId, staffId, staffName, staffPhone });
      Alert.alert('Success', `Order assigned to ${staffName}`);
      onClose();
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.sheet, { maxHeight: '80%' }]}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>Assign Delivery Staff</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {staffList === undefined ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
          ) : staffList.length === 0 ? (
            <View style={modalStyles.emptyBox}>
              <MaterialIcons name="people-outline" size={40} color={COLORS.gray} />
              <Text style={modalStyles.emptyText}>No staff members found.</Text>
              <Text style={[modalStyles.emptyText, { fontSize: scale(11) }]}>
                Add staff from the Staff tab first.
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {staffList.map((staff) => (
                <TouchableOpacity
                  key={staff._id}
                  style={modalStyles.staffRow}
                  onPress={() => handleAssign(staff.tokenIdentifier ?? staff.clerkId, staff.name, staff.phone || staff.email)}
                  disabled={assigning}
                >
                  <View style={modalStyles.staffAvatar}>
                    <MaterialIcons name="person" size={20} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={modalStyles.staffName}>{staff.name}</Text>
                    {staff.email ? (
                      <Text style={modalStyles.staffPhone}>{staff.email}</Text>
                    ) : staff.phone ? (
                      <Text style={modalStyles.staffPhone}>{staff.phone}</Text>
                    ) : null}
                  </View>
                  <MaterialIcons name="chevron-right" size={22} color={COLORS.primary} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADD STAFF MODAL
// ─────────────────────────────────────────────────────────────────────────────
function AddStaffModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const createInvite = useMutation(api.invites.createInvite);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [generated, setGenerated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const inviteMessage = `🚰 *HydroMate Staff Invite*\n\nHi ${name}!\n\nYou've been invited to join HydroMate as a Delivery Staff member.\n\n📱 Download the app and sign up using your email: *${email}*\n\n🔑 Your invite code: *${code}*\n\nRight after you sign in, the app will ask for this code and your phone number. Enter them to activate your staff dashboard instantly!\n\n— HydroMate Team`;

  const handleGenerate = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!authLoaded) return;
    if (!isSignedIn) {
      Alert.alert('Session Error', 'Please Sign Out and Sign In again to fix this.');
      return;
    }

    if (!trimmedName || !trimmedEmail) {
      Alert.alert('Required', 'Please enter Name and Email.');
      return;
    }

    const newCode = `HM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    setIsLoading(true);
    try {
      await createInvite({ 
        name: trimmedName, 
        email: trimmedEmail, 
        inviteCode: newCode, 
        phone: trimmedPhone 
      });
      setCode(newCode);
      setGenerated(true);

      if (Platform.OS === 'web') {
        handleEmail(newCode); 
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmail = (overrideCode?: string) => {
    const finalCode = overrideCode || code;
    const finalMessage = `🚰 *HydroMate Staff Invite*\n\nHi ${name}!\n\nYou've been invited to join HydroMate as a Delivery Staff member.\n\n📱 Download the app and sign up using your email: *${email}*\n\n🔑 Your invite code: *${finalCode}*\n\nRight after you sign in, the app will ask for this code and your phone number. Enter them to activate your staff dashboard instantly!\n\n— HydroMate Team`;

    const subject = encodeURIComponent('HydroMate Staff Invitation');
    const body = encodeURIComponent(finalMessage);
    
    if (Platform.OS === 'web') {
      const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${subject}&body=${body}`;
      window.open(url, '_blank');
      return;
    }

    const mailtoUrl = `mailto:${email}?subject=${subject}&body=${body}`;
    Linking.openURL(mailtoUrl).catch(() => {
        const gmailWebUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${subject}&body=${body}`;
        Linking.openURL(gmailWebUrl);
    });
  };

  const handleCopy = async () => {
    try {
      await Share.share({ message: inviteMessage, title: 'HydroMate Invitation' });
    } catch (e) {
      Alert.alert('Error', 'Could not share invite.');
    }
  };

  const [scaleAnim] = useState(new Animated.Value(0.95));
  const [opacityAnim] = useState(new Animated.Value(0));

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true })
      ]).start();
    } else {
      scaleAnim.setValue(0.95);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const handleClose = () => {
    setName(''); setEmail(''); setPhone(''); setCode(''); setGenerated(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <View style={modalStyles.overlay}>
        <Animated.View style={[
          modalStyles.sheet, 
          { transform: [{ scale: scaleAnim }], opacity: opacityAnim, width: '90%', maxWidth: scale(420) }
        ]}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>Add New Staff</Text>
            <TouchableOpacity onPress={handleClose}>
              <MaterialIcons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: scale(450) }}>
            <Text style={modalStyles.label}>Staff Name</Text>
            <TextInput style={[modalStyles.input, { padding: scale(14) }]} placeholder="Enter full name" value={name} onChangeText={setName} />

            <Text style={modalStyles.label}>Email Address</Text>
            <TextInput style={[modalStyles.input, { padding: scale(14) }]} placeholder="Enter email" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />

            <Text style={modalStyles.label}>Phone Number</Text>
            <TextInput style={[modalStyles.input, { padding: scale(14) }]} placeholder="Enter phone" keyboardType="phone-pad" maxLength={10} value={phone} onChangeText={setPhone} />

            {!generated ? (
              <TouchableOpacity style={[modalStyles.generateBtn, { height: scale(54) }]} onPress={handleGenerate} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <MaterialIcons name="send" size={18} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={modalStyles.generateBtnText}>GENERATE & SEND INVITE</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <View style={modalStyles.inviteBox}>
                <View style={modalStyles.codeRow}>
                  <MaterialIcons name="vpn-key" size={18} color={COLORS.secondary} />
                  <Text style={modalStyles.codeText}>{code}</Text>
                </View>
                <Text style={modalStyles.invitePreview} numberOfLines={4}>{inviteMessage}</Text>

                <View style={modalStyles.shareRow}>
                  <TouchableOpacity style={modalStyles.shareBtn} onPress={handleCopy}>
                    <MaterialIcons name="share" size={18} color={COLORS.secondary} />
                    <Text style={modalStyles.shareBtnText}>Share</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[modalStyles.shareBtn, { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary }]} onPress={() => handleEmail()}>
                    <MaterialIcons name="email" size={18} color="#fff" />
                    <Text style={[modalStyles.shareBtnText, { color: '#fff' }]}>Email</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDER CARD (COMPACT / EXPANDABLE HYBRID)
// ─────────────────────────────────────────────────────────────────────────────
function OrderCard({ order, isExpanded, onToggle }: { order: any, isExpanded: boolean, onToggle: () => void }) {
  const [assignModal, setAssignModal] = useState(false);
  const approveOrder = useMutation(api.orders.approveOrder);
  const rejectOrder = useMutation(api.orders.rejectOrder);
  const deleteOrder = useMutation(api.orders.adminDeleteOrder);
  const [loading, setLoading] = useState<string | null>(null);

  const statusC = statusColor(order.status);

  const doApprove = async () => {
    setLoading('approve');
    try { await approveOrder({ orderId: order._id }); } catch (e) { Alert.alert('Error', (e as Error).message); } finally { setLoading(null); }
  };

  const doReject = async () => {
    setLoading('reject');
    try { await rejectOrder({ orderId: order._id }); } catch (e) { Alert.alert('Error', (e as Error).message); } finally { setLoading(null); }
  };

  const confirmDelete = () => {
    const handle = async () => {
      setLoading('delete');
      try {
        console.log("Attempting to delete order:", order._id);
        const result = await deleteOrder({ orderId: order._id });
        if (Platform.OS === 'web') {
          window.alert('SUCCESS: Order has been permanently removed.');
        } else {
          Alert.alert('Deleted', 'Order has been permanently removed.');
        }
      } catch (e) {
        const errorMsg = (e as Error).message;
        console.error("Delete failed:", errorMsg);
        if (Platform.OS === 'web') {
          window.alert('ERROR: ' + errorMsg);
        } else {
          Alert.alert('Error', errorMsg);
        }
      } finally {
        setLoading(null);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm("ARE YOU SURE?\n\nThis will permanently delete Order #" + order.orderId.slice(-5) + ".\nThis action cannot be undone.")) {
        handle();
      }
    } else {
      Alert.alert(
        "Delete Order?",
        "This action is permanent and cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete Permanently", style: "destructive", onPress: handle }
        ]
      );
    }
  };

  const isPending = order.status === 'Pending';
  const isActionable = ['Pending', 'Assigned', 'Approved'].includes(order.status);

  return (
    <TouchableOpacity 
      activeOpacity={0.9} 
      onPress={onToggle}
      style={[styles.orderCard, isExpanded && { borderColor: COLORS.primary, borderWidth: 1.5, shadowOpacity: 0.1 }]}
    >
      <View style={styles.orderCardHeader}>
        <View style={styles.compactMain}>
          <Text style={styles.compactId}>#{order.orderId.slice(-5)}</Text>
          <Text style={styles.compactName} numberOfLines={1}>{order.customerName || 'Customer'}</Text>
        </View>
        <View style={styles.compactRight}>
          <Text style={styles.compactAmount}>₹{order.totalAmount}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusC.bg }]}>
            <Text style={[styles.statusText, { color: statusC.text }]}>{order.status}</Text>
          </View>
          <MaterialIcons name={isExpanded ? "expand-less" : "expand-more"} size={20} color={COLORS.gray} />
        </View>
      </View>

      {isExpanded && (
        <View style={styles.expandedContent}>
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Direct Phone</Text>
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${order.customerPhone}`)}>
                <Text style={[styles.detailValue, { color: COLORS.info }]}>{order.customerPhone || 'N/A'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Items</Text>
              <Text style={styles.detailValue}>{order.quantity} × 20L Can</Text>
            </View>
          </View>

          <View style={styles.sectionHeaderRow}>
            <MaterialIcons name="receipt" size={14} color={COLORS.gray} />
            <Text style={[styles.sectionHeaderTitle, { fontSize: scale(13), color: COLORS.gray }]}>Cost Breakdown</Text>
          </View>
          
          <View style={styles.breakdownBox}>
             <View style={styles.breakdownRow}>
               <Text style={styles.breakdownLabel}>Water ({order.quantity} × ₹{order.waterPrice})</Text>
               <Text style={styles.breakdownValue}>₹{order.quantity * order.waterPrice}</Text>
             </View>
             {order.bottlePrice > 0 && (
               <View style={styles.breakdownRow}>
                 <Text style={styles.breakdownLabel}>Container Deposits</Text>
                 <Text style={styles.breakdownValue}>+ ₹{order.bottlePrice}</Text>
               </View>
             )}
             {order.expressCharge > 0 && (
               <View style={styles.breakdownRow}>
                 <Text style={styles.breakdownLabel}>Express Delivery Charge</Text>
                 <Text style={styles.breakdownValue}>+ ₹{order.expressCharge}</Text>
               </View>
             )}
             <View style={[styles.breakdownRow, { borderTopWidth: 1, borderTopColor: '#E2E8F0', marginTop: 8, paddingTop: 8 }]}>
               <Text style={[styles.breakdownLabel, { fontWeight: '900', color: COLORS.text }]}>Total Amount</Text>
               <Text style={[styles.breakdownValue, { fontWeight: '900', color: COLORS.secondary, fontSize: scale(16) }]}>₹{order.totalAmount}</Text>
             </View>
          </View>

          <View style={styles.addressRow}>
            <MaterialIcons name={"location-on" as any} size={16} color={COLORS.secondary} />
            <Text style={styles.addressText}>
              {[order.buildingName, order.streetName, order.area].filter(Boolean).join(', ') || order.pincode}
            </Text>
          </View>

          {order.assignedStaffName && (
            <View style={styles.staffRow}>
              <View style={styles.staffAvatarSmall}><MaterialIcons name="person" size={12} color="#fff" /></View>
              <Text style={styles.staffLabel}>Assigned to {order.assignedStaffName}</Text>
            </View>
          )}

          <View style={styles.actionRow}>
            {isActionable && (
              <>
                {(isPending || order.status === 'Approved') && (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.info }]} onPress={() => setAssignModal(true)}>
                    <MaterialIcons name={"person-add" as any} size={16} color="#fff" />
                    <Text style={styles.actionBtnText}>Assign</Text>
                  </TouchableOpacity>
                )}
                {isPending && (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.success }]} onPress={doApprove} disabled={!!loading}>
                    {loading === 'approve' ? <ActivityIndicator size="small" color="#fff" /> : (
                      <><MaterialIcons name={"check-circle" as any} size={16} color="#fff" /><Text style={styles.actionBtnText}>Approve</Text></>
                    )}
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.danger, flex: 0.4 }]} onPress={doReject} disabled={!!loading}>
                  {loading === 'reject' ? <ActivityIndicator size="small" color="#fff" /> : (
                    <MaterialIcons name="close" size={18} color="#fff" />
                  )}
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: '#334155', flex: 0.4 }]} 
              onPress={confirmDelete} 
              disabled={!!loading}
            >
              {loading === 'delete' ? <ActivityIndicator size="small" color="#fff" /> : (
                <MaterialIcons name="delete-forever" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      <AssignStaffModal visible={assignModal} orderId={order._id} onClose={() => setAssignModal(false)} />
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDERS TAB
// ─────────────────────────────────────────────────────────────────────────────
function OrdersTab() {
  const orders = useQuery(api.orders.getAllOrders);
  const [filter, setFilter] = useState<'All' | 'Pending' | 'Active' | 'Delivered'>('All');
  const [expandedId, setExpandedId] = useState<Id<'orders'> | null>(null);

  if (orders === undefined) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading orders...</Text>
      </View>
    );
  }

  const total = orders.length;
  const pending = orders.filter(o => o.status === 'Pending').length;
  const delivered = orders.filter(o => o.status === 'Delivered').length;
  const active = orders.filter(o => ['Assigned', 'Accepted', 'Out for Delivery'].includes(o.status)).length;

  const filteredOrders = orders.filter(o => {
    if (filter === 'All') return true;
    if (filter === 'Active') return ['Assigned', 'Accepted', 'Out for Delivery'].includes(o.status);
    return o.status === filter;
  });

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.gridStats}>
        <TouchableOpacity style={[styles.statCard, filter === 'All' && styles.statCardActive]} onPress={() => setFilter('All')}>
          <View style={[styles.statIconBox, { backgroundColor: '#F1F5F9' }]}><MaterialIcons name={"grid-view" as any} size={18} color={COLORS.gray} /></View>
          <View>
            <Text style={styles.statNum}>{total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.statCard, filter === 'Pending' && { borderColor: '#F59E0B', backgroundColor: '#FFFBEB' }]} onPress={() => setFilter('Pending')}>
          <View style={[styles.statIconBox, { backgroundColor: '#FEF3C7' }]}><MaterialIcons name={"hourglass-empty" as any} size={18} color="#D97706" /></View>
          <View>
            <Text style={[styles.statNum, { color: '#D97706' }]}>{pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.statCard, filter === 'Active' && { borderColor: '#3B82F6', backgroundColor: '#EFF6FF' }]} onPress={() => setFilter('Active')}>
          <View style={[styles.statIconBox, { backgroundColor: '#DBEAFE' }]}><MaterialIcons name={"local-shipping" as any} size={18} color="#2563EB" /></View>
          <View>
            <Text style={[styles.statNum, { color: '#2563EB' }]}>{active}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.statCard, filter === 'Delivered' && { borderColor: COLORS.success, backgroundColor: '#F0FDF4' }]} onPress={() => setFilter('Delivered')}>
          <View style={[styles.statIconBox, { backgroundColor: '#DCFCE7' }]}><MaterialIcons name={"check-circle" as any} size={18} color={COLORS.success} /></View>
          <View>
            <Text style={[styles.statNum, { color: COLORS.success }]}>{delivered}</Text>
            <Text style={styles.statLabel}>Done</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyStateBox}>
            <FontAwesome5 name="wine-bottle" size={48} color={COLORS.border} />
            <Text style={styles.emptyStateText}>No orders found.</Text>
          </View>
        ) : (
          filteredOrders.map((order) => (
            <OrderCard 
              key={order._id} 
              order={order} 
              isExpanded={expandedId === order._id}
              onToggle={() => setExpandedId(expandedId === order._id ? null : order._id)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAFF DETAILS MODAL
// ─────────────────────────────────────────────────────────────────────────────
function StaffDetailsModal({ visible, staff, onClose }: { visible: boolean; staff: any; onClose: () => void; }) {
  const staffIdentifier = staff?.tokenIdentifier ?? staff?.clerkId ?? "";
  const stats = useQuery(api.orders.getStaffStats, staffIdentifier ? { staffIdentifier } : "skip");

  if (!staff) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>Staff Analytics</Text>
            <TouchableOpacity onPress={onClose}><MaterialIcons name="close" size={24} color={COLORS.text} /></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <View style={[modalStyles.staffAvatar, { width: 64, height: 64, borderRadius: 22 }]}><MaterialIcons name="person" size={40} color="#fff" /></View>
              <Text style={[modalStyles.staffName, { fontSize: 20, marginTop: 12 }]}>{staff.name}</Text>
              <Text style={modalStyles.staffPhone}>{staff.email || staff.phone || 'No contact info'}</Text>
            </View>

            <Text style={modalStyles.label}>Statistics</Text>
            {stats === undefined ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} /> : (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <View style={{ flex: 1, backgroundColor: '#EFF6FF', padding: 16, borderRadius: 16, alignItems: 'center' }}>
                  <Text style={{ fontSize: 24, fontWeight: '900', color: '#3B82F6' }}>{stats.total}</Text>
                  <Text style={{ fontSize: 10, color: '#3B82F6', fontWeight: '700', textTransform: 'uppercase', marginTop: 4 }}>Assigned</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#FFFBEB', padding: 16, borderRadius: 16, alignItems: 'center' }}>
                  <Text style={{ fontSize: 24, fontWeight: '900', color: '#F59E0B' }}>{stats.active}</Text>
                  <Text style={{ fontSize: 10, color: '#F59E0B', fontWeight: '700', textTransform: 'uppercase', marginTop: 4 }}>Active</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#F0FDF4', padding: 16, borderRadius: 16, alignItems: 'center' }}>
                  <Text style={{ fontSize: 24, fontWeight: '900', color: COLORS.success }}>{stats.delivered}</Text>
                  <Text style={{ fontSize: 10, color: COLORS.success, fontWeight: '700', textTransform: 'uppercase', marginTop: 4 }}>Done</Text>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAFF TAB (GRID DASHBOARD)
// ─────────────────────────────────────────────────────────────────────────────
function StaffTab() {
  const staffList = useQuery(api.users.getStaffMembers);
  const pendingInvites = useQuery(api.invites.getPendingInvites);
  const removeStaff = useMutation(api.users.removeStaff);
  const deleteInvite = useMutation(api.invites.deleteInvite);
  const [detailsModal, setDetailsModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);

  const confirmDeleteInvite = (inviteId: any, inviteName: string) => {
    const handle = () => deleteInvite({ inviteId }).catch(e => Alert.alert("Error", e.message));
    if (Platform.OS === 'web') { if (window.confirm(`Revoke invite for ${inviteName}?`)) handle(); }
    else { Alert.alert("Revoke Invite", `Revoke invite for ${inviteName}?`, [{ text: "Cancel" }, { text: "Revoke", style: "destructive", onPress: handle }]); }
  };

  const confirmRemove = (staffId: string, staffName: string) => {
    const handle = () => removeStaff({ staffId: staffId as any }).catch(e => Alert.alert("Error", e.message));
    if (Platform.OS === 'web') { if (window.confirm(`Remove ${staffName} from staff?`)) handle(); }
    else { Alert.alert("Remove Staff", `Remove ${staffName} from staff?`, [{ text: "Cancel" }, { text: "Remove", style: "destructive", onPress: handle }]); }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {pendingInvites && pendingInvites.length > 0 && (
          <View style={{ marginBottom: 32 }}>
            <View style={styles.sectionHeaderRow}>
              <MaterialIcons name={"hourglass-top" as any} size={18} color={COLORS.warning} />
              <Text style={[styles.sectionHeaderTitle, { color: COLORS.warning }]}>Pending Invites</Text>
            </View>
            <View style={styles.staffGrid}>
              {pendingInvites.map((invite) => (
                <View key={invite._id} style={[styles.staffGridCard, { borderColor: COLORS.warning, borderStyle: 'dashed' }]}>
                  <View style={[styles.staffGridAvatar, { backgroundColor: '#FFFBEB' }]}><MaterialIcons name="mail" size={24} color="#F59E0B" /></View>
                  <Text style={styles.staffGridName} numberOfLines={1}>{invite.name}</Text>
                  <Text style={styles.staffGridSub}>{invite.email}</Text>
                  <TouchableOpacity style={styles.staffGridAction} onPress={() => confirmDeleteInvite(invite._id, invite.name)}>
                    <MaterialIcons name="close" size={16} color={COLORS.danger} />
                    <Text style={[styles.staffGridActionText, { color: COLORS.danger }]}>Revoke</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.sectionHeaderRow}>
          <MaterialIcons name="verified" size={18} color={COLORS.secondary} />
          <Text style={styles.sectionHeaderTitle}>Team Members</Text>
        </View>

        {staffList === undefined ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: 30 }} /> : staffList.length === 0 ? (
          <View style={styles.emptyStateBox}><MaterialIcons name={"people-outline" as any} size={60} color={COLORS.border} /><Text style={styles.emptyStateText}>No staff members.</Text></View>
        ) : (
          <View style={styles.staffGrid}>
            {staffList.map((staff) => (
              <View key={staff._id} style={styles.staffGridCard}>
                <View style={[styles.staffGridAvatar, { backgroundColor: COLORS.accent }]}>
                  <Text style={styles.staffInitial}>{staff.name[0]}</Text>
                  <View style={styles.onlineStatusDot} />
                </View>
                <Text style={styles.staffGridName} numberOfLines={1}>{staff.name}</Text>
                <Text style={styles.staffGridSub}>{staff.phone || staff.email}</Text>
                
                <View style={styles.staffGridActions}>
                  <TouchableOpacity style={styles.staffGridIconBtn} onPress={() => { setSelectedStaff(staff); setDetailsModal(true); }}>
                    <MaterialIcons name="insights" size={20} color={COLORS.secondary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.staffGridIconBtn} onPress={() => confirmRemove(staff._id as any, staff.name)}>
                    <MaterialIcons name="person-remove" size={20} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <StaffDetailsModal visible={detailsModal} staff={selectedStaff} onClose={() => setDetailsModal(false)} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PRICING TAB
// ─────────────────────────────────────────────────────────────────────────────
function PricingTab() {
  const pricing = useQuery(api.pricing.getPricing);
  const updatePricing = useMutation(api.pricing.updatePricing);
  const [water, setWater] = useState('');
  const [empty, setEmpty] = useState('');
  const [express, setExpress] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async (type: 'water' | 'bottle' | 'express') => {
    const newVal = type === 'water' ? water : type === 'bottle' ? empty : express;
    
    // Strict Numeric Validation
    if (newVal.trim() !== "" && isNaN(parseFloat(newVal))) {
      Alert.alert('Invalid Input', 'Please enter a valid numeric amount.');
      return;
    }

    setSaving(true);
    try {
      await updatePricing({ 
        waterPrice: type === 'water' ? (parseFloat(water) || pricing?.waterPrice || 0) : (pricing?.waterPrice || 0), 
        bottlePrice: type === 'bottle' ? (parseFloat(empty) || pricing?.bottlePrice || 0) : (pricing?.bottlePrice || 0),
        expressCharge: type === 'express' ? (parseFloat(express) || pricing?.expressCharge || 0) : (pricing?.expressCharge || 0),
      });
      Alert.alert('Success', 'Price updated successfully.');
      if (type === 'water') setWater(''); 
      else if (type === 'bottle') setEmpty('');
      else setExpress('');
    } catch (e) { 
      Alert.alert('Error', (e as Error).message); 
    } finally { 
      setSaving(false); 
    }
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
      <View style={pricingStyles.premiumPanel}>
        <View style={pricingStyles.premiumCard}>
          <View style={pricingStyles.cardIcon}><MaterialIcons name="water-drop" size={24} color={COLORS.primary} /></View>
          <Text style={pricingStyles.panelTitle}>Water Can (20L)</Text>
          <Text style={pricingStyles.currentValue}>₹{pricing?.waterPrice || 0}</Text>
          <Text style={pricingStyles.label}>Update Rate</Text>
          <TextInput 
            style={pricingStyles.input} 
            keyboardType="numeric" 
            value={water} 
            onChangeText={(t) => setWater(t.replace(/[^0-9.]/g, ''))} 
            placeholder="0.00" 
          />
          <TouchableOpacity style={pricingStyles.actionBtn} onPress={() => handleSave('water')} disabled={saving}>
            <Text style={pricingStyles.btnText}>{saving ? '...' : 'PUBLISH'}</Text>
          </TouchableOpacity>
        </View>

        <View style={pricingStyles.premiumCard}>
          <View style={[pricingStyles.cardIcon, { backgroundColor: '#F0F9FF' }]}><MaterialIcons name="inventory" size={24} color="#0369A1" /></View>
          <Text style={pricingStyles.panelTitle}>Empty Container</Text>
          <Text style={pricingStyles.currentValue}>₹{pricing?.bottlePrice || 0}</Text>
          <Text style={pricingStyles.label}>Update Deposit</Text>
          <TextInput 
            style={pricingStyles.input} 
            keyboardType="numeric" 
            value={empty} 
            onChangeText={(t) => setEmpty(t.replace(/[^0-9.]/g, ''))} 
            placeholder="0.00" 
          />
          <TouchableOpacity style={[pricingStyles.actionBtn, { backgroundColor: COLORS.info }]} onPress={() => handleSave('bottle')} disabled={saving}>
            <Text style={pricingStyles.btnText}>{saving ? '...' : 'UPDATE'}</Text>
          </TouchableOpacity>
        </View>

        <View style={[pricingStyles.premiumCard, { width: '100%', flexDirection: 'row', gap: 20 }]}>
          <View style={{ flex: 1 }}>
             <View style={[pricingStyles.cardIcon, { backgroundColor: '#FEF3C7', marginBottom: 8 }]}><MaterialIcons name="speed" size={24} color="#D97706" /></View>
             <Text style={[pricingStyles.panelTitle, { textAlign: 'left' }]}>Express Delivery</Text>
             <Text style={[pricingStyles.currentValue, { color: '#D97706', marginBottom: 0 }]}>₹{pricing?.expressCharge || 0}</Text>
          </View>
          <View style={{ flex: 1.5 }}>
            <Text style={pricingStyles.label}>Update Charge</Text>
            <TextInput 
              style={pricingStyles.input} 
              keyboardType="numeric" 
              value={express} 
              onChangeText={(t) => setExpress(t.replace(/[^0-9.]/g, ''))} 
              placeholder="0.00" 
            />
            <TouchableOpacity style={[pricingStyles.actionBtn, { backgroundColor: '#D97706' }]} onPress={() => handleSave('express')} disabled={saving}>
              <Text style={pricingStyles.btnText}>{saving ? '...' : 'SAVE CHARGE'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ADMIN DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('orders');
  const [quickAddModal, setQuickAddModal] = useState(false);

  const handleSignOut = () => {
    const doSignOut = async () => { await signOut(); router.replace('/home'); };
    if (Platform.OS === 'web') { if (window.confirm("Log out?")) doSignOut(); }
    else { Alert.alert("Log Out", "Log out of Admin?", [{ text: "Cancel" }, { text: "Log Out", style: "destructive", onPress: doSignOut }]); }
  };

  const goHome = () => router.replace('/home');

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} />
      
      <View style={styles.stickyHeader}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.homeBtn} onPress={goHome} id="admin-home-btn">
            <MaterialIcons name="home" size={scale(20)} color="#fff" />
          </TouchableOpacity>
          <View style={styles.brandBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6) }}>
              <FontAwesome5 name="tint" size={scale(16)} color="#fff" />
              <Text style={styles.brandTitle}>HydroMate</Text>
            </View>
            <Text style={styles.brandBadge}>ADMIN PANEL</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconAction}>
              <MaterialIcons name="notifications-none" size={22} color="#fff" />
              <View style={styles.notificationBadge} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileBox} onPress={handleSignOut}>
              <View style={styles.avatarHolder}>
                <Text style={styles.avatarText}>{user?.firstName?.[0] || 'A'}</Text>
              </View>
              <View style={styles.adminMeta}>
                <Text style={styles.adminName} numberOfLines={1}>{user?.firstName || 'Admin'}</Text>
                <View style={styles.onlineDot} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tabBar}>
          <TouchableOpacity style={[styles.tabItem, tab === 'orders' && styles.tabItemActive]} onPress={() => setTab('orders')}>
            <MaterialIcons name={"receipt-long" as any} size={20} color={tab === 'orders' ? COLORS.white : 'rgba(255,255,255,0.6)'} />
            <Text style={[styles.tabLabel, tab === 'orders' && styles.tabLabelActive]}>Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabItem, tab === 'staff' && styles.tabItemActive]} onPress={() => setTab('staff')}>
            <MaterialIcons name={"badge" as any} size={20} color={tab === 'staff' ? COLORS.white : 'rgba(255,255,255,0.6)'} />
            <Text style={[styles.tabLabel, tab === 'staff' && styles.tabLabelActive]}>Staff</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabItem, tab === 'pricing' && styles.tabItemActive]} onPress={() => setTab('pricing')}>
            <MaterialIcons name={"payments" as any} size={20} color={tab === 'pricing' ? COLORS.white : 'rgba(255,255,255,0.6)'} />
            <Text style={[styles.tabLabel, tab === 'pricing' && styles.tabLabelActive]}>Pricing</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabContent}>
        {tab === 'orders' && <OrdersTab />}
        {tab === 'staff' && <StaffTab />}
        {tab === 'pricing' && <PricingTab />}
      </View>

      {tab === 'staff' && (
        <TouchableOpacity style={styles.fab} onPress={() => setQuickAddModal(true)}>
          <MaterialIcons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      <AddStaffModal visible={quickAddModal} onClose={() => setQuickAddModal(false)} />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
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
  tabBar: { flexDirection: 'row', paddingHorizontal: scale(10), marginTop: scale(4) },
  tabItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: scale(14), gap: scale(6), borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabItemActive: { borderBottomColor: COLORS.white },
  tabLabel: { fontSize: scale(12), fontWeight: '700', color: 'rgba(255,255,255,0.6)' },
  tabLabelActive: { color: COLORS.white, fontWeight: '900' },
  tabContent: { flex: 1, paddingHorizontal: scale(16), paddingTop: scale(20) },
  gridStats: { flexDirection: 'row', gap: scale(8), marginBottom: scale(20) },
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
  orderCard: { backgroundColor: COLORS.white, borderRadius: scale(24), padding: scale(16), marginBottom: scale(14), shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 4, borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden' },
  orderCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  compactMain: { gap: 2 },
  compactId: { fontSize: scale(11), fontWeight: '900', color: COLORS.gray },
  compactName: { fontSize: scale(15), fontWeight: '800', color: COLORS.text, width: scale(120) },
  compactRight: { flexDirection: 'row', alignItems: 'center', gap: scale(12) },
  compactAmount: { fontSize: scale(16), fontWeight: '900', color: COLORS.secondary },
  statusBadge: { paddingHorizontal: scale(10), paddingVertical: scale(6), borderRadius: 10 },
  statusText: { fontSize: scale(9), fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  expandedContent: { marginTop: scale(20), paddingTop: scale(16), borderTopWidth: 1, borderTopColor: '#F8FAFC' },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: scale(10), marginBottom: scale(16), backgroundColor: '#F8FAFC', padding: scale(14), borderRadius: 16 },
  addressText: { fontSize: scale(12), color: COLORS.gray, flex: 1, fontWeight: '600' },
  staffRow: { flexDirection: 'row', alignItems: 'center', gap: scale(8), marginBottom: scale(16), paddingHorizontal: 4 },
  staffAvatarSmall: { width: scale(20), height: scale(20), borderRadius: 6, backgroundColor: COLORS.secondary, alignItems: 'center', justifyContent: 'center' },
  staffLabel: { fontSize: scale(13), color: COLORS.secondary, fontWeight: '800' },
  actionRow: { flexDirection: 'row', gap: scale(10), marginTop: scale(10) },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: scale(14), borderRadius: scale(16), gap: 8 },
  actionBtnText: { fontSize: scale(13), fontWeight: '900', color: '#fff' },
  staffGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(12) },
  staffGridCard: { width: '48.5%', backgroundColor: COLORS.white, borderRadius: scale(24), padding: scale(16), alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, elevation: 4 },
  staffGridAvatar: { width: scale(64), height: scale(64), borderRadius: scale(22), alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  staffInitial: { fontSize: scale(24), fontWeight: '900', color: COLORS.secondary },
  onlineStatusDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#4ADE80', borderWidth: 3, borderColor: '#fff', position: 'absolute', bottom: 2, right: 2 },
  staffGridName: { fontSize: scale(16), fontWeight: '900', color: COLORS.text, marginBottom: 4 },
  staffGridSub: { fontSize: scale(11), color: COLORS.gray, fontWeight: '600', marginBottom: 16 },
  staffGridActions: { flexDirection: 'row', gap: scale(14), borderTopWidth: 1, borderTopColor: '#F8FAFC', paddingTop: 14, width: '100%', justifyContent: 'center' },
  staffGridIconBtn: { width: scale(36), height: scale(36), borderRadius: 12, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' },
  staffGridAction: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  staffGridActionText: { fontSize: scale(12), fontWeight: '800' },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, marginTop: 8 },
  sectionHeaderTitle: { fontSize: scale(16), fontWeight: '900', color: COLORS.text },
  detailsGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  detailItem: { flex: 1, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 14 },
  detailLabel: { fontSize: scale(9), color: COLORS.gray, fontWeight: '800', textTransform: 'uppercase', marginBottom: 4 },
  detailValue: { fontSize: scale(13), fontWeight: '800', color: COLORS.text },
  fab: { position: 'absolute', bottom: scale(30), right: scale(20), width: scale(60), height: scale(60), borderRadius: 30, backgroundColor: COLORS.secondary, alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: COLORS.secondary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, color: COLORS.secondary, fontWeight: '700' },
  emptyStateBox: { alignItems: 'center', marginTop: scale(60), opacity: 0.5 },
  emptyStateText: { fontSize: scale(16), fontWeight: '700', color: COLORS.gray, marginTop: scale(16) },

  // Breakdown View
  breakdownBox: { backgroundColor: '#F8FAFC', padding: scale(16), borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#EDF2F7' },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  breakdownLabel: { fontSize: scale(12), color: COLORS.gray, fontWeight: '600' },
  breakdownValue: { fontSize: scale(13), color: COLORS.text, fontWeight: '800' },
});

const pricingStyles = StyleSheet.create({
  premiumPanel: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(14), justifyContent: 'space-between', paddingHorizontal: scale(2) },
  premiumCard: { 
    width: '48%',
    backgroundColor: COLORS.white, 
    borderRadius: scale(24), 
    padding: scale(16), 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center'
  },
  cardIcon: { width: scale(40), height: scale(40), borderRadius: 12, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  panelTitle: { fontSize: scale(13), fontWeight: '800', color: COLORS.text, marginBottom: 2, textAlign: 'center' },
  currentValue: { fontSize: scale(22), fontWeight: '900', color: COLORS.secondary, marginBottom: 12 },
  label: { fontSize: scale(9), fontWeight: '800', color: COLORS.gray, textTransform: 'uppercase', letterSpacing: 0.5, alignSelf: 'flex-start', marginBottom: 4, marginLeft: 2 },
  input: { width: '100%', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 12, padding: scale(10), fontSize: scale(14), fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  actionBtn: { width: '100%', height: scale(42), backgroundColor: COLORS.secondary, borderRadius: 12, alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.secondary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1 },
  btnText: { fontSize: scale(11), fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.7)', justifyContent: 'center', alignItems: 'center', padding: scale(20) },
  sheet: { 
    backgroundColor: COLORS.white, 
    borderRadius: scale(28), 
    padding: scale(24), 
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
    overflow: 'hidden'
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: scale(20), 
    paddingBottom: scale(14), 
    borderBottomWidth: 1, 
    borderBottomColor: '#F1F5F9' 
  },
  title: { fontSize: scale(22), fontWeight: '900', color: COLORS.secondary, letterSpacing: -0.5 },
  staffRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: scale(18), 
    borderBottomWidth: 1, 
    borderBottomColor: '#F8FAFC', 
    gap: scale(16) 
  },
  staffAvatar: { 
    width: scale(52), 
    height: scale(52), 
    borderRadius: scale(18), 
    backgroundColor: COLORS.primary, 
    alignItems: 'center', 
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  staffName: { fontSize: scale(17), fontWeight: '800', color: COLORS.text },
  staffPhone: { fontSize: scale(14), color: COLORS.gray, marginTop: 3 },
  label: { 
    fontSize: scale(12), 
    fontWeight: '800', 
    color: COLORS.secondary, 
    marginBottom: scale(10), 
    marginTop: scale(24), 
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  input: { 
    borderWidth: 2, 
    borderColor: '#F1F5F9', 
    borderRadius: scale(18), 
    padding: scale(18), 
    fontSize: scale(16), 
    fontWeight: '700', 
    color: COLORS.text, 
    backgroundColor: '#F8FAFC' 
  },
  generateBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: COLORS.secondary, 
    height: scale(60), 
    borderRadius: scale(20), 
    marginTop: scale(28),
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5
  },
  generateBtnText: { fontSize: scale(15), fontWeight: '900', color: '#fff', letterSpacing: 1.5 },
  inviteBox: { 
    marginTop: scale(28), 
    borderWidth: 2, 
    borderColor: COLORS.primary, 
    borderRadius: scale(24), 
    borderStyle: 'dashed', 
    padding: scale(24), 
    backgroundColor: '#F0FDF4' 
  },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: scale(14), marginBottom: scale(20) },
  codeText: { fontSize: scale(26), fontWeight: '900', color: COLORS.secondary, letterSpacing: 6 },
  invitePreview: { 
    fontSize: scale(13), 
    color: '#475569', 
    lineHeight: scale(24), 
    backgroundColor: '#fff', 
    borderRadius: scale(16), 
    padding: scale(20), 
    marginBottom: scale(20), 
    borderWidth: 1, 
    borderColor: '#E2E8F0' 
  },
  shareRow: { flexDirection: 'row', gap: scale(14), marginBottom: scale(20) },
  shareBtn: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: scale(16), 
    backgroundColor: '#fff', 
    borderRadius: scale(20), 
    gap: scale(10), 
    borderWidth: 2, 
    borderColor: COLORS.primary 
  },
  shareBtnText: { fontSize: scale(15), fontWeight: '800', color: COLORS.secondary },
  noteBox: { flexDirection: 'row', gap: scale(12), backgroundColor: '#E0F2FE', padding: scale(18), borderRadius: scale(20), borderWidth: 1, borderColor: '#BAE6FD' },
  noteText: { flex: 1, fontSize: scale(12), color: '#0369A1', fontWeight: '700', lineHeight: scale(20) },
  emptyBox: { alignItems: 'center', paddingVertical: scale(50) },
  emptyText: { fontSize: scale(16), color: COLORS.gray, marginTop: scale(14), fontWeight: '700' },
});
