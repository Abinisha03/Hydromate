import React, { useState } from 'react';
import {
  StyleSheet, View, Text, ScrollView, SafeAreaView, StatusBar,
  TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput,
  Linking, Share, Platform,
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

// ─── Assign Staff Modal ───────────────────────────────────────────────────────
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
        <View style={modalStyles.sheet}>
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
            <ScrollView>
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

// ─── Add Staff Invite Modal ───────────────────────────────────────────────────
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

  const inviteMessage = `🚰 *HydroMate Staff Invite*\n\nHi ${name}!\n\nYou've been invited to join HydroMate as a Delivery Staff member.\n\n📱 Download the app and sign up using your email: *${email}*\n\n🔑 Your invite code: *${code}*\n\nRight after you sign in, the app will ask for this code and your phone number. Enter them to activate your staff dashboard instantly!\n\n— HydroMate Team`;

  const handleGenerate = async () => {
    if (!name.trim() || !email.trim() || phone.trim().length < 10) {
      Alert.alert('Required', 'Please enter name, email, and a valid phone number.');
      return;
    }
    const newCode = `HM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    setIsLoading(true);
    try {
      await createInvite({ name: name.trim(), email: email.trim(), inviteCode: newCode, phone: phone.trim() });
      setCode(newCode);
      setGenerated(true);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await Share.share({ message: inviteMessage });
    } catch (e) {
      Alert.alert('Error', 'Could not share invite.');
    }
  };

  const handleEmail = async () => {
    const subject = encodeURIComponent('HydroMate Staff Invitation');
    const body = encodeURIComponent(inviteMessage);
    
    if (Platform.OS === 'web') {
      const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${subject}&body=${body}`;
      window.open(url, '_blank');
      return;
    }

    const gmailMobileUrl = `googlegmail:///co?to=${email}&subject=${subject}&body=${body}`;
    const gmailWebUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${subject}&body=${body}`;

    try {
      const canOpen = await Linking.canOpenURL(gmailMobileUrl);
      if (canOpen) {
        await Linking.openURL(gmailMobileUrl);
      } else {
        await Linking.openURL(gmailWebUrl);
      }
    } catch (e) {
      Alert.alert('Email error', 'Could not open email app.');
    }
  };

  const handleClose = () => {
    setName(''); setEmail(''); setCode(''); setGenerated(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.sheet, { maxHeight: '85%' }]}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>Add New Staff</Text>
            <TouchableOpacity onPress={handleClose}>
              <MaterialIcons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={modalStyles.label}>Staff Name</Text>
            <TextInput
              style={modalStyles.input}
              placeholder="Enter full name"
              placeholderTextColor={COLORS.gray}
              value={name}
              onChangeText={setName}
            />

            <Text style={modalStyles.label}>Email Address</Text>
            <TextInput
              style={modalStyles.input}
              placeholder="Enter email address"
              placeholderTextColor={COLORS.gray}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={modalStyles.label}>Phone Number</Text>
            <TextInput
              style={modalStyles.input}
              placeholder="Enter phone number"
              placeholderTextColor={COLORS.gray}
              keyboardType="phone-pad"
              maxLength={10}
              value={phone}
              onChangeText={setPhone}
            />

            {!generated ? (
              <TouchableOpacity
                style={modalStyles.generateBtn}
                onPress={handleGenerate}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="link" size={18} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={modalStyles.generateBtnText}>GENERATE INVITE</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <View style={modalStyles.inviteBox}>
                <View style={modalStyles.codeRow}>
                  <MaterialIcons name="confirmation-number" size={18} color={COLORS.secondary} />
                  <Text style={modalStyles.codeText}>{code}</Text>
                </View>
                <Text style={modalStyles.invitePreview} numberOfLines={6}>{inviteMessage}</Text>

                <View style={modalStyles.shareRow}>
                  <TouchableOpacity style={modalStyles.shareBtn} onPress={handleCopy}>
                    <MaterialIcons name="share" size={18} color={COLORS.secondary} />
                    <Text style={modalStyles.shareBtnText}>Share</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[modalStyles.shareBtn, { backgroundColor: '#3B82F6' }]}
                    onPress={handleEmail}
                  >
                    <MaterialIcons name="email" size={16} color="#fff" />
                    <Text style={[modalStyles.shareBtnText, { color: '#fff' }]}>Send Email</Text>
                  </TouchableOpacity>
                </View>

                <View style={modalStyles.noteBox}>
                  <MaterialIcons name="info-outline" size={14} color={COLORS.info} />
                  <Text style={modalStyles.noteText}>
                    The staff member will be automatically activated when they sign up and enter this code.
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Order Card ───────────────────────────────────────────────────────────────
function OrderCard({ order }: { order: any }) {
  const [assignModal, setAssignModal] = useState(false);
  const approveOrder = useMutation(api.orders.approveOrder);
  const rejectOrder = useMutation(api.orders.rejectOrder);
  const [loading, setLoading] = useState<string | null>(null);

  const statusC = statusColor(order.status);

  const doApprove = async () => {
    setLoading('approve');
    try {
      await approveOrder({ orderId: order._id });
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setLoading(null);
    }
  };

  const doReject = async () => {
    setLoading('reject');
    try {
      await rejectOrder({ orderId: order._id });
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setLoading(null);
    }
  };

  const isPending = order.status === 'Pending';
  const isActionable = ['Pending', 'Assigned', 'Approved'].includes(order.status);

  return (
    <View style={styles.orderCard}>
      {/* Card Header */}
      <View style={styles.orderCardHeader}>
        <View style={styles.orderIdBadge}>
          <MaterialIcons name="receipt" size={13} color={COLORS.secondary} />
          <Text style={styles.orderIdText}>#{order.orderId}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusC.bg }]}>
          <Text style={[styles.statusText, { color: statusC.text }]}>{order.status}</Text>
        </View>
      </View>

      {/* Customer Details */}
      <View style={styles.detailsGrid}>
        <View style={styles.detailItem}>
          <MaterialIcons name="person" size={14} color={COLORS.primary} />
          <Text style={styles.detailLabel}>Customer</Text>
          <Text style={styles.detailValue} numberOfLines={1}>
            {order.customerName || 'N/A'}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <MaterialIcons name="phone" size={14} color={COLORS.primary} />
          <Text style={styles.detailLabel}>Phone</Text>
          <Text style={styles.detailValue}>{order.customerPhone || 'N/A'}</Text>
        </View>
        <View style={styles.detailItem}>
          <FontAwesome5 name="water" size={12} color={COLORS.primary} />
          <Text style={styles.detailLabel}>Cans</Text>
          <Text style={styles.detailValue}>{order.quantity} × 20L</Text>
        </View>
        <View style={styles.detailItem}>
          <MaterialIcons name="payments" size={14} color={COLORS.primary} />
          <Text style={styles.detailLabel}>Amount</Text>
          <Text style={styles.detailValue}>₹{order.totalAmount}</Text>
        </View>
      </View>

      {/* Address */}
      <View style={styles.addressRow}>
        <MaterialIcons name="location-on" size={14} color={COLORS.gray} />
        <Text style={styles.addressText} numberOfLines={2}>
          {[order.buildingName, order.streetName, order.area, order.location]
            .filter(Boolean).join(', ') || order.pincode}
        </Text>
      </View>

      {/* Assigned Staff */}
      {order.assignedStaffName && (
        <View style={styles.staffRow}>
          <MaterialIcons name="person-pin-circle" size={14} color={COLORS.secondary} />
          <Text style={styles.staffLabel}>Assigned: </Text>
          <Text style={styles.staffValue}>{order.assignedStaffName}</Text>
        </View>
      )}

      {order.deliveredAt && (
        <View style={styles.staffRow}>
          <MaterialIcons name="check-circle" size={14} color={COLORS.success} />
          <Text style={[styles.staffLabel, { color: COLORS.success }]}>Delivered: </Text>
          <Text style={[styles.staffValue, { color: COLORS.success }]}>{order.deliveredAt}</Text>
        </View>
      )}

      {/* Action Buttons */}
      {isActionable && (
        <View style={styles.actionRow}>
          {(isPending || order.status === 'Approved') && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: COLORS.info }]}
              onPress={() => setAssignModal(true)}
            >
              <MaterialIcons name="person-add" size={14} color="#fff" />
              <Text style={styles.actionBtnText}>Assign</Text>
            </TouchableOpacity>
          )}
          {isPending && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: COLORS.success }]}
              onPress={doApprove}
              disabled={!!loading}
            >
              {loading === 'approve' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="check" size={14} color="#fff" />
                  <Text style={styles.actionBtnText}>Approve</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: COLORS.danger }]}
            onPress={doReject}
            disabled={!!loading}
          >
            {loading === 'reject' ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons name="close" size={14} color="#fff" />
                <Text style={styles.actionBtnText}>Reject</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      <AssignStaffModal
        visible={assignModal}
        orderId={order._id}
        onClose={() => setAssignModal(false)}
      />
    </View>
  );
}

// ─── Orders Tab ───────────────────────────────────────────────────────────────
function OrdersTab() {
  const orders = useQuery(api.orders.getAllOrders);
  const [filter, setFilter] = useState<'All' | 'Pending' | 'Active' | 'Delivered'>('All');

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
      {/* Summary Chips */}
      <View style={styles.summaryRow}>
        <TouchableOpacity 
          style={[styles.summaryChip, { backgroundColor: filter === 'All' ? '#D1F2EB' : COLORS.accent, borderWidth: filter === 'All' ? 2 : 0, borderColor: '#1ABC9C' }]}
          onPress={() => setFilter('All')}
        >
          <Text style={styles.summaryNum}>{total}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.summaryChip, { backgroundColor: filter === 'Pending' ? '#FAD7A1' : '#FFF5E6', borderWidth: filter === 'Pending' ? 2 : 0, borderColor: '#F39C12' }]}
          onPress={() => setFilter('Pending')}
        >
          <Text style={[styles.summaryNum, { color: '#C05621' }]}>{pending}</Text>
          <Text style={[styles.summaryLabel, { color: '#C05621' }]}>Pending</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.summaryChip, { backgroundColor: filter === 'Active' ? '#AED6F1' : '#EBF8FF', borderWidth: filter === 'Active' ? 2 : 0, borderColor: '#3498DB' }]}
          onPress={() => setFilter('Active')}
        >
          <Text style={[styles.summaryNum, { color: '#2B6CB0' }]}>{active}</Text>
          <Text style={[styles.summaryLabel, { color: '#2B6CB0' }]}>Active</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.summaryChip, { backgroundColor: filter === 'Delivered' ? '#A9DFBF' : '#C6F6D5', borderWidth: filter === 'Delivered' ? 2 : 0, borderColor: '#27AE60' }]}
          onPress={() => setFilter('Delivered')}
        >
          <Text style={[styles.summaryNum, { color: '#22543D' }]}>{delivered}</Text>
          <Text style={[styles.summaryLabel, { color: '#22543D' }]}>Delivered</Text>
        </TouchableOpacity>
      </View>

      {/* Order List */}
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyStateBox}>
            <FontAwesome5 name="water" size={40} color={COLORS.border} />
            <Text style={styles.emptyStateText}>No orders match this status.</Text>
          </View>
        ) : (
          filteredOrders.map((order) => <OrderCard key={order._id} order={order} />)
        )}
      </ScrollView>
    </View>
  );
}

// ─── Staff Details Modal ──────────────────────────────────────────────────────
function StaffDetailsModal({
  visible,
  staff,
  onClose,
}: {
  visible: boolean;
  staff: any;
  onClose: () => void;
}) {
  const staffIdentifier = staff?.tokenIdentifier ?? staff?.clerkId ?? "";
  const stats = useQuery(api.orders.getStaffStats, staffIdentifier ? { staffIdentifier } : "skip");

  if (!staff) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>Staff Details</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View style={[modalStyles.staffAvatar, { width: 64, height: 64, borderRadius: 32 }]}>
                <MaterialIcons name="person" size={40} color="#fff" />
              </View>
              <Text style={[modalStyles.staffName, { fontSize: 20, marginTop: 10 }]}>{staff.name}</Text>
              <Text style={modalStyles.staffPhone}>{staff.email || staff.phone || 'No contact info'}</Text>
              <View style={[styles.staffRoleBadge, { marginTop: 10 }]}>
                <Text style={styles.staffRoleText}>DELIVERY STAFF</Text>
              </View>
            </View>

            <Text style={modalStyles.label}>Order Statistics</Text>
            {stats === undefined ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
            ) : (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                <View style={{ flex: 1, backgroundColor: '#EBF8FF', padding: 15, borderRadius: 12, alignItems: 'center', marginHorizontal: 5 }}>
                  <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#2B6CB0' }}>{stats.total}</Text>
                  <Text style={{ fontSize: 12, color: '#2B6CB0', marginTop: 5 }}>Total Assigned</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#FAD7A1', padding: 15, borderRadius: 12, alignItems: 'center', marginHorizontal: 5 }}>
                  <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#C05621' }}>{stats.active}</Text>
                  <Text style={{ fontSize: 12, color: '#C05621', marginTop: 5 }}>Active</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#C6F6D5', padding: 15, borderRadius: 12, alignItems: 'center', marginHorizontal: 5 }}>
                  <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#22543D' }}>{stats.delivered}</Text>
                  <Text style={{ fontSize: 12, color: '#22543D', marginTop: 5 }}>Delivered</Text>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Staff Tab ────────────────────────────────────────────────────────────────
function StaffTab() {
  const staffList = useQuery(api.users.getStaffMembers);
  const removeStaff = useMutation(api.users.removeStaff);
  const [addModal, setAddModal] = useState(false);
  const [detailsModal, setDetailsModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);

  const confirmRemove = (staffId: string, staffName: string) => {
    if (Platform.OS === 'web') {
      const ok = window.confirm(`Are you sure you want to remove ${staffName} from the delivery staff?`);
      if (ok) {
        removeStaff({ staffId: staffId as any }).catch(e => Alert.alert("Error", e.message));
      }
    } else {
      Alert.alert(
        "Remove Staff",
        `Are you sure you want to remove ${staffName} from the delivery staff?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
              try {
                await removeStaff({ staffId: staffId as any });
              } catch (e: any) {
                Alert.alert("Error", e.message);
              }
            }
          }
        ]
      );
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <TouchableOpacity style={styles.addStaffBtn} onPress={() => setAddModal(true)}>
        <MaterialIcons name="person-add" size={18} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.addStaffBtnText}>ADD STAFF MEMBER</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        {staffList === undefined ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 30 }} />
        ) : staffList.length === 0 ? (
          <View style={styles.emptyStateBox}>
            <MaterialIcons name="people-outline" size={48} color={COLORS.border} />
            <Text style={styles.emptyStateText}>No staff members yet.</Text>
            <Text style={[styles.emptyStateText, { fontSize: scale(12), marginTop: 4 }]}>
              Tap "Add Staff Member" to invite someone.
            </Text>
          </View>
        ) : (
          staffList.map((staff) => (
            <View key={staff._id} style={styles.staffCard}>
              <View style={styles.staffCardAvatar}>
                <MaterialIcons name="person" size={24} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.staffCardName}>{staff.name}</Text>
                {(staff.email || staff.phone) && (
                  <View style={styles.staffPhoneRow}>
                    <MaterialIcons name={staff.email ? "email" : "phone"} size={12} color={COLORS.primary} />
                    <Text style={styles.staffPhoneText}>{staff.email || staff.phone}</Text>
                  </View>
                )}
              </View>
              <View style={styles.staffRoleBadge}>
                <Text style={styles.staffRoleText}>STAFF</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity
                  style={{ marginLeft: 10, padding: 5 }}
                  onPress={() => {
                    setSelectedStaff(staff);
                    setDetailsModal(true);
                  }}
                >
                  <MaterialIcons name="visibility" size={22} color={COLORS.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ marginLeft: 5, padding: 5 }}
                  onPress={() => confirmRemove(staff._id as any, staff.name)}
                >
                  <MaterialIcons name="delete-outline" size={22} color="#E53E3E" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <AddStaffModal visible={addModal} onClose={() => setAddModal(false)} />
      <StaffDetailsModal
        visible={detailsModal}
        staff={selectedStaff}
        onClose={() => setDetailsModal(false)}
      />
    </View>
  );
}

