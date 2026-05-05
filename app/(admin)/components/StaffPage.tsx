import { api } from '@/convex/_generated/api';
import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Modal,
  Platform, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';

const COLORS = {
  primary: '#2EC4B6', secondary: '#0F9D8A', text: '#1B3A3A',
  gray: '#718096', danger: '#E53E3E', success: '#38A169', info: '#3182CE',
};

// ── Add Staff Modal with email duplicate check ──────────────────────────────
function AddStaffModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const createInvite = useMutation(api.invites.createInvite);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [generated, setGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dupModal, setDupModal] = useState(false);

  const checkEmail = useQuery(
    api.users.checkEmailExists,
    email.trim().length > 3 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      ? { email: email.trim() }
      : 'skip'
  );

  const handleGenerate = async () => {
    if (!name.trim()) { Alert.alert('Error', 'Name is required.'); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) { Alert.alert('Error', 'Enter a valid email.'); return; }
    const phoneRegex = /^\d{10}$/;
    if (!phone.trim() || !phoneRegex.test(phone.trim())) { Alert.alert('Error', 'Enter a valid 10-digit phone.'); return; }

    if (checkEmail?.exists) { setDupModal(true); return; }

    const newCode = `HM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    setLoading(true);
    try {
      await createInvite({ name: name.trim(), email: email.trim(), inviteCode: newCode, phone: phone.trim() });
      setCode(newCode); setGenerated(true);
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };

  const handleClose = () => { setName(''); setEmail(''); setPhone(''); setCode(''); setGenerated(false); onClose(); };

  return (
    <>
      <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
        <View style={ms.overlay}>
          <View style={ms.sheet}>
            <View style={ms.hdr}>
              <Text style={ms.title}>Add New Staff</Text>
              <TouchableOpacity onPress={handleClose}><MaterialIcons name="close" size={20} color={COLORS.text} /></TouchableOpacity>
            </View>
            {!generated ? (
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <Text style={ms.label}>Staff Name</Text>
                  <TextInput style={ms.input} placeholder="e.g. Karthi" value={name} onChangeText={setName} />
                  <Text style={ms.label}>Email Address</Text>
                  <TextInput style={ms.input} placeholder="Enter email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
                  <Text style={ms.label}>Phone Number</Text>
                  <TextInput style={ms.input} placeholder="10-digit number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={10} />
                  <TouchableOpacity style={ms.genBtn} onPress={handleGenerate} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff" /> : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <MaterialIcons name="link" size={16} color="#fff" />
                        <Text style={ms.genBtnText}>GENERATE INVITE</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              </KeyboardAvoidingView>
            ) : (
              <View style={ms.inviteBox}>
                <Text style={ms.codeText}>{code}</Text>
                <View style={{ flexDirection: 'row', gap: 10, width: '100%', marginTop: 16 }}>
                  <TouchableOpacity style={[ms.shareBtn, { borderColor: COLORS.primary, borderWidth: 1 }]} onPress={() => {
                    const msg = `*HydroMate Staff Invite*\n\nHi ${name}!\n\nYou've been invited to join HydroMate.\n\n📱 Sign up with: *${email}*\n🔑 Invite code: *${code}*\n\n- HydroMate Team`;
                    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`).catch(() => Share.share({ message: msg }));
                    handleClose();
                  }}>
                    <MaterialIcons name="share" size={14} color={COLORS.primary} />
                    <Text style={[ms.shareBtnText, { color: COLORS.primary }]}>Share</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[ms.shareBtn, { backgroundColor: '#3B82F6', borderColor: '#3B82F6', borderWidth: 1 }]} onPress={async () => {
                    const subject = 'HydroMate Staff Invitation';
                    const msg = `HydroMate Staff Invite\n\nHi ${name}!\n\nYou've been invited to join HydroMate.\n\nSign up with: ${email}\nInvite code: ${code}\n\n- HydroMate Team`;
                    try {
                      await Linking.openURL(`https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(msg)}`);
                    } catch { Share.share({ message: msg }); }
                    handleClose();
                  }}>
                    <MaterialIcons name="email" size={14} color="#fff" />
                    <Text style={[ms.shareBtnText, { color: '#fff' }]}>Email</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Duplicate Email Modal */}
      <Modal visible={dupModal} transparent animationType="fade" onRequestClose={() => setDupModal(false)}>
        <View style={ms.overlay}>
          <View style={[ms.sheet, { alignItems: 'center', gap: 14 }]}>
            <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' }}>
              <MaterialIcons name="error-outline" size={32} color={COLORS.danger} />
            </View>
            <Text style={[ms.title, { textAlign: 'center' }]}>Email Already Registered</Text>
            <Text style={{ fontSize: 13, color: COLORS.gray, textAlign: 'center', lineHeight: 20 }}>
              This email is already registered as <Text style={{fontWeight: '900', color: COLORS.text}}>{checkEmail?.role ? checkEmail.role.charAt(0).toUpperCase() + checkEmail.role.slice(1) : 'Admin/Staff'}</Text>.{'\n'}Please use a different email address.
            </Text>
            <TouchableOpacity style={[ms.genBtn, { width: '100%' }]} onPress={() => setDupModal(false)}>
              <Text style={ms.genBtnText}>OK, Got It</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ── Staff Details Modal ────────────────────────────────────────────────────
