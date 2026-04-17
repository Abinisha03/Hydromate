import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, ScrollView, SafeAreaView, StatusBar,
  TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput,
  Linking, Share, Platform, Animated, KeyboardAvoidingView
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
  const createInvite = useMutation(api.invites.createInvite);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [generated, setGenerated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    if (!name.trim()) { 
      Alert.alert('Error', 'Name is required.'); 
      return; 
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      Alert.alert('Error', 'Please give correct mail id.');
      return;
    }

    const phoneRegex = /^\d{10}$/;
    if (!phone.trim() || !phoneRegex.test(phone.trim())) {
      Alert.alert('Error', 'Please give correct phone number.');
      return;
    }

    const newCode = `HM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    setIsLoading(true);
    try {
      await createInvite({ name: name.trim(), email: email.trim(), inviteCode: newCode, phone: phone.trim() });
      setCode(newCode); setGenerated(true);
    } catch (e: any) { Alert.alert('Error', e.message); } finally { setIsLoading(false); }
  };

  const handleClose = () => { setName(''); setEmail(''); setPhone(''); setCode(''); setGenerated(false); onClose(); };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>Add New Staff</Text>
            <TouchableOpacity onPress={handleClose}><MaterialIcons name="close" size={20} color={COLORS.text} /></TouchableOpacity>
          </View>
          {!generated ? (
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={modalStyles.label}>Staff Name</Text>
                <TextInput style={modalStyles.input} placeholder="e.g. Karthi" value={name} onChangeText={setName} />
                <Text style={modalStyles.label}>Email Address</Text>
                <TextInput style={modalStyles.input} placeholder="Enter email address" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
                <Text style={modalStyles.label}>Phone Number</Text>
                <TextInput style={modalStyles.input} placeholder="Enter phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={10} />
                <TouchableOpacity style={modalStyles.generateBtn} onPress={handleGenerate} disabled={isLoading}>
                  {isLoading ? <ActivityIndicator color="#fff" /> : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <MaterialIcons name="link" size={16} color="#fff" />
                      <Text style={modalStyles.generateBtnText}>GENERATE INVITE</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </KeyboardAvoidingView>
          ) : (
            <View style={modalStyles.inviteBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginBottom: 12 }}>
                <MaterialIcons name="receipt" size={18} color={COLORS.secondary} />
                <Text style={modalStyles.codeText}>{code}</Text>
              </View>
              <View style={{ backgroundColor: '#F9FAFB', padding: 14, borderRadius: 10, width: '100%', marginBottom: 16 }}>
                 <Text style={{ fontSize: scale(10), fontWeight: '800', color: COLORS.text, marginBottom: 10 }}>🚰 HydroMate Staff Invite</Text>
                 <Text style={{ fontSize: scale(10), color: COLORS.text, marginBottom: 6 }}>Hi {name}!</Text>
                 <Text style={{ fontSize: scale(10), color: COLORS.text, marginBottom: 10 }}>You've been invited to join HydroMate as a Delivery Staff member.</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
                 <TouchableOpacity style={[modalStyles.shareBtn, { backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.primary }]} onPress={() => {
                     const msg = `*HydroMate Staff Invite*\n\nHi ${name}!\n\nYou've been invited to join HydroMate as a Delivery Staff member.\n\n📱 Download the app and sign up using your email: *${email}*\n\n🔑 Your invite code: *${code}*\n\nRight after you sign in, the app will ask for this code and your phone number. Enter them to activate your staff dashboard instantly!\n\n- HydroMate Team`;
                     Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`).catch(() => {
                         Share.share({ message: msg });
                     });
                     handleClose();
                 }}>
                    <MaterialIcons name="share" size={16} color={COLORS.primary} />
                    <Text style={[modalStyles.shareBtnText, { color: COLORS.primary }]}>Share</Text>
                 </TouchableOpacity>
                 <TouchableOpacity style={[modalStyles.shareBtn, { backgroundColor: '#3B82F6', borderWidth: 1, borderColor: '#3B82F6' }]} onPress={() => {
                     const msg = `*HydroMate Staff Invite*\n\nHi ${name}!\n\nYou've been invited to join HydroMate as a Delivery Staff member.\n\n📱 Download the app and sign up using your email: *${email}*\n\n🔑 Your invite code: *${code}*\n\nRight after you sign in, the app will ask for this code and your phone number. Enter them to activate your staff dashboard instantly!\n\n- HydroMate Team`;
                     Linking.openURL(`mailto:${email}?subject=HydroMate Staff Invitation&body=${encodeURIComponent(msg)}`).catch(() => {
                         Share.share({ message: msg });
                     });
                     handleClose();
                 }}>
                    <MaterialIcons name="email" size={16} color="#fff" />
                    <Text style={[modalStyles.shareBtnText, { color: '#fff' }]}>Send Email</Text>
                 </TouchableOpacity>
              </View>
              <View style={{ backgroundColor: '#EFF6FF', padding: 10, borderRadius: 8, marginTop: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 6, width: '100%', borderWidth: 1, borderColor: '#BFDBFE' }}>
                 <MaterialIcons name="info-outline" size={14} color="#3B82F6" style={{ marginTop: 1 }} />
                 <Text style={{ fontSize: scale(8), color: '#1E40AF', flex: 1, lineHeight: 14 }}>The staff member will be automatically activated when they sign up and enter this code.</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDER CARD (VERY COMPACT - IMAGE 1 STYLE)
