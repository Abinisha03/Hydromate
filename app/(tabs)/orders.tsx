import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, SafeAreaView, Platform, StatusBar, TouchableOpacity, FlatList, Alert } from 'react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useRouter } from 'expo-router';
import { MaterialIcons, FontAwesome5, FontAwesome } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';

const COLORS = {
  primary: '#2EC4B6',
  secondary: '#0F9D8A',
  accent: '#E8FFF9',
  text: '#1B3A3A',
  white: '#FFFFFF',
  gray: '#718096',
  border: '#E2E8F0',
};

export default function OrdersScreen() {
  const router = useRouter();
  const { success } = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState('PENDING');
  const [currentPage, setCurrentPage] = useState(1);
  const [bannerVisible, setBannerVisible] = useState(false);
  const ITEMS_PER_PAGE = 5;
  const orders = useQuery(api.orders.getOrders);
  const cancelOrder = useMutation(api.orders.cancelOrder);

  useEffect(() => {
    if (success === 'true') {
      setBannerVisible(true);
    }
  }, [success]);

  useEffect(() => {
    // Hide banner on tab switch unless it's PENDING and success is true
    if (activeTab !== 'PENDING') {
      setBannerVisible(false);
    } else if (success === 'true') {
      setBannerVisible(true);
    }
    // Always reset to first page when switching tabs
    setCurrentPage(1);
  }, [activeTab, success]);

  const handleCancelOrder = async (orderId: any) => {
    try {
      console.log("Cancelling order:", orderId);
      await cancelOrder({ orderId });
      setActiveTab('CANCEL'); // Switch to CANCEL section immediately
    } catch (error) {
      console.error("Cancel failed:", error);
      Alert.alert("Error", "Could not cancel the order. Please try again.");
    }
  };

  const tabs = ['PENDING', 'COMPLETED', 'CANCEL'];

  const filteredOrders = orders?.filter(order => 
    order.status.toUpperCase() === activeTab
  ) || [];

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const renderOrderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.orderCard}
      onPress={() => router.push({
        pathname: '/order-details',
        params: { id: item._id }
      })}
    >
      {item.status.toUpperCase() === 'PENDING' && (
        <TouchableOpacity 
          style={styles.cancelIconBtn} 
          onPress={(e) => {
            e.stopPropagation();
            handleCancelOrder(item._id);
          }}
        >
          <MaterialIcons name="cancel" size={24} color="#E53E3E" />
        </TouchableOpacity>
      )}

      <View style={styles.orderRow}>
        <Text style={styles.orderLabel}>Order Id</Text>
        <Text style={styles.colon}>:</Text>
        <Text style={styles.orderValue}>{item.orderId}</Text>
      </View>

      <View style={styles.orderRow}>
        <Text style={styles.orderLabel}>Order Status</Text>
        <Text style={styles.colon}>:</Text>
        <Text style={[styles.orderValue, { color: COLORS.primary }]}>{item.status}</Text>
      </View>

      <View style={styles.orderRow}>
        <Text style={styles.orderLabel}>Payment mode</Text>
        <Text style={styles.colon}>:</Text>
        <Text style={styles.orderValue}>{item.paymentMode}</Text>
      </View>

      <View style={styles.orderRow}>
        <Text style={styles.orderLabel}>Quantity</Text>
        <Text style={styles.colon}>:</Text>
        <Text style={styles.orderValue}>{item.quantity}</Text>
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
        <Text style={styles.orderLabel}>Address</Text>
        <Text style={styles.colon}>:</Text>
        <Text style={styles.orderValue} numberOfLines={2}>
          {item.buildingName || ''} {item.doorNo ? `, ${item.doorNo}` : ''}
          {"\n"}
          {item.streetName || ''}, {item.area || ''}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>History</Text>
      </View>

      <View style={styles.container}>
        <View style={styles.tabsContainer}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tabBtn,
                  isActive ? styles.tabBtnActive : styles.tabBtnInactive
                ]}
                onPress={() => setActiveTab(tab)}
              >
                <Text
                  style={[
                    styles.tabText,
                    isActive ? styles.tabTextActive : styles.tabTextInactive
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <FlatList
          data={paginatedOrders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBox}>
                 <MaterialIcons name="layers-clear" size={80} color={COLORS.accent} />
              </View>
              <Text style={styles.emptyTitle}>No Orders Found</Text>
              <Text style={styles.emptySub}>You haven't placed any {activeTab.toLowerCase()} orders yet.</Text>
            </View>
          }
        />

        {bannerVisible && filteredOrders.length > 0 && activeTab === 'PENDING' && (
          <View style={styles.successBanner}>
            <View style={styles.successIconBox}>
               <MaterialIcons name="water-drop" size={16} color={COLORS.primary} style={{ opacity: 0.5 }} />
            </View>
            <Text style={styles.successText}>
              Your order has been placed successfully.
            </Text>
          </View>
        )}

        {filteredOrders.length > ITEMS_PER_PAGE && (
          <View style={styles.paginationContainer}>
            <View style={{ flex: 1 }}>
              {currentPage > 1 && (
                <TouchableOpacity 
                  style={styles.pageBtn}
                  onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
                >
                  <MaterialIcons name="chevron-left" size={24} color={COLORS.white} />
                  <Text style={styles.pageBtnText}>Back</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={styles.pageIndicator}>
                {currentPage} / {totalPages}
              </Text>
            </View>

            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              {currentPage < totalPages && (
                <TouchableOpacity 
                  style={styles.pageBtn}
                  onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                >
                  <Text style={styles.pageBtnText}>Next</Text>
                  <MaterialIcons name="chevron-right" size={24} color={COLORS.white} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.accent,
  },
  header: {
    backgroundColor: '#0F9D8A', // Secondary Teal
    paddingHorizontal: 20,
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1,
  },
  container: {
    flex: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  tabBtn: {
    flex: 1,
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnActive: {
    backgroundColor: COLORS.primary,
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  tabBtnInactive: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: '#ffffff',
  },
  tabTextInactive: {
    color: '#1B3A3A',
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    elevation: 2,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  orderRow: {
    flexDirection: 'row',
    marginBottom: 4,
    alignItems: 'center',
  },
  orderLabel: {
    flex: 1.5,
    fontSize: 12,
    color: COLORS.secondary,
    fontWeight: '700',
  },
  colon: {
    width: 15,
    fontSize: 12,
    color: COLORS.secondary,
    textAlign: 'center',
    fontWeight: '700',
  },
  orderValue: {
    flex: 2,
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '900',
    paddingLeft: 4,
  },
  successBanner: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  successIconBox: {
    marginRight: 16,
  },
  successText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    paddingHorizontal: 40,
  },
  emptyIconBox: {
     marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.secondary,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 20,
  },
  cancelIconBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    padding: 2,
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  pageBtnDisabled: {
    backgroundColor: '#F1F5F9',
  },
  pageBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  pageIndicator: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
});