function StaffDetailsModal({ visible, staff, onClose }: { visible: boolean; staff: any; onClose: () => void }) {
  const staffIdentifier = staff?.tokenIdentifier ?? staff?.clerkId ?? '';
  const stats = useQuery(api.orders.getStaffStats, staffIdentifier ? { staffIdentifier } : 'skip');
  if (!staff) return null;
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={ms.overlay}>
        <View style={ms.sheet}>
          <View style={ms.hdr}>
            <Text style={ms.title}>Staff Analytics</Text>
            <TouchableOpacity onPress={onClose}><MaterialIcons name="close" size={24} color={COLORS.text} /></TouchableOpacity>
          </View>
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 28, fontWeight: '900', color: '#fff' }}>{staff.name?.[0]?.toUpperCase()}</Text>
            </View>
            <Text style={{ fontSize: 18, fontWeight: '900', color: COLORS.text, marginTop: 10 }}>{staff.name}</Text>
            <Text style={{ fontSize: 12, color: COLORS.gray }}>{staff.email || staff.phone || 'No contact'}</Text>
          </View>
          {stats === undefined ? <ActivityIndicator color={COLORS.secondary} /> : (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {[{ label: 'Assigned', val: stats.total, color: '#3B82F6', bg: '#EFF6FF' },
                { label: 'Active', val: stats.active, color: '#F59E0B', bg: '#FFFBEB' },
                { label: 'Done', val: stats.delivered, color: COLORS.success, bg: '#F0FDF4' }].map((s) => (
                  <View key={s.label} style={{ flex: 1, backgroundColor: s.bg, padding: 16, borderRadius: 14, alignItems: 'center' }}>
                    <Text style={{ fontSize: 22, fontWeight: '900', color: s.color }}>{s.val}</Text>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: s.color, textTransform: 'uppercase', marginTop: 4 }}>{s.label}</Text>
                  </View>
                ))}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── Staff Page ────────────────────────────────────────────────────────────
