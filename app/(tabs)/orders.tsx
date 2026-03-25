import React, { useState } from 'react';
import { StyleSheet, View, Text, SafeAreaView, Platform, StatusBar, TouchableOpacity, FlatList } from 'react-native';
import { useQuery } from 'convex/react';
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
  const orders = useQuery(api.orders.getOrders);

  const tabs = ['PENDING', 'COMPLETED', 'CANCEL'];

  const filteredOrders = orders?.filter(order => 
    order.status.toUpperCase() === activeTab
  ) || [];

  const renderOrderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.orderCard}
      onPress={() => router.push({
        pathname: '/order-details',
        params: { id: item._id }
      })}
    >
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
          data={filteredOrders}
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

        {(success || activeTab === 'PENDING') && (
          <View style={styles.successBanner}>
            <View style={styles.successIconBox}>
               <MaterialIcons name="water-drop" size={16} color={COLORS.primary} style={{ opacity: 0.5 }} />
            </View>
            <Text style={styles.successText}>
              Your order has been placed successfully with Cash on Delivery.
            </Text>
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
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: COLORS.accent, // Use theme accent for subtle border
    elevation: 2,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  orderRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'center',
  },
  orderLabel: {
    flex: 1.5,
    fontSize: 16,
    color: COLORS.secondary,
    fontWeight: '700',
  },
  colon: {
    width: 20,
    fontSize: 16,
    color: COLORS.secondary,
    textAlign: 'center',
    fontWeight: '700',
  },
  orderValue: {
    flex: 2,
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '900',
    paddingLeft: 10,
  },
  successBanner: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
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
});
