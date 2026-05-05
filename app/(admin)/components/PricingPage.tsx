import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const COLORS = {
  primary: '#2EC4B6', secondary: '#0F9D8A', text: '#1B3A3A',
  gray: '#718096', info: '#3182CE', warning: '#F6AD55',
};

function PricingRow({ icon, title, current, color, onUpdate }: any) {
  const [val, setVal] = useState('');
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    const num = parseFloat(val);
    if (isNaN(num) || num < 0) return;
    setLoading(true);
    try { await onUpdate(num); setVal(''); Alert.alert('Success', 'Price updated.'); }
    catch (e) { Alert.alert('Error', (e as Error).message); }
    finally { setLoading(false); }
  };
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <View style={[styles.iconBox, { backgroundColor: color + '18' }]}>
          <MaterialIcons name={icon} size={18} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>{title}</Text>
          <Text style={[styles.rowCurrent, { color }]}>Current: ₹{current}</Text>
        </View>
      </View>
      <View style={styles.rowRight}>
        <TextInput
          style={styles.input}
          placeholder="New price"
          keyboardType="numeric"
          value={val}
          onChangeText={setVal}
        />
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: color }]} onPress={handle} disabled={loading}>
          {loading ? <ActivityIndicator size="small" color="#fff" /> : <MaterialIcons name="done" size={18} color="#fff" />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function PincodeSection() {
  const pincodes = useQuery(api.pincodes.getPincodes);
  const addPincode = useMutation(api.pincodes.addPincode);
  const updatePincode = useMutation(api.pincodes.updatePincode);
  const deletePincode = useMutation(api.pincodes.deletePincode);
  const seedPincodes = useMutation(api.pincodes.seedDefaultPincodes);

  const [label, setLabel] = useState('');
  const [value, setValue] = useState('');
  const [editingId, setEditingId] = useState<Id<'pincodes'> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (pincodes !== undefined && pincodes.length === 0) seedPincodes(); }, [pincodes]);

  const handleSave = async () => {
    if (!label || !value) { Alert.alert('Error', 'Fill both fields.'); return; }
    setSaving(true);
    try {
      if (editingId) { await updatePincode({ id: editingId, label, value }); setEditingId(null); }
      else { await addPincode({ label, value }); }
      setLabel(''); setValue('');
    } catch (e) { Alert.alert('Error', (e as Error).message); }
    finally { setSaving(false); }
  };

  const handleDelete = (id: any) => {
    const del = () => deletePincode({ id }).catch((e: any) => Alert.alert('Error', e.message));
    if (Platform.OS === 'web') { if (window.confirm('Delete pincode?')) del(); }
    else Alert.alert('Delete?', 'Remove this pincode?', [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: del }]);
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHdr}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <MaterialIcons name="map" size={18} color={COLORS.secondary} />
          <Text style={styles.sectionTitle}>Pincode Management</Text>
        </View>
        <Text style={{ fontSize: 10, color: COLORS.gray, fontWeight: '700' }}>{pincodes?.length ?? 0} AREAS</Text>
      </View>

      <View style={styles.tableCard}>
        {/* Table head */}
        <View style={styles.pHead}>
          <Text style={[styles.pTh, { flex: 2.5 }]}>AREA NAME</Text>
          <Text style={[styles.pTh, { flex: 1, textAlign: 'center' }]}>CODE</Text>
          <Text style={[styles.pTh, { width: 90, textAlign: 'center' }]}>ACTIONS</Text>
        </View>

        {/* Input row */}
        <View style={styles.inputRow}>
          <TextInput style={[styles.pInput, { flex: 2.5 }]} placeholder="Area name…" value={label} onChangeText={setLabel} />
          <TextInput style={[styles.pInput, { flex: 1, textAlign: 'center' }]} placeholder="Code" value={value} onChangeText={setValue} keyboardType="numeric" />
          <View style={{ width: 90, flexDirection: 'row', justifyContent: 'center', gap: 6, paddingHorizontal: 8 }}>
            <TouchableOpacity style={[styles.pBtn, { backgroundColor: editingId ? '#10B981' : COLORS.secondary }]} onPress={handleSave} disabled={saving}>
              <MaterialIcons name={editingId ? 'done' : 'add'} size={18} color="#fff" />
            </TouchableOpacity>
            {editingId && (
              <TouchableOpacity style={[styles.pBtn, { backgroundColor: '#EF4444' }]} onPress={() => { setEditingId(null); setLabel(''); setValue(''); }}>
                <MaterialIcons name="close" size={18} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Rows */}
        {pincodes === undefined ? <ActivityIndicator color={COLORS.secondary} style={{ margin: 30 }} /> :
          pincodes.map((p, i) => (
            <View key={p._id} style={[styles.pRow, i === pincodes.length - 1 && { borderBottomWidth: 0 }, editingId === p._id && { backgroundColor: '#F0FDFA' }]}>
              <Text style={[styles.pCell, { flex: 2.5, fontWeight: '700' }]} numberOfLines={1}>{p.label}</Text>
              <Text style={[styles.pCell, { flex: 1, textAlign: 'center', color: COLORS.secondary, fontWeight: '800' }]}>{p.value}</Text>
              <View style={{ width: 90, flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
                <TouchableOpacity style={styles.pActionBtn} onPress={() => { setEditingId(p._id); setLabel(p.label); setValue(p.value); }}>
                  <MaterialIcons name="edit" size={15} color={COLORS.gray} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.pActionBtn, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]} onPress={() => handleDelete(p._id)}>
                  <MaterialIcons name="delete-outline" size={15} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        }
      </View>
    </View>
  );
}

export default function PricingPage() {
  const pricing = useQuery(api.pricing.getPricing);
  const updatePricing = useMutation(api.pricing.updatePricing);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Pricing Settings</Text>
      <View style={styles.tableCard}>
        <PricingRow
          icon="water-drop" title="Water Can (20L)"
          current={pricing?.waterPrice ?? 0} color={COLORS.primary}
          onUpdate={(v: number) => updatePricing({ waterPrice: v, bottlePrice: pricing?.bottlePrice ?? 0, expressCharge: pricing?.expressCharge ?? 0 })}
        />
        <PricingRow
          icon="inventory" title="Empty Container"
          current={pricing?.bottlePrice ?? 0} color={COLORS.info}
          onUpdate={(v: number) => updatePricing({ waterPrice: pricing?.waterPrice ?? 0, bottlePrice: v, expressCharge: pricing?.expressCharge ?? 0 })}
        />
        <PricingRow
          icon="speed" title="Express Delivery"
          current={pricing?.expressCharge ?? 0} color={COLORS.warning}
          onUpdate={(v: number) => updatePricing({ waterPrice: pricing?.waterPrice ?? 0, bottlePrice: pricing?.bottlePrice ?? 0, expressCharge: v })}
        />
      </View>
      <PincodeSection />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 80, gap: 20 },
  section: { gap: 12 },
  sectionHdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: COLORS.text },
  tableCard: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F9FAFB', flexWrap: 'wrap', gap: 10 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 150 },
  iconBox: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 13, fontWeight: '800', color: COLORS.text },
  rowCurrent: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { backgroundColor: '#F9FAFB', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, borderWidth: 1, borderColor: '#E2E8F0', width: 90, textAlign: 'center', fontWeight: '700' },
  saveBtn: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  pHead: { flexDirection: 'row', backgroundColor: '#F8FAFC', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', alignItems: 'center' },
  pTh: { fontSize: 9, fontWeight: '900', color: COLORS.gray, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingLeft: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 8 },
  pInput: { backgroundColor: '#F9FAFB', borderRadius: 8, paddingHorizontal: 10, height: 34, fontSize: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  pBtn: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  pRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F9FAFB', alignItems: 'center' },
  pCell: { fontSize: 12, color: COLORS.text },
  pActionBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
});