// ─────────────────────────────────────────────────────────────────────────────
function OrderCard({ order, isExpanded, onToggle }: { order: any, isExpanded: boolean, onToggle: () => void }) {
  const [assignModal, setAssignModal] = useState(false);
  const approveOrder = useMutation(api.orders.approveOrder);
  const rejectOrder = useMutation(api.orders.rejectOrder);
  const deleteOrder = useMutation(api.orders.adminDeleteOrder);
  const [loading, setLoading] = useState<string | null>(null);

  const statusC = statusColor(order.status);
  const isPending = order.status === 'Pending';
  const isActionable = ['Pending', 'Assigned', 'Approved'].includes(order.status);

  const doApprove = async () => {
    setLoading('approve');
    try { await approveOrder({ orderId: order._id }); } catch (e) { Alert.alert('Error', (e as Error).message); } finally { setLoading(null); }
  };
  const doReject = async () => {
    setLoading('reject');
    try { await rejectOrder({ orderId: order._id }); } catch (e) { Alert.alert('Error', (e as Error).message); } finally { setLoading(null); }
  };
  const confirmDelete = () => {
    const handle = () => deleteOrder({ orderId: order._id }).catch(e => Alert.alert('Error', e.message));
    if (Platform.OS === 'web') { if (window.confirm(`Delete Order #${order.orderId.slice(-5)}?`)) handle(); }
    else { Alert.alert("Delete?", "Action is permanent.", [{ text: "Cancel" }, { text: "Delete", style: "destructive", onPress: handle }]); }
  };

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onToggle} style={[styles.orderCard, isExpanded && styles.orderCardExpanded]}>
      <View style={styles.orderCardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.compactId}>#{order.orderId.slice(-5)}</Text>
          <Text style={styles.compactName} numberOfLines={1}>{order.customerName || 'Customer'}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={styles.compactAmount}>₹{order.totalAmount}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusC.bg }]}>
            <Text style={[styles.statusText, { color: statusC.text }]}>{order.status}</Text>
          </View>
        </View>
        <MaterialIcons name={isExpanded ? "expand-less" : "expand-more"} size={16} color={COLORS.gray} style={{ marginLeft: 8 }} />
      </View>

      {/* Assigned staff shown in compact view below header */}
      {order.assignedStaffName && !isExpanded && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 2, paddingBottom: 4 }}>
          <MaterialIcons name="delivery-dining" size={13} color={COLORS.secondary} />
          <Text style={{ fontSize: scale(9), color: COLORS.secondary, fontWeight: '800' }}>
            Assigned: {order.assignedStaffName}
          </Text>
        </View>
      )}

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
              <Text style={styles.detailValue}>{order.quantity} × 20L</Text>
            </View>
          </View>

          <View style={styles.breakdownBox}>
             <View style={styles.totalRow}>
               <Text style={styles.totalLabel}>Grand Total</Text>
               <Text style={styles.totalValue}>₹{order.totalAmount}</Text>
             </View>
          </View>

          <View style={styles.addressRow}>
            <MaterialIcons name="location-pin" size={14} color={COLORS.secondary} />
            <Text style={styles.addressText} numberOfLines={2}>{[order.buildingName, order.streetName, order.area].filter(Boolean).join(', ') || order.pincode}</Text>
          </View>

          {/* ── ACTION ROW: Always one single line ── */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>

            {/* Assigned Staff label — shown when assigned (takes flex space) */}
            {order.assignedStaffName ? (
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <MaterialIcons name="delivery-dining" size={15} color={COLORS.secondary} />
                <Text style={{ fontSize: scale(10), color: COLORS.secondary, fontWeight: '800' }} numberOfLines={1}>
                  Assigned: {order.assignedStaffName}
                </Text>
              </View>
            ) : (
              /* Assign + Approve buttons when no staff assigned yet */
              <>
                {(isPending || order.status === 'Approved') && (
                  <TouchableOpacity
                    onPress={() => setAssignModal(true)}
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.info, borderRadius: 10, paddingVertical: 9, gap: 4 }}
                  >
                    <MaterialIcons name="person-add" size={13} color="#fff" />
                    <Text style={{ fontSize: scale(9), fontWeight: '900', color: '#fff' }}>Assign</Text>
                  </TouchableOpacity>
                )}
                {isPending && (
                  <TouchableOpacity
                    onPress={doApprove}
                    disabled={!!loading}
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.success, borderRadius: 10, paddingVertical: 9, gap: 4 }}
                  >
                    {loading === 'approve'
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <><MaterialIcons name="check" size={13} color="#fff" /><Text style={{ fontSize: scale(9), fontWeight: '900', color: '#fff' }}>Approve</Text></>
                    }
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* Cancel / Reject icon — always right side */}
            {isActionable && (
              <TouchableOpacity
                onPress={doReject}
                disabled={!!loading}
                style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' }}
              >
                {loading === 'reject'
                  ? <ActivityIndicator size="small" color={COLORS.danger} />
                  : <MaterialIcons name="close" size={17} color={COLORS.danger} />
                }
              </TouchableOpacity>
            )}

            {/* Delete icon — always right side */}
            <TouchableOpacity
              onPress={confirmDelete}
              disabled={!!loading}
              style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}
            >
              <MaterialIcons name="delete-outline" size={17} color="#475569" />
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
          <View style={[styles.statIconBox, { backgroundColor: '#F1F5F9' }]}><MaterialIcons name="grid-view" size={18} color={COLORS.gray} /></View>
          <Text style={styles.statNum}>{total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.statCard, filter === 'Pending' && { borderColor: '#F59E0B' }]} onPress={() => setFilter('Pending')}>
          <View style={[styles.statIconBox, { backgroundColor: '#FEF3C7' }]}><MaterialIcons name="hourglass-empty" size={18} color="#D97706" /></View>
          <Text style={[styles.statNum, { color: '#D97706' }]}>{pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.statCard, filter === 'Active' && { borderColor: '#3B82F6' }]} onPress={() => setFilter('Active')}>
          <View style={[styles.statIconBox, { backgroundColor: '#DBEAFE' }]}><MaterialIcons name="local-shipping" size={18} color="#2563EB" /></View>
          <Text style={[styles.statNum, { color: '#2563EB' }]}>{active}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.statCard, filter === 'Delivered' && { borderColor: COLORS.success }]} onPress={() => setFilter('Delivered')}>
          <View style={[styles.statIconBox, { backgroundColor: '#DCFCE7' }]}><MaterialIcons name="check-circle" size={18} color={COLORS.success} /></View>
          <Text style={[styles.statNum, { color: COLORS.success }]}>{delivered}</Text>
          <Text style={styles.statLabel}>Done</Text>
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
  const [quickAddModal, setQuickAddModal] = useState(false);

  const confirmDeleteInvite = (inviteId: any, inviteName: string) => {
    const handle = () => deleteInvite({ inviteId }).catch(e => Alert.alert("Error", e.message));
    if (Platform.OS === 'web') { if (window.confirm(`Revoke?`)) handle(); }
    else { Alert.alert("Revoke?", inviteName, [{ text: "Cancel" }, { text: "Revoke", style: "destructive", onPress: handle }]); }
  };

  const confirmRemove = (staffId: string, staffName: string) => {
    const handle = () => removeStaff({ staffId: staffId as any }).catch(e => Alert.alert("Error", e.message));
    if (Platform.OS === 'web') { if (window.confirm(`Remove?`)) handle(); }
    else { Alert.alert("Remove?", staffName, [{ text: "Cancel" }, { text: "Remove", style: "destructive", onPress: handle }]); }
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeaderTitle}>Manage Staff</Text>
        <TouchableOpacity 
          style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.secondary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 4 }} 
          onPress={() => setQuickAddModal(true)}
        >
          <MaterialIcons name="add" size={14} color="#fff" />
          <Text style={{ fontSize: scale(10), fontWeight: '800', color: '#fff' }}>Add Staff</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {pendingInvites && pendingInvites.map((invite) => (
          <View key={invite._id} style={styles.staffListRow}>
            <View style={styles.staffListLeft}>
              <MaterialIcons name="mail-outline" size={20} color={COLORS.warning} />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.staffListName}>{invite.name} (Pending)</Text>
                <Text style={styles.staffListSub}>{invite.email}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => confirmDeleteInvite(invite._id, invite.name)}>
              <MaterialIcons name="close" size={20} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        ))}

        {staffList === undefined ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: 30 }} /> : staffList.length === 0 ? (
          <View style={styles.emptyStateBox}><Text style={styles.emptyStateText}>No staff members.</Text></View>
        ) : (
          staffList.map((staff) => (
            <TouchableOpacity key={staff._id} style={styles.staffListRow} onPress={() => { setSelectedStaff(staff); setDetailsModal(true); }}>
              <View style={styles.staffListLeft}>
                <View style={[styles.staffListAvatar, { backgroundColor: COLORS.accent }]}><Text style={{ color: COLORS.secondary, fontWeight: '900' }}>{staff.name[0]}</Text></View>
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.staffListName}>{staff.name}</Text>
                  <Text style={styles.staffListSub}>{staff.phone || staff.email}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => confirmRemove(staff._id as any, staff.name)}>
                <MaterialIcons name="delete-outline" size={20} color={COLORS.danger} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
      <StaffDetailsModal visible={detailsModal} staff={selectedStaff} onClose={() => setDetailsModal(false)} />
      <AddStaffModal visible={quickAddModal} onClose={() => setQuickAddModal(false)} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PRICING TAB
// ─────────────────────────────────────────────────────────────────────────────
function PricingTab() {
  const pricing = useQuery(api.pricing.getPricing);
  const updatePricing = useMutation(api.pricing.updatePricing);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      <View style={styles.sectionHeaderRow}><Text style={styles.sectionHeaderTitle}>Pricing Settings</Text></View>
      <PricingItem 
        icon="water-drop" 
        title="Water Can (20L)" 
        current={pricing?.waterPrice || 0} 
        onUpdate={(val: number) => updatePricing({ waterPrice: val, bottlePrice: pricing?.bottlePrice || 0, expressCharge: pricing?.expressCharge || 0 })} 
        color={COLORS.primary} 
      />
      <PricingItem 
        icon="inventory" 
        title="Empty Container" 
        current={pricing?.bottlePrice || 0} 
        onUpdate={(val: number) => updatePricing({ waterPrice: pricing?.waterPrice || 0, bottlePrice: val, expressCharge: pricing?.expressCharge || 0 })} 
        color={COLORS.info} 
      />
      <PricingItem 
        icon="speed" 
        title="Express Delivery" 
        current={pricing?.expressCharge || 0} 
        onUpdate={(val: number) => updatePricing({ waterPrice: pricing?.waterPrice || 0, bottlePrice: pricing?.bottlePrice || 0, expressCharge: val })} 
        color={COLORS.warning} 
      />
    </ScrollView>
  );
}

