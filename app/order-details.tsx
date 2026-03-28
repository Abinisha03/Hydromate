import React from 'react';
import { StyleSheet, View, Text, SafeAreaView, Platform, StatusBar, TouchableOpacity, ScrollView, Linking, ActivityIndicator, Modal, TextInput, Alert, KeyboardAvoidingView } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import BackgroundAnimation from '@/components/BackgroundAnimation';
import { scale } from '@/utils/responsive';

const COLORS = {
  primary: '#2EC4B6',
  secondary: '#0F9D8A',
  accent: '#E8FFF9',
  text: '#1B3A3A',
  white: '#FFFFFF',
  gray: '#718096',
  border: '#E2E8F0',
};

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useUser();
  const order = useQuery(api.orders.getOrderById, { orderId: id as any });
  const addresses = useQuery(api.addresses.getAddresses);
  const createComplaint = useMutation(api.complaints.createComplaint);

  const [complaintModal, setComplaintModal] = React.useState(false);
  const [complaintText, setComplaintText] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const defaultAddress = addresses?.find(a => a.isDefault) || addresses?.[0];
  const userName = defaultAddress?.name || user?.fullName || 'User';
  const userPhone = defaultAddress?.phone || user?.primaryPhoneNumber?.phoneNumber || 'No phone';

  const handleComplaintSubmit = async () => {
    if (!complaintText.trim()) {
      Alert.alert('Required', 'Please enter a description for your concern.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createComplaint({
        orderId: (id as string) || 'N/A',
        userName,
        userPhone,
        description: complaintText,
      });
      setComplaintModal(false);
      setComplaintText('');
      Alert.alert('Success', 'Your concern has been registered. Our team will contact you soon.');
    } catch (error) {
      Alert.alert('Error', 'Failed to submit complaint. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!order) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.accent} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{ color: COLORS.secondary, marginTop: 12, fontWeight: '700' }}>Loading your hydration details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} />
      <BackgroundAnimation />
      <Stack.Screen 
        options={{ 
          title: 'Order Status', 
          headerTintColor: COLORS.white, 
          headerStyle: { backgroundColor: COLORS.secondary },
          headerTitleStyle: { fontWeight: '900' } 
        }} 
      />
      
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.mainWrapper}>
        {/* Main Status Card - Redesigned with Soft Edges */}
        <View style={styles.detailsCard}>
          <View style={styles.cardHeader}>
             <FontAwesome5 name="water" size={24} color={COLORS.primary} />
             <Text style={styles.cardHeaderTitle}>Premium Quality Water</Text>
          </View>
          
          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.label}>Order ID</Text>
            <Text style={styles.value}>{order.orderId}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Status</Text>
            <View style={styles.statusBadge}>
               <Text style={styles.statusText}>{order.status}</Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Cans (20L)</Text>
            <Text style={styles.value}>{order.quantity}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Bottle Return</Text>
            <Text style={styles.value}>{order.noBottleReturn ? 'NEW BOTTLE' : 'RETURNED'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Ordered On</Text>
            <Text style={styles.value}>{order.date}</Text>
          </View>
          {order.expressCharge > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.label}>Express Delivery</Text>
              <Text style={styles.value}>₹ {order.expressCharge}</Text>
            </View>
          )}

          <View style={styles.totalBox}>
             <Text style={styles.totalLabel}>Total Amount Paid</Text>
             <Text style={styles.totalValue}>₹ {order.totalAmount}</Text>
          </View>

          <View style={styles.otpBox}>
             <Text style={styles.otpLabel}>Delivery OTP</Text>
             <Text style={styles.otpValue}>{order.otp}</Text>
          </View>
        </View>

        {/* Supplier Info - Branded Card */}
        <View style={styles.supplierCard}>
          <View style={styles.supplierIconBox}>
             <MaterialIcons name="local-shipping" size={32} color={COLORS.white} />
          </View>
          <View style={styles.supplierInfo}>
             <Text style={styles.supplierTitle}>Assigned Delivery Partner</Text>
             <Text style={styles.supplierName}>{order.supplierName}</Text>
             <Text style={styles.supplierPhone}>{order.supplierPhone}</Text>
          </View>
          <TouchableOpacity 
              style={styles.callBtn}
              onPress={() => Linking.openURL(`tel:${order.supplierPhone}`)}
          >
              <MaterialIcons name="call" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>
        {/* Help Actions */}
        <View style={styles.helpRow}>
           <TouchableOpacity style={styles.helpBtn}>
              <MaterialIcons name="support-agent" size={20} color={COLORS.secondary} style={{ marginRight: 8 }} />
              <Text style={styles.helpBtnText}>Chat with Support</Text>
           </TouchableOpacity>
           
           <TouchableOpacity 
              style={[styles.helpBtn, styles.complaintBtn]}
              onPress={() => setComplaintModal(true)}
            >
              <Text style={styles.complaintText}>Raise Concern</Text>
            </TouchableOpacity>
        </View>
        </View>
      </ScrollView>

      {/* Complaint Modal */}
      <Modal
        visible={complaintModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setComplaintModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.white }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setComplaintModal(false)} style={styles.backBtn}>
              <MaterialIcons name="arrow-back" size={28} color={COLORS.secondary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Water</Text>
            <View style={{ width: 28 }} />
          </View>

          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalBody}
          >
            <Text style={styles.feedbackTitle}>Share your feedbacks</Text>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="Discription"
                placeholderTextColor={COLORS.gray}
                multiline
                numberOfLines={6}
                value={complaintText}
                onChangeText={setComplaintText}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity 
              style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
              onPress={handleComplaintSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>SUBMIT</Text>
              )}
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.accent,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    padding: scale(12),
  },
  mainWrapper: {
    maxWidth: 550,
    width: '100%',
    alignSelf: 'center',
  },
  detailsCard: {
    backgroundColor: COLORS.white,
    borderRadius: scale(16),
    padding: scale(12),
    marginBottom: scale(12),
    elevation: 4,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(12),
    justifyContent: 'center',
  },
  cardHeaderTitle: {
    fontSize: scale(14),
    fontWeight: '800',
    color: COLORS.secondary,
    marginLeft: scale(8),
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.accent,
    marginBottom: scale(12),
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(10),
  },
  label: {
    fontSize: scale(12),
    color: COLORS.text,
    opacity: 0.6,
    fontWeight: '600',
  },
  value: {
    fontSize: scale(12),
    color: COLORS.text,
    fontWeight: '700',
  },
  statusBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
    borderRadius: scale(6),
    borderWidth: 1,
    borderColor: 'rgba(46, 196, 182, 0.2)',
  },
  statusText: {
    fontSize: scale(9),
    fontWeight: '900',
    color: COLORS.secondary,
    textTransform: 'uppercase',
  },
  totalBox: {
    backgroundColor: COLORS.accent,
    borderRadius: scale(14),
    padding: scale(12),
    marginTop: scale(10),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: scale(12),
    fontWeight: '700',
    color: COLORS.secondary,
  },
  totalValue: {
    fontSize: scale(16),
    fontWeight: '900',
    color: COLORS.primary,
  },
  otpBox: {
    marginTop: scale(12),
    alignItems: 'center',
    padding: scale(10),
    borderWidth: 2,
    borderColor: COLORS.accent,
    borderRadius: scale(14),
    borderStyle: 'dashed',
  },
  otpLabel: {
    fontSize: scale(10),
    color: COLORS.text,
    opacity: 0.5,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: scale(2),
  },
  otpValue: {
    fontSize: scale(20),
    fontWeight: '900',
    color: COLORS.secondary,
    letterSpacing: 6,
  },
  supplierCard: {
    backgroundColor: COLORS.white,
    borderRadius: scale(16),
    padding: scale(12),
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(20),
    elevation: 3,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
  },
  supplierIconBox: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(12),
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(10),
  },
  supplierInfo: {
    flex: 1,
  },
  supplierTitle: {
    fontSize: scale(8),
    fontWeight: '900',
    color: COLORS.primary,
    marginBottom: scale(2),
    letterSpacing: 1,
  },
  supplierName: {
    fontSize: scale(14),
    fontWeight: '900',
    color: COLORS.text,
  },
  supplierPhone: {
    fontSize: scale(11),
    color: COLORS.gray,
    fontWeight: '600',
  },
  callBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  helpRow: {
    flexDirection: 'row',
    gap: scale(10),
  },
  helpBtn: {
    flex: 1.5,
    height: scale(42),
    borderRadius: scale(14),
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  helpBtnText: {
    fontSize: scale(12),
    fontWeight: '700',
    color: COLORS.secondary,
  },
  complaintBtn: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  complaintText: {
    fontSize: scale(12),
    fontWeight: '700',
    color: '#E53E3E',
    textDecorationLine: 'underline',
  },
  // Modal Styles
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    height: scale(48),
    backgroundColor: COLORS.secondary,
  },
  backBtn: {
    padding: scale(8),
  },
  modalTitle: {
    fontSize: scale(16),
    fontWeight: '900',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    marginRight: scale(40),
  },
  modalBody: {
    flex: 1,
    padding: scale(16),
    backgroundColor: '#fff',
  },
  feedbackTitle: {
    fontSize: scale(14),
    fontWeight: '700',
    color: COLORS.secondary,
    marginBottom: scale(12),
  },
  inputContainer: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: scale(12),
    padding: scale(10),
    backgroundColor: '#F8FAFC',
    minHeight: scale(120),
  },
  textInput: {
    fontSize: scale(13),
    color: COLORS.text,
    fontWeight: '600',
    minHeight: scale(100),
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    height: scale(42),
    borderRadius: scale(21),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: scale(20),
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: scale(14),
    fontWeight: '900',
    letterSpacing: 1,
  },
});
