import { api } from '@/convex/_generated/api';
import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View
} from 'react-native';

const COLORS = {
  primary: '#2EC4B6', secondary: '#0F9D8A', text: '#1B3A3A',
  gray: '#718096', danger: '#E53E3E', success: '#38A169',
};

function statusColor(status: string) {
  switch (status) {
    case 'PENDING': return { bg: '#FFF7ED', text: '#C2410C' };
    case 'ASSIGNED': return { bg: '#EFF6FF', text: '#1D4ED8' };
    case 'ACTIVE': return { bg: '#FEFCE8', text: '#A16207' };
    case 'DONE': return { bg: '#F0FDF4', text: '#15803D' };
    case 'CANCEL': return { bg: '#FEF2F2', text: '#B91C1C' };
    default: return { bg: '#F8FAFC', text: '#64748B' };
  }
}

export default function OrdersPage() {
  const orders = useQuery(api.orders.getAllOrders);
  const staffMembers = useQuery(api.users.getStaffMembers);
  const updateStatus = useMutation(api.orders.updateOrderStatus);
  const assignStaff = useMutation(api.orders.assignStaff);
  const [filter, setFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [actionsModal, setActionsModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const filteredOrders = orders?.filter(o => filter === 'All' || o.status === filter.toUpperCase()) || [];
  const totalPages = Math.ceil(filteredOrders.length / 20);
  const pageOrders = filteredOrders.slice((page - 1) * 20, page * 20);

  const handleUpdate = async (status: string) => {
    try {
      await updateStatus({ orderId: selectedOrderId, status });
      setActionsModal(false);
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleAssign = async (staff: any) => {
    try {
      await assignStaff({
        orderId: selectedOrderId,
        staffId: staff.clerkId || staff.tokenIdentifier,
        staffName: staff.name,
        staffPhone: staff.phone
      });
      setActionsModal(false);
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const stats = [
    { label: 'All', count: orders?.length || 0 },
    { label: 'Pending', count: orders?.filter(o => o.status === 'PENDING').length || 0 },
    { label: 'Active', count: orders?.filter(o => o.status === 'ASSIGNED' || o.status === 'ACTIVE').length || 0 },
    { label: 'Done', count: orders?.filter(o => o.status === 'DONE').length || 0 },
  ];

  return (
    <View style={{ flex: 1 }}>
      {/* Filters */}
      <View style={styles.filterRow}>
        {stats.map((s) => (
          <TouchableOpacity
            key={s.label}
            style={[styles.filterBtn, filter === s.label && styles.filterBtnActive]}
            onPress={() => { setFilter(s.label); setPage(1); }}
          >
            <Text style={[styles.filterText, filter === s.label && styles.filterTextActive]}>{s.label}</Text>
            <View style={[styles.countBadge, filter === s.label && styles.countBadgeActive]}>
              <Text style={[styles.countText, filter === s.label && styles.countTextActive]}>{s.count}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Table */}
      <View style={styles.tableCard}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={true} 
          style={{ flex: 1 }}
          contentContainerStyle={{ flexDirection: 'column', minWidth: '100%', flexGrow: 1 }}
        >
          <View style={{ minWidth: 750, width: '100%', flex: 1 }}>
            {/* Header */}
            <View style={styles.tableHead}>
              <Text style={[styles.th, { flex: 0.7 }]}>ID</Text>
              <Text style={[styles.th, { flex: 2.2 }]}>CUSTOMER</Text>
              <Text style={[styles.th, { flex: 1.2, textAlign: 'center' }]}>STATUS</Text>
              <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>ITEMS</Text>
              <Text style={[styles.th, { flex: 1.2, textAlign: 'right' }]}>AMOUNT</Text>
              <Text style={[styles.th, { flex: 0.6, textAlign: 'center' }]}>ACT</Text>
            </View>

            <ScrollView 
              showsVerticalScrollIndicator={false} 
              style={{ flex: 1 }}
              contentContainerStyle={{ flexGrow: 1 }}
            >
              {pageOrders.length === 0 ? (
                <View style={{ alignItems: 'center', marginTop: 60, opacity: 0.5 }}>
                  <MaterialIcons name="inbox" size={48} color={COLORS.gray} />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.gray, marginTop: 8 }}>No orders found</Text>
                </View>
              ) : pageOrders.map((order) => {
                const sc = statusColor(order.status.toUpperCase());
                return (
                  <View key={order._id} style={styles.tableRow}>
                    <Text style={[styles.td, { flex: 0.7, fontWeight: '700', color: COLORS.gray, fontSize: 11 }]}>#{order.orderId.slice(-5)}</Text>
                    <View style={{ flex: 2.2 }}>
                      <Text style={styles.tdName} numberOfLines={1}>{order.customerName || 'Customer'}</Text>
                      <Text style={styles.tdSub}>{order.customerPhone}</Text>
                    </View>
                    <View style={{ flex: 1.2, alignItems: 'center' }}>
                      <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                        <Text style={[styles.badgeText, { color: sc.text }]}>{order.status.toUpperCase()}</Text>
                      </View>
                    </View>
                    <Text style={[styles.td, { flex: 1, textAlign: 'center', fontWeight: '700' }]}>{order.quantity}×20L</Text>
                    <Text style={[styles.td, { flex: 1.2, textAlign: 'right', fontWeight: '900', color: COLORS.secondary }]}>₹{order.totalAmount}</Text>
                    <View style={{ flex: 0.6, alignItems: 'center' }}>
                      <TouchableOpacity
                        style={styles.actBtn}
                        onPress={() => { setSelectedOrderId(order._id); setSelectedOrder(order); setActionsModal(true); }}
                      >
                        <MaterialIcons name="more-horiz" size={18} color={COLORS.gray} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </ScrollView>
      </View>

      {/* Pagination */}
      <View style={styles.paginationRow}>
        <Text style={styles.pageInfo}>Page {page} of {totalPages || 1} • {filteredOrders.length} orders</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={[styles.pageBtn, page === 1 && { opacity: 0.5 }]}
            onPress={() => page > 1 && setPage(page - 1)}
            disabled={page === 1}
          >
            <MaterialIcons name="chevron-left" size={20} color={COLORS.gray} />
            <Text style={styles.pageBtnText}>Previous</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pageBtn, { backgroundColor: COLORS.primary, borderColor: COLORS.primary }, page === totalPages && { opacity: 0.5 }]}
            onPress={() => page < totalPages && setPage(page + 1)}
            disabled={page === totalPages}
          >
            <Text style={[styles.pageBtnText, { color: '#fff' }]}>Next</Text>
            <MaterialIcons name="chevron-right" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Actions Modal */}
      <Modal visible={actionsModal} transparent animationType="fade" onRequestClose={() => setActionsModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setActionsModal(false)}>
          <View style={styles.actionSheet}>
            <View style={styles.sheetHdr}>
              <Text style={styles.sheetTitle}>Order Actions</Text>
              <Text style={styles.sheetSub}>#{selectedOrder?.orderId.slice(-8)} • {selectedOrder?.customerName}</Text>
            </View>
            <View style={styles.sheetBody}>
              <Text style={styles.sectionLabel}>Quick Status</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {['PENDING', 'ASSIGNED', 'DONE', 'CANCEL'].map((st) => (
                  <TouchableOpacity key={st} style={[styles.statusChip, { borderColor: statusColor(st).text }]} onPress={() => handleUpdate(st)}>
                    <Text style={[styles.statusChipText, { color: statusColor(st).text }]}>{st}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sectionLabel}>Assign to Staff</Text>
              <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
                {staffMembers?.map((staff) => (
                  <TouchableOpacity key={staff._id} style={styles.staffItem} onPress={() => handleAssign(staff)}>
                    <View style={styles.staffIcon}>
                      <Text style={styles.staffIconText}>{staff.name[0]?.toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.staffName}>{staff.name}</Text>
                      <Text style={styles.staffPhone}>{staff.phone || 'No phone'}</Text>
                    </View>
                    {selectedOrder?.assignedStaffId === (staff.clerkId || staff.tokenIdentifier) && (
                      <MaterialIcons name="check-circle" size={18} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                ))}
                {(!staffMembers || staffMembers.length === 0) && (
                  <Text style={{ fontSize: 12, color: COLORS.gray, textAlign: 'center', padding: 12 }}>No staff members available</Text>
                )}
              </ScrollView>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#F1F5F9', gap: 8 },
  filterBtnActive: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  filterText: { fontSize: 13, fontWeight: '700', color: COLORS.gray },
  filterTextActive: { color: '#fff' },
  countBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  countBadgeActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  countText: { fontSize: 10, fontWeight: '900', color: COLORS.gray },
  countTextActive: { color: '#fff' },

  tableCard: { flex: 1, backgroundColor: 'transparent', overflow: 'hidden' },
  tableHead: { flexDirection: 'row', backgroundColor: 'transparent', paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 2, borderBottomColor: '#E2E8F0', alignItems: 'center' },
  th: { fontSize: 9, fontWeight: '900', color: COLORS.gray, textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', alignItems: 'center', backgroundColor: '#fff' },
  td: { fontSize: 13, color: COLORS.text },
  tdName: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  tdSub: { fontSize: 11, color: COLORS.gray, marginTop: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 9, fontWeight: '900' },
  actBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' },

  paginationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, paddingBottom: 20 },
  pageInfo: { fontSize: 12, color: COLORS.gray, fontWeight: '600' },
  pageBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', gap: 4 },
  pageBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.gray },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  actionSheet: { backgroundColor: '#fff', width: '90%', maxWidth: 320, borderRadius: 20, overflow: 'hidden' },
  sheetHdr: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: '#F8FAFC' },
  sheetTitle: { fontSize: 16, fontWeight: '900', color: COLORS.text },
  sheetSub: { fontSize: 12, color: COLORS.gray, marginTop: 4 },
  sheetBody: { padding: 16 },
  sectionLabel: { fontSize: 10, fontWeight: '900', color: COLORS.secondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  statusChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  statusChipText: { fontSize: 10, fontWeight: '900' },
  staffItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 12 },
  staffIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#E8FFF9', alignItems: 'center', justifyContent: 'center' },
  staffIconText: { fontSize: 12, fontWeight: '900', color: COLORS.secondary },
  staffName: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  staffPhone: { fontSize: 11, color: COLORS.gray },
});