function PricingItem({ icon, title, current, onUpdate, color }: any) {
  const [val, setVal] = useState('');
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    setLoading(true);
    try { await onUpdate(num); setVal(''); Alert.alert("Success", "Price updated."); }
    catch (e) { Alert.alert("Error", (e as Error).message); } finally { setLoading(false); }
  };
  return (
    <View style={pricingStyles.card}>
      <View style={pricingStyles.cardHeader}>
        <View style={[pricingStyles.iconBox, { backgroundColor: color + '15' }]}><MaterialIcons name={icon} size={20} color={color} /></View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={pricingStyles.title}>{title}</Text>
          <Text style={[pricingStyles.price, { color }]}>₹{current}</Text>
        </View>
      </View>
      <View style={pricingStyles.inputRow}>
        <TextInput style={pricingStyles.input} placeholder="New price..." keyboardType="numeric" value={val} onChangeText={setVal} />
        <TouchableOpacity style={[pricingStyles.btn, { backgroundColor: color }]} onPress={handle} disabled={loading}>
          {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={pricingStyles.btnText}>UPDATE</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
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
    <View style={[StyleSheet.absoluteFillObject, { overflow: 'hidden', backgroundColor: '#F4FDFC' }]} pointerEvents="none">
      <Animated.View style={{
        position: 'absolute', width: 600, height: 600, borderRadius: 300, 
        backgroundColor: COLORS.primary, opacity: 0.1,
        top: -200, left: -150,
        transform: [{ translateY: transY1 }, { translateX: transX1 }, { scale: scale1 }]
      }} />
      <Animated.View style={{
        position: 'absolute', width: 500, height: 500, borderRadius: 250, 
        backgroundColor: COLORS.info, opacity: 0.08,
        bottom: -150, right: -150,
        transform: [{ translateY: transY2 }, { translateX: transX2 }, { scale: scale2 }]
      }} />
      <Animated.View style={{
        position: 'absolute', width: 400, height: 400, borderRadius: 200, 
        backgroundColor: COLORS.secondary, opacity: 0.06,
        top: '40%', left: '30%',
        transform: [{ translateY: transY1 }, { translateX: transX2 }, { scale: scale2 }]
      }} />
    </View>
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

  const handleSignOut = () => {
    const doSignOut = async () => { await signOut(); router.replace('/home'); };
    if (Platform.OS === 'web') { if (window.confirm("Log out?")) doSignOut(); }
    else { Alert.alert("Log Out", "Log out of Admin?", [{ text: "Cancel" }, { text: "Log Out", style: "destructive", onPress: doSignOut }]); }
  };

  const goHome = () => router.replace('/home');

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} />
      <WaterAnimatedBackground />
      
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
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAFA' },
  stickyHeader: { backgroundColor: COLORS.secondary, paddingTop: scale(4), borderBottomLeftRadius: 20, borderBottomRightRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 8, zIndex: 100 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: scale(16), paddingVertical: scale(10) },
  homeBtn: { width: scale(32), height: scale(32), borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  brandBox: { flex: 1, alignItems: 'center' },
  brandTitle: { fontSize: scale(16), fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  brandBadge: { fontSize: scale(7), color: 'rgba(255,255,255,0.7)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: scale(10) },
  iconAction: { width: scale(32), height: scale(32), borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  profileBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', height: scale(32), paddingHorizontal: 4, borderRadius: 8, gap: 4 },
  avatarHolder: { width: scale(24), height: scale(24), borderRadius: 6, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: scale(11), fontWeight: '900', color: COLORS.secondary },
  adminName: { fontSize: scale(10), color: '#fff', fontWeight: '800', maxWidth: scale(40) },
  tabBar: { flexDirection: 'row', paddingHorizontal: scale(8), marginTop: 2 },
  tabItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: scale(10), gap: 4, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabItemActive: { borderBottomColor: COLORS.white },
  tabLabel: { fontSize: scale(10), fontWeight: '700', color: 'rgba(255,255,255,0.5)' },
  tabLabelActive: { color: COLORS.white, fontWeight: '900' },
  tabContent: { flex: 1, paddingHorizontal: scale(12), paddingTop: scale(14) },
  
  // Compact Stats (Image 1 Style)
  gridStats: { flexDirection: 'row', gap: scale(6), marginBottom: scale(14) },
  statCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 12, padding: scale(8), alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9', elevation: 2 },
  statIconBox: { width: scale(22), height: scale(22), borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  statNum: { fontSize: scale(13), fontWeight: '900', color: COLORS.text },
  statLabel: { fontSize: scale(7), fontWeight: '800', color: COLORS.gray, textTransform: 'uppercase' },

  // Order Card (Image 1 Style - "Rama")
  orderCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 12, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' },
  orderCardExpanded: { borderColor: COLORS.secondary },
  orderCardHeader: { flexDirection: 'row', alignItems: 'center' },
  compactId: { fontSize: scale(9), fontWeight: '800', color: COLORS.gray },
  compactName: { fontSize: scale(13), fontWeight: '900', color: COLORS.text },
  compactAmount: { fontSize: scale(14), fontWeight: '900', color: COLORS.secondary },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  statusText: { fontSize: scale(8), fontWeight: '900', textTransform: 'uppercase' },
  
  expandedContent: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  detailsGrid: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  detailItem: { flex: 1, backgroundColor: '#F9FAFB', padding: 8, borderRadius: 10 },
  detailLabel: { fontSize: scale(7), color: COLORS.gray, fontWeight: '800', textTransform: 'uppercase' },
  detailValue: { fontSize: scale(11), fontWeight: '800', color: COLORS.text },
  breakdownBox: { backgroundColor: '#F9FAFB', padding: 8, borderRadius: 10, marginBottom: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontWeight: '800', color: COLORS.gray, fontSize: scale(10) },
  totalValue: { fontWeight: '900', color: COLORS.secondary, fontSize: scale(14) },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, backgroundColor: '#F9FAFB', padding: 8, borderRadius: 10 },
  addressText: { fontSize: scale(10), color: COLORS.gray, flex: 1, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 4 },
  actionBtnText: { fontSize: scale(11), fontWeight: '900', color: '#fff' },

  // Staff List (Image 3 Style)
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionHeaderTitle: { fontSize: scale(14), fontWeight: '900', color: COLORS.text },
  staffListRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: '#fff', borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#F1F5F9' },
  staffListLeft: { flexDirection: 'row', alignItems: 'center' },
  staffListAvatar: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  staffListName: { fontSize: scale(13), fontWeight: '800', color: COLORS.text },
  staffListSub: { fontSize: scale(9), color: COLORS.gray },

  fab: { position: 'absolute', bottom: 20, right: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.secondary, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  emptyStateBox: { alignItems: 'center', marginTop: 40, opacity: 0.5 },
  emptyStateText: { fontSize: scale(14), fontWeight: '700', color: COLORS.gray },
  
  // Missing pieces for Admin Nav
  notificationBadge: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.danger, borderWidth: 1.5, borderColor: COLORS.secondary },
  adminMeta: { marginLeft: 8, justifyContent: 'center' },
  onlineDot: { position: 'absolute', bottom: -2, right: -2, width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success, borderWidth: 1.5, borderColor: COLORS.secondary },
  
  // Helpers
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAFA' },
  loadingText: { marginTop: 12, fontSize: scale(12), color: COLORS.gray, fontWeight: '600' },
  statCardActive: { borderColor: COLORS.secondary, backgroundColor: COLORS.accent },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  sheet: { backgroundColor: '#fff', borderRadius: 20, padding: 20, width: '90%', maxWidth: scale(320), shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: scale(15), fontWeight: '900', color: COLORS.text },
  label: { fontSize: scale(8), fontWeight: '800', color: COLORS.secondary, textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 },
  input: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 10, fontSize: scale(12), color: COLORS.text, marginBottom: 14, borderWidth: 1, borderColor: '#F1F5F9' },
  generateBtn: { backgroundColor: COLORS.secondary, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 6 },
  generateBtnText: { color: '#fff', fontSize: scale(11), fontWeight: '900', letterSpacing: 0.5 },
  inviteBox: { backgroundColor: '#fff', padding: 8, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.secondary, borderStyle: 'dashed' },
  codeText: { fontSize: scale(15), fontWeight: '900', color: COLORS.secondary, letterSpacing: 2 },
  shareBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, gap: 6 },
  shareBtnText: { fontSize: scale(10), fontWeight: '900' },
  
  // Compatibility for older modals
  emptyBox: { alignItems: 'center', paddingVertical: 30 },
  emptyText: { fontSize: scale(12), color: COLORS.gray, marginTop: 10, fontWeight: '700', textAlign: 'center' },
  staffRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  staffAvatar: { width: 36, height: 36, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  staffName: { fontSize: scale(13), fontWeight: '800', color: COLORS.text },
  staffPhone: { fontSize: scale(11), color: COLORS.gray },
});

const pricingStyles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconBox: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: scale(10), fontWeight: '800', color: COLORS.gray, textTransform: 'uppercase' },
  price: { fontSize: scale(14), fontWeight: '900' },
  inputRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 10, paddingHorizontal: 10, fontSize: scale(11), borderWidth: 1, borderColor: '#F1F5F9' },
  btn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: scale(9), fontWeight: '900' },
});
