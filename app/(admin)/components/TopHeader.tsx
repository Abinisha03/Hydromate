import { api } from '@/convex/_generated/api';
import { useUser } from '@clerk/clerk-expo';
import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import React, { useState, useEffect } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, TextInput, ActivityIndicator, Alert } from 'react-native';

interface TopHeaderProps {
  pageTitle: string;
  onMenuToggle: () => void;
  showMenuBtn: boolean;
  onLogout: () => void;
}

function EditProfileModal({ visible, onClose, currentUser }: { visible: boolean; onClose: () => void; currentUser: any }) {
  const updateProfile = useMutation(api.users.updateUserProfile);
  const [name, setName] = useState(currentUser?.displayName || currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(currentUser?.displayName || currentUser?.name || '');
      setPhone(currentUser?.phone || '');
    }
  }, [visible, currentUser]);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Error', 'Name is required'); return; }
    setLoading(true);
    try {
      await updateProfile({ displayName: name, phone: phone });
      Alert.alert('Success', 'Profile updated successfully');
      onClose();
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Admin Profile</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#1B3A3A" />
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <Text style={styles.inputLabel}>Display Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter admin name"
            />
            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ProfilePopupModal({ visible, onClose, currentUser, adminId, onEdit }: { visible: boolean; onClose: () => void; currentUser: any; adminId: string; onEdit: () => void }) {
  const adminName = currentUser?.displayName || currentUser?.name || 'Admin';
  
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.popupCard}>
          <View style={styles.popupHeader}>
            <View style={styles.popupAvatar}>
              <MaterialIcons name="person" size={32} color="#fff" />
            </View>
            <View>
              <Text style={styles.popupName}>{adminName}</Text>
              <Text style={styles.popupRole}>Professional Admin</Text>
            </View>
          </View>
          <View style={styles.popupDivider} />
          <View style={styles.popupRow}>
            <Text style={styles.popupLabel}>Admin ID</Text>
            <View style={styles.idBadge}>
              <Text style={styles.idText}>{adminId}</Text>
            </View>
          </View>
          <View style={styles.popupRow}>
            <Text style={styles.popupLabel}>Phone</Text>
            <Text style={styles.popupValue}>{currentUser?.phone || 'Not set'}</Text>
          </View>
          <TouchableOpacity style={styles.popupEditBtn} onPress={() => { onClose(); onEdit(); }}>
            <MaterialIcons name="edit" size={18} color="#fff" />
            <Text style={styles.popupEditBtnText}>Edit Profile Details</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

export default function TopHeader({ pageTitle, onMenuToggle, showMenuBtn, onLogout }: TopHeaderProps) {
  const { user } = useUser();
  const currentUser = useQuery(api.users.getCurrentUser);
  const [profilePopupVisible, setProfilePopupVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  
  const adminId = `ADM-${(user?.id ?? 'XXXX').slice(-6).toUpperCase()}`;

  return (
    <View style={styles.header}>
      <View style={styles.leftSide}>
        {showMenuBtn && (
          <TouchableOpacity style={styles.menuBtn} onPress={onMenuToggle}>
            <MaterialIcons name="menu" size={22} color="#1B3A3A" />
          </TouchableOpacity>
        )}
        <Text style={styles.pageTitle}>{pageTitle}</Text>
      </View>

      {/* Profile Logo Only */}
      <TouchableOpacity style={styles.avatarLogo} onPress={() => setProfilePopupVisible(true)}>
        <MaterialIcons name="account-circle" size={36} color="#0F9D8A" />
      </TouchableOpacity>

      <ProfilePopupModal 
        visible={profilePopupVisible} 
        onClose={() => setProfilePopupVisible(false)} 
        currentUser={currentUser}
        adminId={adminId}
        onEdit={() => setEditModalVisible(true)}
      />

      <EditProfileModal 
        visible={editModalVisible} 
        onClose={() => setEditModalVisible(false)} 
        currentUser={currentUser}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 10,
  },
  leftSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1B3A3A',
    letterSpacing: -0.3,
  },
  avatarLogo: {
    padding: 2,
    borderRadius: 20,
    backgroundColor: '#F0FDFA',
  },
  // Popup Styles
  popupCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  popupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  popupAvatar: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#0F9D8A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1B3A3A',
  },
  popupRole: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F9D8A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  popupDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 16,
  },
  popupRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  popupLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#718096',
  },
  popupValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1B3A3A',
  },
  popupEditBtn: {
    backgroundColor: '#0F9D8A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  popupEditBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  idBadge: {
    backgroundColor: '#E8FFF9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  idText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0F9D8A',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1B3A3A',
  },
  modalBody: {
    gap: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#718096',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    color: '#1B3A3A',
  },
  saveBtn: {
    backgroundColor: '#0F9D8A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
});