// ─── Pricing Tab ─────────────────────────────────────────────────────────────
function PricingTab() {
  const pricing = useQuery(api.pricing.getPricing);
  const updatePricing = useMutation(api.pricing.updatePricing);

  const [water, setWater] = useState('');
  const [bottle, setBottle] = useState('');
  const [express, setExpress] = useState('');
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  React.useEffect(() => {
    if (pricing && !initialized) {
      setWater(String(pricing.waterPrice));
      setBottle(String(pricing.bottlePrice));
      setExpress(String(pricing.expressCharge));
      setInitialized(true);
    }
  }, [pricing]);

  const handleSave = async () => {
    const w = parseFloat(water);
    const b = parseFloat(bottle);
    const e = parseFloat(express);
    if (isNaN(w) || isNaN(b) || isNaN(e)) {
      Alert.alert('Invalid', 'Please enter valid numbers for all fields.');
      return;
    }
    setSaving(true);
    try {
      await updatePricing({ waterPrice: w, bottlePrice: b, expressCharge: e });
      Alert.alert('Saved', 'Pricing updated successfully.');
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (!pricing) {
    return <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />;
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.pricingCard}>
        <View style={styles.pricingHeader}>
          <MaterialIcons name="price-change" size={22} color={COLORS.primary} />
          <Text style={styles.pricingHeaderTitle}>Pricing Configuration</Text>
        </View>
        <Text style={styles.pricingSubtitle}>
          Changes apply to all new orders placed by customers.
        </Text>

        {[
          { icon: 'water', label: 'Water Price (per 20L can)', value: water, set: setWater, hint: '₹ per can' },
          { icon: 'replay', label: 'Bottle Deposit (no-return)', value: bottle, set: setBottle, hint: '₹ per bottle' },
          { icon: 'flash-on', label: 'Express Delivery Charge', value: express, set: setExpress, hint: '₹ per can (express zones)' },
        ].map((item) => (
          <View key={item.label} style={styles.pricingRow}>
            <View style={styles.pricingIconBox}>
              <MaterialIcons name={item.icon as any} size={18} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pricingLabel}>{item.label}</Text>
              <Text style={styles.pricingHint}>{item.hint}</Text>
            </View>
            <TextInput
              style={styles.pricingInput}
              keyboardType="numeric"
              value={item.value}
              onChangeText={item.set}
            />
          </View>
        ))}

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialIcons name="save" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.saveBtnText}>SAVE PRICING</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Current Rates Summary */}
      <View style={styles.pricingCard}>
        <Text style={styles.pricingHeaderTitle}>Current Rates</Text>
        {[
          { label: 'Water (20L can)', value: `₹${pricing.waterPrice}` },
          { label: 'Bottle Deposit', value: `₹${pricing.bottlePrice}` },
          { label: 'Express Charge', value: `₹${pricing.expressCharge} / can` },
        ].map((item) => (
          <View key={item.label} style={styles.currentRateRow}>
            <Text style={styles.currentRateLabel}>{item.label}</Text>
            <Text style={styles.currentRateValue}>{item.value}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ─── Main Admin Dashboard ─────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<Tab>('orders');

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'orders', label: 'Orders', icon: 'list-alt' },
    { key: 'staff', label: 'Staff', icon: 'people' },
    { key: 'pricing', label: 'Pricing', icon: 'price-change' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.adminAvatar}>
            <MaterialIcons name="admin-panel-settings" size={20} color="#fff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Admin Panel</Text>
            <Text style={styles.headerSub}>{user?.fullName || 'Administrator'}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={() => signOut()}
        >
          <MaterialIcons name="logout" size={18} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <MaterialIcons
              name={tab.icon as any}
              size={18}
              color={activeTab === tab.key ? COLORS.secondary : COLORS.gray}
            />
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {activeTab === 'orders' && <OrdersTab />}
        {activeTab === 'staff' && <StaffTab />}
        {activeTab === 'pricing' && <PricingTab />}
      </View>
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
  adminAvatar: {
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

  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    elevation: 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(10),
    gap: scale(5),
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: COLORS.secondary,
  },
  tabLabel: { fontSize: scale(12), fontWeight: '700', color: COLORS.gray },
  tabLabelActive: { color: COLORS.secondary },

  // Tab Content
  tabContent: { flex: 1, paddingHorizontal: scale(12), paddingTop: scale(10) },

  // Summary Chips
  summaryRow: {
    flexDirection: 'row',
    gap: scale(6),
    marginBottom: scale(12),
  },
  summaryChip: {
    flex: 1,
    borderRadius: scale(12),
    padding: scale(8),
    alignItems: 'center',
    elevation: 1,
  },
  summaryNum: { fontSize: scale(18), fontWeight: '900', color: COLORS.secondary },
  summaryLabel: { fontSize: scale(9), fontWeight: '700', color: COLORS.secondary, marginTop: 2 },

  // Order Card
  orderCard: {
    backgroundColor: COLORS.white,
    borderRadius: scale(16),
    padding: scale(12),
    marginBottom: scale(10),
    elevation: 3,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  orderCardHeader: {
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
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
    borderRadius: scale(8),
  },
  statusText: { fontSize: scale(9), fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(6),
    marginBottom: scale(10),
  },
  detailItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.accent,
    borderRadius: scale(10),
    padding: scale(8),
    gap: scale(2),
  },
  detailLabel: { fontSize: scale(10), color: COLORS.gray, fontWeight: '600' },
  detailValue: { fontSize: scale(12), fontWeight: '800', color: COLORS.text },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scale(4),
    marginBottom: scale(6),
  },
  addressText: { fontSize: scale(11), color: COLORS.gray, flex: 1, fontWeight: '500' },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    marginBottom: scale(4),
  },
  staffLabel: { fontSize: scale(11), color: COLORS.secondary, fontWeight: '700' },
  staffValue: { fontSize: scale(11), color: COLORS.text, fontWeight: '600' },
  actionRow: {
    flexDirection: 'row',
    gap: scale(6),
    marginTop: scale(10),
    paddingTop: scale(10),
    borderTopWidth: 1,
    borderTopColor: COLORS.accent,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(8),
    borderRadius: scale(10),
    gap: scale(4),
  },
  actionBtnText: { fontSize: scale(11), fontWeight: '900', color: '#fff' },

  // Staff Tab
  addStaffBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary,
    height: scale(44),
    borderRadius: scale(22),
    marginBottom: scale(12),
    elevation: 3,
  },
  addStaffBtnText: { fontSize: scale(13), fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  staffCard: {
    backgroundColor: COLORS.white,
    borderRadius: scale(14),
    padding: scale(12),
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    marginBottom: scale(8),
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  staffCardAvatar: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffCardName: { fontSize: scale(14), fontWeight: '800', color: COLORS.text },
  staffPhoneRow: { flexDirection: 'row', alignItems: 'center', gap: scale(4), marginTop: scale(2) },
  staffPhoneText: { fontSize: scale(12), color: COLORS.primary, fontWeight: '600' },
  staffRoleBadge: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(8),
  },
  staffRoleText: { fontSize: scale(9), fontWeight: '900', color: COLORS.secondary },

  // Pricing Tab
  pricingCard: {
    backgroundColor: COLORS.white,
    borderRadius: scale(16),
    padding: scale(14),
    marginBottom: scale(12),
    elevation: 3,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
  },
  pricingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: scale(4),
  },
  pricingHeaderTitle: { fontSize: scale(15), fontWeight: '900', color: COLORS.secondary },
  pricingSubtitle: { fontSize: scale(11), color: COLORS.gray, marginBottom: scale(14) },
  pricingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    paddingVertical: scale(10),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.accent,
  },
  pricingIconBox: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(10),
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pricingLabel: { fontSize: scale(12), fontWeight: '700', color: COLORS.text },
  pricingHint: { fontSize: scale(10), color: COLORS.gray },
  pricingInput: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: scale(10),
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    fontSize: scale(14),
    fontWeight: '900',
    color: COLORS.secondary,
    minWidth: scale(70),
    textAlign: 'center',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary,
    height: scale(44),
    borderRadius: scale(22),
    marginTop: scale(16),
    elevation: 4,
  },
  saveBtnText: { fontSize: scale(13), fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  currentRateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: scale(8),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.accent,
  },
  currentRateLabel: { fontSize: scale(12), fontWeight: '600', color: COLORS.text },
  currentRateValue: { fontSize: scale(13), fontWeight: '900', color: COLORS.primary },

  // Misc
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, color: COLORS.secondary, fontWeight: '700' },
  emptyStateBox: { alignItems: 'center', marginTop: scale(40) },
  emptyStateText: { fontSize: scale(14), color: COLORS.gray, fontWeight: '600', marginTop: scale(10) },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    padding: scale(16),
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(16),
    paddingBottom: scale(10),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { fontSize: scale(16), fontWeight: '900', color: COLORS.secondary },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.accent,
    gap: scale(10),
  },
  staffAvatar: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(12),
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffName: { fontSize: scale(14), fontWeight: '800', color: COLORS.text },
  staffPhone: { fontSize: scale(12), color: COLORS.gray },
  emptyBox: { alignItems: 'center', paddingVertical: scale(30) },
  emptyText: { fontSize: scale(13), color: COLORS.gray, marginTop: scale(8), fontWeight: '600' },
  // Add Staff Modal
  label: {
    fontSize: scale(12),
    fontWeight: '700',
    color: COLORS.secondary,
    marginBottom: scale(4),
    marginTop: scale(10),
  },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: scale(12),
    paddingHorizontal: scale(12),
    paddingVertical: scale(10),
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.text,
    backgroundColor: COLORS.accent,
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary,
    height: scale(44),
    borderRadius: scale(22),
    marginTop: scale(16),
    elevation: 3,
  },
  generateBtnText: { fontSize: scale(13), fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  inviteBox: {
    marginTop: scale(16),
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: scale(14),
    borderStyle: 'dashed',
    padding: scale(12),
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: scale(10),
  },
  codeText: {
    fontSize: scale(18),
    fontWeight: '900',
    color: COLORS.secondary,
    letterSpacing: 3,
  },
  invitePreview: {
    fontSize: scale(11),
    color: COLORS.gray,
    lineHeight: scale(18),
    backgroundColor: '#F8FAFC',
    borderRadius: scale(8),
    padding: scale(10),
    marginBottom: scale(12),
  },
  shareRow: {
    flexDirection: 'row',
    gap: scale(8),
    marginBottom: scale(10),
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(10),
    backgroundColor: COLORS.accent,
    borderRadius: scale(12),
    gap: scale(6),
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  shareBtnText: {
    fontSize: scale(13),
    fontWeight: '800',
    color: COLORS.secondary,
  },
  noteBox: {
    flexDirection: 'row',
    gap: scale(6),
    backgroundColor: '#EBF8FF',
    borderRadius: scale(10),
    padding: scale(10),
  },
  noteText: {
    flex: 1,
    fontSize: scale(10),
    color: '#2B6CB0',
    fontWeight: '600',
    lineHeight: scale(16),
  },
});