export default function StaffPage() {
  const staffList = useQuery(api.users.getStaffMembers);
  const pendingInvites = useQuery(api.invites.getPendingInvites);
  const removeStaff = useMutation(api.users.removeStaff);
  const deleteInvite = useMutation(api.invites.deleteInvite);
  const [addModal, setAddModal] = useState(false);
  const [detailsModal, setDetailsModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);

  const confirmRemove = (staffId: string, staffName: string) => {
    const handle = () => removeStaff({ staffId: staffId as any }).catch((e: any) => Alert.alert('Error', e.message));
    if (Platform.OS === 'web') { if (window.confirm(`Remove ${staffName}?`)) handle(); }
    else Alert.alert('Remove?', staffName, [{ text: 'Cancel' }, { text: 'Remove', style: 'destructive', onPress: handle }]);
  };

  const confirmRevokeInvite = (inviteId: any, name: string) => {
    const handle = () => deleteInvite({ inviteId }).catch((e: any) => Alert.alert('Error', e.message));
    if (Platform.OS === 'web') { if (window.confirm(`Revoke invite for ${name}?`)) handle(); }
    else Alert.alert('Revoke?', name, [{ text: 'Cancel' }, { text: 'Revoke', style: 'destructive', onPress: handle }]);
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View style={styles.sectionHdr}>
        <Text style={styles.sectionTitle}>Manage Staff</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setAddModal(true)}>
          <MaterialIcons name="add" size={16} color="#fff" />
          <Text style={styles.addBtnText}>Add New Staff</Text>
        </TouchableOpacity>
      </View>

      {/* Table */}
      <View style={styles.tableCard}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={{ flex: 1 }}
          contentContainerStyle={{ flexDirection: 'column', minWidth: '100%', flexGrow: 1 }}
        >
          <View style={{ minWidth: 750, width: '100%', flex: 1 }}>
            <View style={styles.tableHead}>
              <Text style={[styles.th, { flex: 0.6, textAlign: 'center' }]}>AV</Text>
              <Text style={[styles.th, { flex: 2, minWidth: 120 }]}>NAME</Text>
              <Text style={[styles.th, { flex: 2, minWidth: 150 }]}>CONTACT</Text>
              <Text style={[styles.th, { flex: 1.2, textAlign: 'center' }]}>STATUS</Text>
              <Text style={[styles.th, { flex: 0.6, textAlign: 'center' }]}>ACT</Text>
            </View>

            <ScrollView 
              showsVerticalScrollIndicator={false} 
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 80, flexGrow: 1 }}
            >
              {/* Pending invites */}
              {pendingInvites?.map((inv) => (
                <View key={inv._id} style={styles.tableRow}>
                  <View style={{ flex: 0.6, alignItems: 'center' }}>
                    <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' }}>
                      <MaterialIcons name="mail-outline" size={16} color="#D97706" />
                    </View>
                  </View>
                  <Text style={[styles.td, { flex: 2, minWidth: 120, fontWeight: '800', color: COLORS.text }]}>{inv.name}</Text>
                  <Text style={[styles.td, { flex: 2, minWidth: 150, color: COLORS.gray }]}>{inv.email}</Text>
                  <View style={{ flex: 1.2, alignItems: 'center' }}>
                    <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 }}>
                      <Text style={{ fontSize: 9, fontWeight: '900', color: '#D97706', textTransform: 'uppercase' }}>PENDING</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={{ flex: 0.6, alignItems: 'center' }} onPress={() => confirmRevokeInvite(inv._id, inv.name)}>
                    <MaterialIcons name="close" size={18} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              ))}

              {/* Active staff */}
              {staffList === undefined ? <ActivityIndicator color={COLORS.secondary} style={{ marginTop: 30 }} /> :
                staffList.length === 0 && (!pendingInvites || pendingInvites.length === 0) ? (
                  <View style={{ alignItems: 'center', marginTop: 60, opacity: 0.5 }}>
                    <MaterialIcons name="people-outline" size={48} color={COLORS.gray} />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.gray, marginTop: 8 }}>No staff members yet</Text>
                  </View>
                ) : staffList.map((staff) => (
                  <TouchableOpacity key={staff._id} style={styles.tableRow} onPress={() => { setSelectedStaff(staff); setDetailsModal(true); }}>
                    <View style={{ flex: 0.6, alignItems: 'center' }}>
                      <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#E8FFF9', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 13, fontWeight: '900', color: COLORS.secondary }}>{staff.name[0]?.toUpperCase()}</Text>
                      </View>
                    </View>
                    <Text style={[styles.td, { flex: 2, minWidth: 120, fontWeight: '800', color: COLORS.text }]}>{staff.name}</Text>
                    <Text style={[styles.td, { flex: 2, minWidth: 150, color: COLORS.gray, fontSize: 11 }]}>{staff.phone || staff.email}</Text>
                    <View style={{ flex: 1.2, alignItems: 'center' }}>
                      <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 }}>
                        <Text style={{ fontSize: 9, fontWeight: '900', color: COLORS.success, textTransform: 'uppercase' }}>ACTIVE</Text>
                      </View>
                    </View>
                    <TouchableOpacity style={{ flex: 0.6, alignItems: 'center' }} onPress={() => confirmRemove(staff._id as any, staff.name)}>
                      <MaterialIcons name="delete-outline" size={18} color={COLORS.danger} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))
              }
            </ScrollView>
          </View>
        </ScrollView>
      </View>

      <AddStaffModal visible={addModal} onClose={() => setAddModal(false)} />
      <StaffDetailsModal visible={detailsModal} staff={selectedStaff} onClose={() => setDetailsModal(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: COLORS.text },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.secondary, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  addBtnText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  tableCard: { flex: 1, backgroundColor: 'transparent', overflow: 'hidden' },
  tableHead: { flexDirection: 'row', backgroundColor: 'transparent', paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 2, borderBottomColor: '#E2E8F0', alignItems: 'center' },
  th: { fontSize: 9, fontWeight: '900', color: COLORS.gray, textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', alignItems: 'center', backgroundColor: '#fff' },
  td: { fontSize: 12, color: COLORS.text },
});

const ms = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  sheet: { backgroundColor: '#fff', borderRadius: 20, padding: 20, width: '90%', maxWidth: 340 },
  hdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 16, fontWeight: '900', color: COLORS.text },
  label: { fontSize: 10, fontWeight: '800', color: COLORS.secondary, textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 },
  input: { backgroundColor: '#F9FAFB', borderRadius: 10, padding: 11, fontSize: 13, color: COLORS.text, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  genBtn: { backgroundColor: COLORS.secondary, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  genBtnText: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  inviteBox: { alignItems: 'center', padding: 4 },
  codeText: { fontSize: 22, fontWeight: '900', color: COLORS.secondary, letterSpacing: 3, marginBottom: 4 },
  shareBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: 10, gap: 6 },
  shareBtnText: { fontSize: 11, fontWeight: '900' },
});
