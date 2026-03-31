import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, SafeAreaView, Platform, StatusBar,
  TouchableOpacity, Alert, Modal, TextInput, ScrollView
} from 'react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

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

const PINCODES = [
  { label: 'Tirunelveli Town - 627006', value: '627006' },
  { label: 'Palayamkottai - 627002', value: '627002' },
  { label: 'Melapalayam - 627005', value: '627005' },
  { label: 'Thachanallur - 627001', value: '627001' },
  { label: 'Express Delivery - 50 Mins - 91176129', value: '91176129' },
];

export default function OrdersScreen() {
  const router = useRouter();
  const { success } = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState('PENDING');
  const [currentPage, setCurrentPage] = useState(1);
  const [bannerVisible, setBannerVisible] = useState(false);
  const ITEMS_PER_PAGE = 3;

  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [editQty, setEditQty] = useState(1);
  const [editPincode, setEditPincode] = useState('');
  const [editPincodeLabel, setEditPincodeLabel] = useState('');
  const [editNoBottle, setEditNoBottle] = useState(false);
  const [showPincodeList, setShowPincodeList] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const orders = useQuery(api.orders.getOrders);
  const cancelOrder = useMutation(api.orders.cancelOrder);
  const updateOrder = useMutation(api.orders.updateOrder);

  useEffect(() => {
    if (success === 'true') setBannerVisible(true);
  }, [success]);

  useEffect(() => {
    if (activeTab !== 'PENDING') setBannerVisible(false);
    else if (success === 'true') setBannerVisible(true);
    setCurrentPage(1);
  }, [activeTab, success]);

  // ── Cancel ──────────────────────────────────────────────────────────────
  const handleCancelOrder = (orderId: any) => {
    const doCancel = async () => {
      try {
        await cancelOrder({ orderId });
        setActiveTab('CANCEL');
      } catch (error) {
        Alert.alert('Error', 'Could not cancel the order. Please try again.');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Cancel this order? This cannot be undone.')) doCancel();
    } else {
      Alert.alert(
        'Cancel Order',
        'Are you sure you want to cancel this order?',
        [
          { text: 'Keep Order', style: 'cancel' },
          { text: 'Yes, Cancel', style: 'destructive', onPress: doCancel },
        ]
      );
    }
  };

  // ── Edit ─────────────────────────────────────────────────────────────────
  const openEditModal = (item: any) => {
    setEditingOrder(item);
    setEditQty(item.quantity);
    setEditNoBottle(item.noBottleReturn ?? false);
    const found = PINCODES.find(p => item.pincode?.includes(p.value));
    setEditPincode(found?.value ?? '');
    setEditPincodeLabel(found?.label ?? item.pincode ?? '');
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editingOrder) return;
    if (editQty < 1) {
      Alert.alert('Invalid', 'Quantity must be at least 1.');
      return;
    }
    if (!editPincode) {
      Alert.alert('Required', 'Please select a pincode.');
      return;
    }
    setIsSaving(true);
    try {
      await updateOrder({
        orderId: editingOrder._id,
        quantity: editQty,
        pincode: editPincodeLabel,
        noBottleReturn: editNoBottle,
      });
      setEditModalVisible(false);
      Alert.alert('✅ Updated', 'Your order has been updated successfully.');
    } catch (error: any) {
      Alert.alert('Error', error.message ?? 'Could not update order.');
    } finally {
      setIsSaving(false);
    }
  };

  // Computed totals for live preview inside edit modal
  const waterPrice = 35;
  const previewBottle = editNoBottle ? editQty * 200 : 0;
  const previewExpress = editPincode === '91176129' ? editQty * 75 : 0;
  const previewTotal = editQty * waterPrice + previewBottle + previewExpress;

  // ── Filtering & pagination ────────────────────────────────────────────────
  const tabs = ['PENDING', 'COMPLETED', 'CANCEL'];
  const filteredOrders = orders?.filter(o => o.status.toUpperCase() === activeTab) || [];
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // ── Order card ──────────────────────────────────────────────────────────
  const renderOrderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => router.push({ pathname: '/order-details', params: { id: item._id } })}
      activeOpacity={0.85}
    >
      {/* Action buttons — only for PENDING */}
      {item.status.toUpperCase() === 'PENDING' && (
        <View style={styles.actionRow}>
          {/* Edit */}
          <TouchableOpacity
            style={styles.editIconBtn}
            onPress={(e) => { e.stopPropagation(); openEditModal(item); }}
          >
            <MaterialIcons name="edit" size={16} color={COLORS.white} />
            <Text style={styles.actionBtnText}>Edit</Text>
          </TouchableOpacity>

          {/* Cancel */}
          <TouchableOpacity
            style={styles.cancelIconBtn}
            onPress={(e) => { e.stopPropagation(); handleCancelOrder(item._id); }}
          >
            <MaterialIcons name="cancel" size={16} color={COLORS.white} />
            <Text style={styles.actionBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.orderRow}>
        <Text style={styles.orderLabel}>Order Id</Text>
        <Text style={styles.colon}>:</Text>
        <Text style={styles.orderValue}>{item.orderId}</Text>
      </View>

      <View style={styles.orderRow}>
        <Text style={styles.orderLabel}>Order Status</Text>
        <Text style={styles.colon}>:</Text>
        <Text style={[styles.orderValue, {
          color: item.status.toUpperCase() === 'PENDING' ? COLORS.primary
               : item.status.toUpperCase() === 'CANCEL' ? COLORS.danger
               : '#22C55E'
        }]}>{item.status}</Text>
      </View>

      <View style={styles.orderRow}>
        <Text style={styles.orderLabel}>Payment mode</Text>
        <Text style={styles.colon}>:</Text>
        <Text style={styles.orderValue}>{item.paymentMode}</Text>
      </View>

      <View style={styles.orderRow}>
        <Text style={styles.orderLabel}>Quantity</Text>
        <Text style={styles.colon}>:</Text>
        <Text style={styles.orderValue}>{item.quantity} can(s)</Text>
      </View>

      <View style={styles.orderRow}>
        <Text style={styles.orderLabel}>Total amount</Text>
        <Text style={styles.colon}>:</Text>
        <Text style={styles.orderValue}>₹{item.totalAmount}</Text>
      </View>

      <View style={styles.orderRow}>
        <Text style={styles.orderLabel}>Date</Text>
        <Text style={styles.colon}>:</Text>
        <Text style={styles.orderValue}>{item.date}</Text>
      </View>

      <View style={[styles.orderRow, { marginBottom: 0 }]}>
        <Text style={styles.orderLabel}>Pincode</Text>
        <Text style={styles.colon}>:</Text>
        <Text style={styles.orderValue} numberOfLines={2}>{item.pincode || '-'}</Text>
      </View>
    </TouchableOpacity>
  );

  // ── UI ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>History</Text>
      </View>

      <View style={styles.container}>
        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tabBtn, isActive ? styles.tabBtnActive : styles.tabBtnInactive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, isActive ? styles.tabTextActive : styles.tabTextInactive]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Non-scrollable order list — 3 per page */}
        <View style={styles.listContent}>
          {paginatedOrders.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="layers-clear" size={80} color={COLORS.accent} />
              <Text style={styles.emptyTitle}>No Orders Found</Text>
              <Text style={styles.emptySub}>
                You haven't placed any {activeTab.toLowerCase()} orders yet.
              </Text>
            </View>
          ) : (
            paginatedOrders.map((item) => (
              <View key={item._id}>{renderOrderItem({ item })}</View>
            ))
          )}
        </View>

        {/* Success banner */}
        {bannerVisible && filteredOrders.length > 0 && activeTab === 'PENDING' && (
          <View style={styles.successBanner}>
            <MaterialIcons name="water-drop" size={16} color={COLORS.primary} style={{ marginRight: 10, opacity: 0.7 }} />
            <Text style={styles.successText}>Your order has been placed successfully.</Text>
          </View>
        )}

        {/* Pagination */}
        {filteredOrders.length > ITEMS_PER_PAGE && (
          <View style={styles.paginationContainer}>
            <View style={{ flex: 1 }}>
              {currentPage > 1 && (
                <TouchableOpacity style={styles.pageBtn} onPress={() => setCurrentPage(p => Math.max(1, p - 1))}>
                  <MaterialIcons name="chevron-left" size={24} color={COLORS.white} />
                  <Text style={styles.pageBtnText}>Back</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={styles.pageIndicator}>{currentPage} / {totalPages}</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              {currentPage < totalPages && (
                <TouchableOpacity style={styles.pageBtn} onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>
                  <Text style={styles.pageBtnText}>Next</Text>
                  <MaterialIcons name="chevron-right" size={24} color={COLORS.white} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>

      {/* ── Edit Order Modal ── */}
      <Modal visible={editModalVisible} animationType="slide" transparent={true} onRequestClose={() => setEditModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Order</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Order ID chip */}
              <View style={styles.orderIdChip}>
                <MaterialIcons name="receipt" size={14} color={COLORS.secondary} />
                <Text style={styles.orderIdChipText}>Order #{editingOrder?.orderId}</Text>
              </View>

              {/* Quantity */}
              <Text style={styles.fieldLabel}>Quantity (20L cans)</Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => setEditQty(q => Math.max(1, q - 1))}
                >
                  <MaterialIcons name="remove" size={22} color={COLORS.secondary} />
                </TouchableOpacity>
                <TextInput
                  style={styles.stepInput}
                  value={editQty.toString()}
                  onChangeText={t => setEditQty(parseInt(t.replace(/[^0-9]/g, '')) || 1)}
                  keyboardType="numeric"
                  textAlign="center"
                />
                <TouchableOpacity style={styles.stepBtn} onPress={() => setEditQty(q => q + 1)}>
                  <MaterialIcons name="add" size={22} color={COLORS.secondary} />
                </TouchableOpacity>
              </View>

              {/* Pincode selector */}
              <Text style={styles.fieldLabel}>Delivery Pincode</Text>
              <TouchableOpacity
                style={styles.pincodeSelector}
                onPress={() => setShowPincodeList(!showPincodeList)}
              >
                <MaterialIcons name="location-on" size={18} color={COLORS.primary} />
                <Text style={[styles.pincodeSelectorText, !editPincodeLabel && { color: COLORS.gray }]} numberOfLines={1}>
                  {editPincodeLabel || 'Select pincode'}
                </Text>
                <MaterialIcons name={showPincodeList ? "keyboard-arrow-up" : "keyboard-arrow-down"} size={22} color={COLORS.secondary} />
              </TouchableOpacity>

              {showPincodeList && (
                <View style={styles.pincodeDropdown}>
                  {PINCODES.map(p => (
                    <TouchableOpacity
                      key={p.value}
                      style={[styles.pincodeOption, editPincode === p.value && styles.pincodeOptionActive]}
                      onPress={() => {
                        setEditPincode(p.value);
                        setEditPincodeLabel(p.label);
                        setShowPincodeList(false);
                      }}
                    >
                      <MaterialIcons name="location-pin" size={16} color={editPincode === p.value ? COLORS.white : COLORS.primary} />
                      <Text style={[styles.pincodeOptionText, editPincode === p.value && { color: COLORS.white }]}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* No bottle return toggle */}
              <TouchableOpacity style={styles.toggleRow} onPress={() => setEditNoBottle(v => !v)}>
                <View style={[styles.checkbox, editNoBottle && styles.checkboxActive]}>
                  {editNoBottle && <MaterialIcons name="check" size={14} color={COLORS.white} />}
                </View>
                <Text style={styles.toggleLabel}>I don't have a bottle to return (+₹200/can)</Text>
              </TouchableOpacity>

              {/* Live price preview */}
              <View style={styles.pricePreview}>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Water ({editQty} × ₹35)</Text>
                  <Text style={styles.priceValue}>₹{editQty * waterPrice}</Text>
                </View>
                {editNoBottle && (
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Bottle ({editQty} × ₹200)</Text>
                    <Text style={styles.priceValue}>₹{previewBottle}</Text>
                  </View>
                )}
                {previewExpress > 0 && (
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Express ({editQty} × ₹75)</Text>
                    <Text style={styles.priceValue}>₹{previewExpress}</Text>
                  </View>
                )}
                <View style={styles.priceTotalRow}>
                  <Text style={styles.priceTotalLabel}>New Total</Text>
                  <Text style={styles.priceTotalValue}>₹{previewTotal}</Text>
                </View>
              </View>

              {/* Save button */}
              <TouchableOpacity
                style={[styles.saveBtn, isSaving && { opacity: 0.6 }]}
                onPress={handleSaveEdit}
                disabled={isSaving}
              >
                <MaterialIcons name="save" size={20} color={COLORS.white} style={{ marginRight: 8 }} />
                <Text style={styles.saveBtnText}>{isSaving ? 'SAVING...' : 'SAVE CHANGES'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.accent },
  header: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 20,
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#ffffff', letterSpacing: 1 },
  container: { flex: 1 },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 10,
  },
  tabBtn: { flex: 1, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tabBtnActive: { backgroundColor: COLORS.primary, elevation: 3 },
  tabBtnInactive: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: COLORS.border },
  tabText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  tabTextActive: { color: '#ffffff' },
  tabTextInactive: { color: COLORS.text },
  listContent: { padding: 16, paddingTop: 0 },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    elevation: 3,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginBottom: 10,
  },
  editIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  cancelIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.danger,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  actionBtnText: { color: COLORS.white, fontSize: 12, fontWeight: '800' },
  orderRow: { flexDirection: 'row', marginBottom: 5, alignItems: 'center' },
  orderLabel: { flex: 1.5, fontSize: 12, color: COLORS.secondary, fontWeight: '700' },
  colon: { width: 15, fontSize: 12, color: COLORS.secondary, textAlign: 'center', fontWeight: '700' },
  orderValue: { flex: 2, fontSize: 13, color: COLORS.text, fontWeight: '900', paddingLeft: 4 },
  successBanner: {
    backgroundColor: '#F0FDF9',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(46,196,182,0.2)',
  },
  successText: { flex: 1, fontSize: 14, color: COLORS.secondary, fontWeight: '600' },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: COLORS.secondary, marginBottom: 8, marginTop: 16 },
  emptySub: { fontSize: 14, color: COLORS.gray, textAlign: 'center', lineHeight: 20 },
  paginationContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  pageBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.secondary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, gap: 4 },
  pageBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  pageIndicator: { fontSize: 14, fontWeight: '700', color: COLORS.text },

  // ── Edit Modal ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(27,58,58,0.6)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '90%',
    elevation: 20,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: COLORS.secondary },
  orderIdChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginBottom: 20,
    gap: 6,
  },
  orderIdChipText: { fontSize: 12, fontWeight: '800', color: COLORS.secondary },
  fieldLabel: { fontSize: 13, fontWeight: '800', color: COLORS.text, marginBottom: 8, marginTop: 4 },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    padding: 4,
  },
  stepBtn: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  stepInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.secondary,
    textAlign: 'center',
  },
  pincodeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    gap: 8,
  },
  pincodeSelectorText: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.text },
  pincodeDropdown: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 4,
  },
  pincodeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.accent,
  },
  pincodeOptionActive: { backgroundColor: COLORS.primary },
  pincodeOptionText: { fontSize: 13, fontWeight: '700', color: COLORS.text, flex: 1 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: COLORS.primary },
  toggleLabel: { flex: 1, fontSize: 13, color: COLORS.text, fontWeight: '500' },
  pricePreview: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  priceLabel: { fontSize: 13, color: COLORS.text, opacity: 0.7 },
  priceValue: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  priceTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(46,196,182,0.3)',
  },
  priceTotalLabel: { fontSize: 15, fontWeight: '800', color: COLORS.secondary },
  priceTotalValue: { fontSize: 18, fontWeight: '900', color: COLORS.primary },
  saveBtn: {
    backgroundColor: COLORS.primary,
    height: 50,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    marginBottom: 10,
  },
  saveBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '900', letterSpacing: 1 },
});
