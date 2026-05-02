import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { scale } from '@/utils/responsive';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

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
                <TouchableOpacity style={[modalStyles.shareBtn, { backgroundColor: '#3B82F6', borderWidth: 1, borderColor: '#3B82F6' }]} onPress={async () => {
                  const subject = "HydroMate Staff Invitation";
                  const msg = `*HydroMate Staff Invite*\n\nHi ${name}!\n\nYou've been invited to join HydroMate as a Delivery Staff member.\n\n📱 Download the app and sign up using your email: *${email}*\n\n🔑 Your invite code: *${code}*\n\nRight after you sign in, the app will ask for this code and your phone number. Enter them to activate your staff dashboard instantly!\n\n- HydroMate Team`;

                  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(msg)}`;

                  try {
                    if (Platform.OS === 'web') {
                      await Linking.openURL(gmailUrl);
                    } else {
                      const gmailAppUrl = `googlegmail:///co?to=${email}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(msg)}`;
                      const canOpen = await Linking.canOpenURL(gmailAppUrl);
                      if (canOpen) {
                        await Linking.openURL(gmailAppUrl);
                      } else {
                        await Linking.openURL(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(msg)}`);
                      }
                    }
                  } catch (e) {
                    Share.share({ message: msg });
                  }
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
// ─────────────────────────────────────────────────────────────────────────────
// ORDER ROW (TABLE STYLE - IMAGE 2 STYLE)
// ─────────────────────────────────────────────────────────────────────────────
function OrderRow({ order, onAssign, onApprove, onReject, onDelete }: {
  order: any,
  onAssign: () => void,
  onApprove: () => void,
  onReject: () => void,
  onDelete: () => void
}) {
  const [showMenu, setShowMenu] = useState(false);
  const statusC = statusColor(order.status);
  const isPending = order.status === 'Pending';
  const isActionable = ['Pending', 'Assigned', 'Approved'].includes(order.status);

  return (
    <View style={styles.tableRow}>
      <View style={[styles.tableCol, { width: scale(45) }]}>
        <Text style={styles.tableTextId}>#{order.orderId.slice(-5)}</Text>
      </View>

      <View style={[styles.tableCol, { flex: 1.5 }]}>
        <Text style={styles.tableTextName} numberOfLines={1}>{order.customerName || 'Customer'}</Text>
        <Text style={styles.tableTextSub}>{order.customerPhone}</Text>
      </View>

      <View style={[styles.tableCol, { flex: 1 }]}>
        <View style={[styles.tableStatusBadge, { backgroundColor: statusC.bg }]}>
          <Text style={[styles.tableStatusText, { color: statusC.text }]}>{order.status}</Text>
        </View>
      </View>

      <View style={[styles.tableCol, { flex: 1, alignItems: 'center' }]}>
        <Text style={styles.tableTextItems}>{order.quantity}×20L</Text>
      </View>

      <View style={[styles.tableCol, { width: scale(60), alignItems: 'flex-end' }]}>
        <Text style={styles.tableTextAmount}>₹{order.totalAmount}</Text>
      </View>

      <View style={[styles.tableCol, { width: scale(40), alignItems: 'center' }]}>
        <TouchableOpacity
          onPress={() => setShowMenu(true)}
          style={styles.actionMenuBtn}
        >
          <MaterialIcons name="more-horiz" size={20} color={COLORS.gray} />
        </TouchableOpacity>
      </View>

      {/* ACTION DROPDOWN MENU */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <TouchableOpacity
          style={modalStyles.overlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.dropdownMenu}>
            <Text style={styles.menuTitle}>ORDER ACTIONS</Text>

            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); onAssign(); }}>
              <MaterialIcons name="person-add" size={18} color={COLORS.info} />
              <Text style={styles.menuItemText}>Assign Staff</Text>
            </TouchableOpacity>

            {isPending && (
              <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); onApprove(); }}>
                <MaterialIcons name="check-circle" size={18} color={COLORS.success} />
                <Text style={styles.menuItemText}>Approve Order</Text>
              </TouchableOpacity>
            )}

            {isActionable && (
              <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); onReject(); }}>
                <MaterialIcons name="cancel" size={18} color={COLORS.warning} />
                <Text style={styles.menuItemText}>Reject Order</Text>
              </TouchableOpacity>
            )}

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); onDelete(); }}>
              <MaterialIcons name="delete-outline" size={18} color={COLORS.danger} />
              <Text style={[styles.menuItemText, { color: COLORS.danger }]}>Delete Permanent</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// ORDERS TAB
// ─────────────────────────────────────────────────────────────────────────────
function OrdersTab() {
  const orders = useQuery(api.orders.getAllOrders);
  const approveOrder = useMutation(api.orders.approveOrder);
  const rejectOrder = useMutation(api.orders.rejectOrder);
  const deleteOrder = useMutation(api.orders.adminDeleteOrder);

  const [filter, setFilter] = useState<'All' | 'Pending' | 'Active' | 'Delivered'>('All');
  const [selectedOrderId, setSelectedOrderId] = useState<Id<'orders'> | null>(null);
  const [assignModal, setAssignModal] = useState(false);

  if (orders === undefined) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading orders...</Text>
      </View>
    );
  }

  const handleApprove = async (id: Id<'orders'>) => {
    try { await approveOrder({ orderId: id }); } catch (e) { Alert.alert('Error', (e as Error).message); }
  };

  const handleReject = async (id: Id<'orders'>) => {
    try { await rejectOrder({ orderId: id }); } catch (e) { Alert.alert('Error', (e as Error).message); }
  };

  const handleDelete = (id: Id<'orders'>, orderIdStr: string) => {
    const handle = () => deleteOrder({ orderId: id }).catch(e => Alert.alert('Error', e.message));
    if (Platform.OS === 'web') { if (window.confirm(`Delete Order #${orderIdStr.slice(-5)} permanently?`)) handle(); }
    else { Alert.alert("Delete?", "Action is permanent.", [{ text: "Cancel" }, { text: "Delete", style: "destructive", onPress: handle }]); }
  };

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

      <View style={styles.tableContainer}>
        {/* TABLE HEADER */}
        <View style={styles.tableHeader}>
          <View style={[styles.tableCol, { width: scale(45) }]}><Text style={styles.tableHeaderText}>ID</Text></View>
          <View style={[styles.tableCol, { flex: 1.5 }]}><Text style={styles.tableHeaderText}>CUSTOMER</Text></View>
          <View style={[styles.tableCol, { flex: 1 }]}><Text style={styles.tableHeaderText}>STATUS</Text></View>
          <View style={[styles.tableCol, { flex: 1, alignItems: 'center' }]}><Text style={styles.tableHeaderText}>ITEMS</Text></View>
          <View style={[styles.tableCol, { width: scale(60), alignItems: 'flex-end' }]}><Text style={styles.tableHeaderText}>AMOUNT</Text></View>
          <View style={[styles.tableCol, { width: scale(40), alignItems: 'center' }]}><Text style={styles.tableHeaderText}>ACT</Text></View>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          {filteredOrders.length === 0 ? (
            <View style={styles.emptyStateBox}>
              <FontAwesome5 name="wine-bottle" size={48} color={COLORS.border} />
              <Text style={styles.emptyStateText}>No orders found.</Text>
            </View>
          ) : (
            filteredOrders.map((order) => (
              <OrderRow
                key={order._id}
                order={order}
                onAssign={() => { setSelectedOrderId(order._id); setAssignModal(true); }}
                onApprove={() => handleApprove(order._id)}
                onReject={() => handleReject(order._id)}
                onDelete={() => handleDelete(order._id, order.orderId)}
              />
            ))
          )}
        </ScrollView>
      </View>
      <AssignStaffModal visible={assignModal} orderId={selectedOrderId} onClose={() => setAssignModal(false)} />
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
          style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.secondary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, gap: 6 }}
          onPress={() => setQuickAddModal(true)}
        >
          <MaterialIcons name="add" size={16} color="#fff" />
          <Text style={{ fontSize: scale(11), fontWeight: '800', color: '#fff' }}>Add New Staff</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tableContainer}>
        {/* STAFF TABLE HEADER */}
        <View style={styles.tableHeader}>
          <View style={[styles.tableCol, { width: scale(40), alignItems: 'center' }]}><Text style={styles.tableHeaderText}>AV</Text></View>
          <View style={[styles.tableCol, { flex: 1.5 }]}><Text style={styles.tableHeaderText}>STAFF NAME</Text></View>
          <View style={[styles.tableCol, { flex: 1.5 }]}><Text style={styles.tableHeaderText}>CONTACT INFO</Text></View>
          <View style={[styles.tableCol, { width: scale(60), alignItems: 'center' }]}><Text style={styles.tableHeaderText}>STATUS</Text></View>
          <View style={[styles.tableCol, { width: scale(40), alignItems: 'center' }]}><Text style={styles.tableHeaderText}>ACT</Text></View>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          {pendingInvites && pendingInvites.map((invite) => (
            <View key={invite._id} style={styles.tableRow}>
              <View style={[styles.tableCol, { width: scale(40), alignItems: 'center' }]}>
                <View style={[styles.staffListAvatar, { backgroundColor: '#FEF3C7' }]}><MaterialIcons name="mail-outline" size={16} color="#D97706" /></View>
              </View>
              <View style={[styles.tableCol, { flex: 1.5 }]}>
                <Text style={styles.tableTextName}>{invite.name}</Text>
              </View>
              <View style={[styles.tableCol, { flex: 1.5 }]}>
                <Text style={styles.tableTextSub}>{invite.email}</Text>
              </View>
              <View style={[styles.tableCol, { width: scale(60), alignItems: 'center' }]}>
                <View style={[styles.tableStatusBadge, { backgroundColor: '#FEF3C7' }]}><Text style={[styles.tableStatusText, { color: '#D97706' }]}>PENDING</Text></View>
              </View>
              <View style={[styles.tableCol, { width: scale(40), alignItems: 'center' }]}>
                <TouchableOpacity onPress={() => confirmDeleteInvite(invite._id, invite.name)} style={styles.actionMenuBtn}>
                  <MaterialIcons name="close" size={18} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {staffList === undefined ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: 30 }} /> : staffList.length === 0 ? (
            <View style={styles.emptyStateBox}><Text style={styles.emptyStateText}>No staff members.</Text></View>
          ) : (
            staffList.map((staff) => (
              <TouchableOpacity key={staff._id} style={styles.tableRow} onPress={() => { setSelectedStaff(staff); setDetailsModal(true); }}>
                <View style={[styles.tableCol, { width: scale(40), alignItems: 'center' }]}>
                  <View style={[styles.staffListAvatar, { backgroundColor: COLORS.accent }]}>
                    <Text style={{ color: COLORS.secondary, fontWeight: '900', fontSize: scale(10) }}>{staff.name[0]}</Text>
                  </View>
                </View>
                <View style={[styles.tableCol, { flex: 1.5 }]}>
                  <Text style={styles.tableTextName}>{staff.name}</Text>
                </View>
                <View style={[styles.tableCol, { flex: 1.5 }]}>
                  <Text style={styles.tableTextSub}>{staff.phone || staff.email}</Text>
                </View>
                <View style={[styles.tableCol, { width: scale(60), alignItems: 'center' }]}>
                  <View style={[styles.tableStatusBadge, { backgroundColor: '#DCFCE7' }]}><Text style={[styles.tableStatusText, { color: COLORS.success }]}>ACTIVE</Text></View>
                </View>
                <View style={[styles.tableCol, { width: scale(40), alignItems: 'center' }]}>
                  <TouchableOpacity onPress={() => confirmRemove(staff._id as any, staff.name)} style={styles.actionMenuBtn}>
                    <MaterialIcons name="delete-outline" size={18} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
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
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingBottom: scale(250) }} showsVerticalScrollIndicator={false}>
      <View style={styles.sectionHeaderRow}><Text style={styles.sectionHeaderTitle}>Pricing Settings</Text></View>

      <View style={styles.tableContainer}>
        {/* PRICING TABLE HEADER */}
        <View style={styles.tableHeader}>
          <View style={[styles.tableCol, { flex: 2, justifyContent: 'flex-start' }]}><Text style={[styles.tableHeaderText, { paddingLeft: 10 }]}>SERVICE ITEM</Text></View>
          <View style={[styles.tableCol, { flex: 1, alignItems: 'center' }]}><Text style={styles.tableHeaderText}>CURRENT</Text></View>
          <View style={[styles.tableCol, { flex: 1.5, alignItems: 'center' }]}><Text style={styles.tableHeaderText}>NEW PRICE</Text></View>
          <View style={[styles.tableCol, { width: scale(60), alignItems: 'center' }]}><Text style={styles.tableHeaderText}>ACT</Text></View>
        </View>

        <PricingTableRow
          icon="water-drop"
          title="Water Can (20L)"
          current={pricing?.waterPrice || 0}
          onUpdate={(val: number) => updatePricing({ waterPrice: val, bottlePrice: pricing?.bottlePrice || 0, expressCharge: pricing?.expressCharge || 0 })}
          color={COLORS.primary}
        />
        <PricingTableRow
          icon="inventory"
          title="Empty Container"
          current={pricing?.bottlePrice || 0}
          onUpdate={(val: number) => updatePricing({ waterPrice: pricing?.waterPrice || 0, bottlePrice: val, expressCharge: pricing?.expressCharge || 0 })}
          color={COLORS.info}
        />
        <PricingTableRow
          icon="speed"
          title="Express Delivery"
          current={pricing?.expressCharge || 0}
          onUpdate={(val: number) => updatePricing({ waterPrice: pricing?.waterPrice || 0, bottlePrice: pricing?.bottlePrice || 0, expressCharge: val })}
          color={COLORS.warning}
        />
      </View>

      <PincodeManagementSection />
    </ScrollView>
  );
}

function PincodeManagementSection() {
  const pincodes = useQuery(api.pincodes.getPincodes);
  const addPincode = useMutation(api.pincodes.addPincode);
  const updatePincode = useMutation(api.pincodes.updatePincode);
  const deletePincode = useMutation(api.pincodes.deletePincode);
  const seedPincodes = useMutation(api.pincodes.seedDefaultPincodes);

  const [label, setLabel] = useState('');
  const [value, setValue] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<Id<'pincodes'> | null>(null);

  useEffect(() => {
    if (pincodes !== undefined && pincodes.length === 0) {
      seedPincodes();
    }
  }, [pincodes]);

  const handleSave = async () => {
    if (!label || !value) {
      Alert.alert('Error', 'Please fill both Label and Pincode.');
      return;
    }
    setIsAdding(true);
    try {
      if (editingId) {
        await updatePincode({ id: editingId, label, value });
        setEditingId(null);
      } else {
        await addPincode({ label, value });
      }
      setLabel('');
      setValue('');
      Alert.alert('Success', `Pincode ${editingId ? 'updated' : 'added'} successfully.`);
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setIsAdding(false);
    }
  };

  const startEdit = (p: any) => {
    setEditingId(p._id);
    setLabel(p.label);
    setValue(p.value);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setLabel('');
    setValue('');
  };

  const handleDelete = (id: any) => {
    const handle = () => deletePincode({ id }).catch(e => Alert.alert('Error', e.message));
    if (Platform.OS === 'web') {
      if (window.confirm('Delete this pincode?')) handle();
    } else {
      Alert.alert('Delete?', 'Remove this pincode?', [
        { text: 'Cancel' },
        { text: 'Delete', style: 'destructive', onPress: handle }
      ]);
    }
  };

  return (
    <View style={{ marginTop: scale(24), marginBottom: scale(40) }}>
      <View style={styles.sectionHeaderRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <MaterialIcons name="map" size={20} color={COLORS.secondary} />
          <Text style={styles.sectionHeaderTitle}>Pincode Management</Text>
        </View>
        <Text style={{ fontSize: scale(8), color: COLORS.gray, fontWeight: '700' }}>{pincodes?.length || 0} AREAS ACTIVE</Text>
      </View>

      <View style={{ backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 }}>
        {/* TABLE HEADER */}
        <View style={{ flexDirection: 'row', backgroundColor: '#F8FAFC', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
          <View style={{ flex: 2.5, paddingLeft: 16 }}><Text style={{ fontSize: scale(8), fontWeight: '900', color: '#64748B', letterSpacing: 1 }}>AREA NAME / LABEL</Text></View>
          <View style={{ width: 1, backgroundColor: '#E2E8F0' }} />
          <View style={{ flex: 1, alignItems: 'center' }}><Text style={{ fontSize: scale(8), fontWeight: '900', color: '#64748B', letterSpacing: 1 }}>CODE</Text></View>
          <View style={{ width: 1, backgroundColor: '#E2E8F0' }} />
          <View style={{ width: scale(85), alignItems: 'center' }}><Text style={{ fontSize: scale(8), fontWeight: '900', color: '#64748B', letterSpacing: 1 }}>ACTIONS</Text></View>
        </View>

        {/* INPUT ROW */}
        <View style={{ flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
          <View style={{ flex: 2.5, paddingHorizontal: 12 }}>
            <TextInput 
              style={{ height: scale(34), backgroundColor: '#F9FAFB', borderRadius: 8, paddingHorizontal: 12, fontSize: scale(10), color: '#0F172A', borderWidth: 1, borderColor: '#E2E8F0' }} 
              placeholder="Enter Area..." 
              placeholderTextColor="#94A3B8"
              value={label}
              onChangeText={setLabel}
            />
          </View>
          <View style={{ flex: 1, paddingHorizontal: 8 }}>
            <TextInput 
              style={{ height: scale(34), backgroundColor: '#F9FAFB', borderRadius: 8, textAlign: 'center', fontSize: scale(10), color: '#0F172A', fontWeight: '700', borderWidth: 1, borderColor: '#E2E8F0' }} 
              placeholder="Code" 
              placeholderTextColor="#94A3B8"
              value={value}
              onChangeText={setValue}
              keyboardType="numeric"
            />
          </View>
          <View style={{ width: scale(85), alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
            <TouchableOpacity 
              style={{ backgroundColor: editingId ? '#10B981' : COLORS.secondary, width: scale(34), height: scale(34), borderRadius: 8, alignItems: 'center', justifyContent: 'center' }} 
              onPress={handleSave}
              disabled={isAdding}
            >
              <MaterialIcons name={editingId ? "done" : "add"} size={20} color="#fff" />
            </TouchableOpacity>
            {editingId && (
              <TouchableOpacity 
                style={{ backgroundColor: '#EF4444', width: scale(34), height: scale(34), borderRadius: 8, alignItems: 'center', justifyContent: 'center' }} 
                onPress={cancelEdit}
              >
                <MaterialIcons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            )}
            {!editingId && (
              <TouchableOpacity 
                style={{ backgroundColor: '#F1F5F9', width: scale(34), height: scale(34), borderRadius: 8, alignItems: 'center', justifyContent: 'center' }} 
                onPress={() => seedPincodes()}
              >
                <MaterialIcons name="refresh" size={18} color="#64748B" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* DATA ROWS */}
        {pincodes === undefined ? (
          <View style={{ padding: 50, alignItems: 'center' }}>
            <ActivityIndicator color={COLORS.secondary} />
          </View>
        ) : pincodes.length === 0 ? (
          <View style={{ padding: 60, alignItems: 'center' }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <MaterialIcons name="map" size={32} color="#CBD5E1" />
            </View>
            <Text style={{ fontSize: scale(12), color: '#1E293B', fontWeight: '800' }}>No Service Areas</Text>
            <Text style={{ fontSize: scale(9), color: '#64748B', textAlign: 'center', marginTop: 4, marginBottom: 20 }}>Ready to define your delivery zones?</Text>
            <TouchableOpacity 
              onPress={() => seedPincodes()}
              style={{ backgroundColor: COLORS.secondary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 }}
            >
              <Text style={{ color: '#fff', fontSize: scale(10), fontWeight: '800' }}>INITIALIZE DEFAULTS</Text>
            </TouchableOpacity>
          </View>
        ) : (
          pincodes.map((p, idx) => (
            <View key={p._id} style={{ flexDirection: 'row', paddingVertical: 12, borderBottomWidth: idx === pincodes.length - 1 ? 0 : 1, borderBottomColor: '#F1F5F9', backgroundColor: editingId === p._id ? '#F0FDFA' : '#fff', minHeight: scale(50), alignItems: 'center' }}>
              <View style={{ flex: 2.5, paddingLeft: 16, paddingRight: 8 }}>
                <Text style={{ fontSize: scale(11), fontWeight: '700', color: '#1E293B' }} numberOfLines={1}>{p.label}</Text>
              </View>
              <View style={{ width: 1, height: '60%', backgroundColor: '#F1F5F9' }} />
              <View style={{ flex: 1, alignItems: 'center' }}>
                <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                  <Text style={{ fontSize: scale(10.5), fontWeight: '800', color: COLORS.secondary }}>{p.value}</Text>
                </View>
              </View>
              <View style={{ width: 1, height: '60%', backgroundColor: '#F1F5F9' }} />
              <View style={{ width: scale(85), flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
                <TouchableOpacity onPress={() => startEdit(p)} style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' }}>
                  <MaterialIcons name="edit" size={16} color="#64748B" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(p._id)} style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FECACA' }}>
                  <MaterialIcons name="delete-outline" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

function PricingTableRow({ icon, title, current, onUpdate, color }: any) {
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
    <View style={styles.tableRow}>
      <View style={[styles.tableCol, { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 10 }]}>
        <View style={[pricingStyles.iconBox, { backgroundColor: color + '15' }]}><MaterialIcons name={icon} size={16} color={color} /></View>
        <Text style={[styles.tableTextName, { fontSize: scale(10) }]}>{title}</Text>
      </View>
      <View style={[styles.tableCol, { flex: 1, alignItems: 'center' }]}>
        <Text style={[styles.tableTextAmount, { color }]}>₹{current}</Text>
      </View>
      <View style={[styles.tableCol, { flex: 1.5, alignItems: 'center', paddingHorizontal: 10 }]}>
        <TextInput
          style={[pricingStyles.input, { height: scale(28), width: '100%', fontSize: scale(10) }]}
          placeholder="0.00"
          keyboardType="numeric"
          value={val}
          onChangeText={setVal}
        />
      </View>
      <View style={[styles.tableCol, { width: scale(60), alignItems: 'center' }]}>
        <TouchableOpacity
          style={[pricingStyles.btn, { backgroundColor: color, height: scale(28), paddingVertical: 0 }]}
          onPress={handle}
          disabled={loading}
        >
          {loading ? <ActivityIndicator size="small" color="#fff" /> : <MaterialIcons name="done" size={18} color="#fff" />}
        </TouchableOpacity>
      </View>
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

  // Global Components
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAFA' },
  loadingText: { marginTop: 12, fontSize: scale(12), color: COLORS.gray, fontWeight: '600' },
  emptyStateBox: { alignItems: 'center', marginTop: 40, opacity: 0.5 },
  emptyStateText: { fontSize: scale(14), fontWeight: '700', color: COLORS.gray },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionHeaderTitle: { fontSize: scale(14), fontWeight: '900', color: COLORS.text },
  notificationBadge: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.danger, borderWidth: 1.5, borderColor: COLORS.secondary },
  adminMeta: { marginLeft: 8, justifyContent: 'center' },
  onlineDot: { position: 'absolute', bottom: -2, right: -2, width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success, borderWidth: 1.5, borderColor: COLORS.secondary },

  // Stats Grid
  gridStats: { flexDirection: 'row', gap: scale(6), marginBottom: scale(14) },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: scale(8), alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9', elevation: 2 },
  statCardActive: { borderColor: COLORS.secondary, backgroundColor: COLORS.accent },
  statIconBox: { width: scale(22), height: scale(22), borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  statNum: { fontSize: scale(13), fontWeight: '900', color: COLORS.text },
  statLabel: { fontSize: scale(7), fontWeight: '800', color: COLORS.gray, textTransform: 'uppercase' },

  // Table Styles (Order Tab)
  tableContainer: { flex: 1, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#F1F5F9' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#F8FAFC', paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  tableHeaderText: { fontSize: scale(8), fontWeight: '800', color: COLORS.gray, textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', alignItems: 'center' },
  tableCol: { justifyContent: 'center' },
  tableTextId: { fontSize: scale(9), fontWeight: '700', color: COLORS.gray },
  tableTextName: { fontSize: scale(11), fontWeight: '800', color: COLORS.text },
  tableTextSub: { fontSize: scale(8), color: COLORS.gray, marginTop: 2 },
  tableStatusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start' },
  tableStatusText: { fontSize: scale(8), fontWeight: '900', textTransform: 'uppercase' },
  tableTextItems: { fontSize: scale(10), fontWeight: '700', color: COLORS.text },
  tableTextAmount: { fontSize: scale(11), fontWeight: '900', color: COLORS.secondary },
  actionMenuBtn: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' },

  // Dropdown Menu Styles
  dropdownMenu: { backgroundColor: '#fff', borderRadius: 12, padding: 8, width: scale(180), shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 10 },
  menuTitle: { fontSize: scale(8), fontWeight: '800', color: COLORS.gray, paddingHorizontal: 12, paddingVertical: 8, textTransform: 'uppercase', letterSpacing: 1 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, gap: 10, borderRadius: 8 },
  menuItemText: { fontSize: scale(10), fontWeight: '700', color: COLORS.text },
  menuDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 4 },

  // Staff List Styles
  staffListRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: '#fff', borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#F1F5F9' },
  staffListLeft: { flexDirection: 'row', alignItems: 'center' },
  staffListAvatar: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  staffListName: { fontSize: scale(13), fontWeight: '800', color: COLORS.text },
  staffListSub: { fontSize: scale(9), color: COLORS.gray },
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
