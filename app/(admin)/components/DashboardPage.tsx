import { api } from '@/convex/_generated/api';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

const COLORS = {
  primary: '#2EC4B6',
  secondary: '#0F9D8A',
  accent: '#E8FFF9',
  text: '#1B3A3A',
  gray: '#718096',
  border: '#E2E8F0',
  success: '#38A169',
  warning: '#F6AD55',
  info: '#3182CE',
  danger: '#E53E3E',
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function KpiCard({ icon, label, value, color, sub }: { icon: string; label: string; value: string | number; color: string; sub?: string }) {
  return (
    <View style={[styles.kpiCard, { borderTopColor: color }]}>
      <View style={[styles.kpiIconBox, { backgroundColor: color + '18' }]}>
        <MaterialIcons name={icon as any} size={22} color={color} />
      </View>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
      {sub ? <Text style={styles.kpiSub}>{sub}</Text> : null}
    </View>
  );
}

// Lightweight bar chart — pure React Native (no recharts dependency on native)
function SimpleBarChart({ data, color, label }: { data: { name: string; value: number }[]; color: string; label: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const barWidth = Math.floor(100 / data.length);

  return (
    <View style={styles.chartWrap}>
      <Text style={styles.chartTitle}>{label}</Text>
      <View style={styles.chartBars}>
        {data.map((d) => (
          <View key={d.name} style={[styles.barCol, { width: `${barWidth}%` as any }]}>
            <Text style={styles.barVal}>{d.value > 0 ? d.value : ''}</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { height: `${Math.round((d.value / max) * 100)}%` as any, backgroundColor: color },
                ]}
              />
            </View>
            <Text style={styles.barName}>{d.name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// Web recharts wrapper — only rendered on web
function WebBarChart({ data, color, label }: { data: { name: string; value: number }[]; color: string; label: string }) {
  const [charts, setCharts] = React.useState<any>(null);

  React.useEffect(() => {
    if (Platform.OS === 'web') {
      import('recharts').then((mod) => setCharts(mod)).catch(() => {});
    }
  }, []);

  if (!charts) return <SimpleBarChart data={data} color={color} label={label} />;

  const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } = charts;

  return (
    <View style={styles.chartWrap}>
      <Text style={styles.chartTitle}>{label}</Text>
      <View style={{ height: 200, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#718096', fontWeight: 600 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#718096' }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }}
              cursor={{ fill: color + '15' }}
            />
            <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} name="Orders" />
          </BarChart>
        </ResponsiveContainer>
      </View>
    </View>
  );
}

// ── Calendar Helpers ─────────────────────────────────────────────────────────
const getDaysInMonth = (m: number, y: number) => new Date(y, m + 1, 0).getDate();
const getFirstDayOfMonth = (m: number, y: number) => new Date(y, m, 1).getDay();

// ── Calendar Picker ─────────────────────────────────────────────────────────────
interface CalendarPickerProps {
  selectedDate: Date;
  onSelect: (date: Date) => void;
}

function CalendarPicker({ selectedDate, onSelect }: CalendarPickerProps) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date(selectedDate));
  const now = new Date();

  const month = viewDate.getMonth();
  const year = viewDate.getFullYear();
  const daysInMonth = getDaysInMonth(month, year);
  const firstDay = getFirstDayOfMonth(month, year);

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const label = `${selectedDate.getDate()} ${MONTH_SHORT[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;

  const changeMonth = (offset: number) => {
    setViewDate(new Date(year, month + offset, 1));
  };

  return (
    <View style={styles.ddWrapper}>
      <TouchableOpacity
        style={styles.dropdownBtn}
        onPress={() => {
          setViewDate(new Date(selectedDate));
          setOpen(true);
        }}
        activeOpacity={0.85}
      >
        <MaterialIcons name="event" size={14} color={COLORS.info} />
        <Text style={styles.dropdownBtnText}>{label}</Text>
        <MaterialIcons name="keyboard-arrow-down" size={18} color={COLORS.info} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <TouchableWithoutFeedback>
            <View style={styles.calPicker}>
              <View style={styles.calHeader}>
                <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.calArrow}>
                  <MaterialIcons name="chevron-left" size={24} color={COLORS.info} />
                </TouchableOpacity>
                <Text style={styles.calYearTitle}>{MONTH_NAMES[month]} {year}</Text>
                <TouchableOpacity onPress={() => changeMonth(1)} style={styles.calArrow}>
                  <MaterialIcons name="chevron-right" size={24} color={COLORS.info} />
                </TouchableOpacity>
              </View>

              <View style={styles.weekDaysRow}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <Text key={i} style={styles.weekDayText}>{d}</Text>
                ))}
              </View>

              <View style={styles.daysGrid}>
                {days.map((day, idx) => {
                  if (day === null) return <View key={`pad-${idx}`} style={styles.dayCell} />;
                  const isSelected = selectedDate.getDate() === day && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;
                  const isToday = now.getDate() === day && now.getMonth() === month && now.getFullYear() === year;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.dayCell, isSelected && styles.dayCellActive, isToday && !isSelected && styles.dayCellToday]}
                      onPress={() => {
                        onSelect(new Date(year, month, day));
                        setOpen(false);
                      }}
                    >
                      <Text style={[styles.dayText, isSelected && styles.dayTextActive, isToday && styles.dayTextToday]}>{day}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity style={styles.calCloseBtn} onPress={() => setOpen(false)}>
                <Text style={styles.calCloseBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const orders = useQuery(api.orders.getAllOrders);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewType, setViewType] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  const stats = useMemo(() => {
    if (!orders) return null;
    const DAY = 86400000;

    const selectedTs = selectedDate.getTime();
    const selectedMonth = selectedDate.getMonth();
    const selectedYear = selectedDate.getFullYear();

    // 1. Weekly Data (Centered around selected date)
    const weeklyData: { name: string; value: number; fullDate: string }[] = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 3; i >= -3; i--) {
      const d = new Date(selectedTs - i * DAY);
      weeklyData.push({ name: dayNames[d.getDay()], value: 0, fullDate: d.toDateString() });
    }
    orders.forEach((o) => {
      const od = new Date(o._creationTime).toDateString();
      const bucket = weeklyData.find(w => w.fullDate === od);
      if (bucket) bucket.value += 1;
    });

    // 2. Monthly Data (4 weeks of selected month)
    const monthStart = new Date(selectedYear, selectedMonth, 1).getTime();
    const monthEnd = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999).getTime();
    const monthlyData = [
      { name: 'W1', value: 0 }, { name: 'W2', value: 0 }, { name: 'W3', value: 0 }, { name: 'W4', value: 0 }
    ];
    orders.forEach((o) => {
      if (o._creationTime >= monthStart && o._creationTime <= monthEnd) {
        const d = new Date(o._creationTime).getDate();
        const weekIdx = Math.min(3, Math.floor((d - 1) / 7));
        monthlyData[weekIdx].value += 1;
      }
    });

    // 3. Daily Data (3-hour blocks)
    const dailyData = [
      { name: '12am', value: 0 }, { name: '3am', value: 0 }, { name: '6am', value: 0 }, { name: '9am', value: 0 },
      { name: '12pm', value: 0 }, { name: '3pm', value: 0 }, { name: '6pm', value: 0 }, { name: '9pm', value: 0 }
    ];
    orders.forEach(o => {
      const d = new Date(o._creationTime);
      if (d.toDateString() === selectedDate.toDateString()) {
        const bucket = Math.floor(d.getHours() / 3);
        dailyData[bucket].value += 1;
      }
    });

    const weeklyOrders = weeklyData.reduce((s, d) => s + d.value, 0);
    const monthlyOrders = monthlyData.reduce((s, d) => s + d.value, 0);
    const revenue = orders.filter((o) => o.status === 'Delivered').reduce((s, o) => s + o.totalAmount, 0);

    let chartData: { name: string; value: number }[] = weeklyData.map(({ name, value }) => ({ name, value }));
    if (viewType === 'monthly') chartData = monthlyData;
    if (viewType === 'daily') chartData = dailyData;

    return { total: orders.length, weeklyOrders, monthlyOrders, revenue, chartData };
  }, [orders, selectedDate, viewType]);

  if (!stats) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.secondary} />
        <Text style={styles.loadingText}>Loading analytics…</Text>
      </View>
    );
  }

  const ChartComponent = Platform.OS === 'web' ? WebBarChart : SimpleBarChart;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* KPI Cards */}
      <View style={styles.kpiGrid}>
        <KpiCard icon="list-alt" label="Total Orders" value={stats.total} color={COLORS.secondary} />
        <KpiCard icon="date-range" label="Weekly Orders" value={stats.weeklyOrders} color={COLORS.info} sub="Selected Week" />
        <KpiCard
          icon="calendar-today"
          label="Monthly Orders"
          value={stats.monthlyOrders}
          color={COLORS.warning}
          sub={`${MONTH_SHORT[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`}
        />
        <KpiCard icon="currency-rupee" label="Revenue" value={`₹${stats.revenue.toLocaleString()}`} color={COLORS.success} sub="Delivered orders" />
      </View>

      {/* Charts Row */}
      <View style={styles.chartsRow}>
        <View style={styles.chartCard}>
          <View style={styles.chartCardHeader}>
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[styles.toggleBtn, viewType === 'daily' && styles.toggleBtnActive]}
                onPress={() => setViewType('daily')}
              >
                <Text style={[styles.toggleText, viewType === 'daily' && styles.toggleTextActive]}>Day</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, viewType === 'weekly' && styles.toggleBtnActive]}
                onPress={() => setViewType('weekly')}
              >
                <Text style={[styles.toggleText, viewType === 'weekly' && styles.toggleTextActive]}>Week</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, viewType === 'monthly' && styles.toggleBtnActive]}
                onPress={() => setViewType('monthly')}
              >
                <Text style={[styles.toggleText, viewType === 'monthly' && styles.toggleTextActive]}>Month</Text>
              </TouchableOpacity>
            </View>

            <CalendarPicker
              selectedDate={selectedDate}
              onSelect={(date) => setSelectedDate(date)}
            />
          </View>
          
          <ChartComponent
            data={stats.chartData}
            color={viewType === 'daily' ? COLORS.danger : viewType === 'weekly' ? COLORS.secondary : COLORS.info}
            label={
              viewType === 'daily' ? `Orders for ${selectedDate.toDateString()}` :
              viewType === 'weekly' ? 'Weekly Comparison' :
              `${MONTH_NAMES[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`
            }
          />
        </View>
      </View>

      {/* Summary Row */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={[styles.summaryDot, { backgroundColor: COLORS.warning }]} />
          <Text style={styles.summaryLabel}>Pending</Text>
          <Text style={styles.summaryValue}>{orders?.filter((o) => o.status === 'Pending').length ?? 0}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <View style={[styles.summaryDot, { backgroundColor: COLORS.info }]} />
          <Text style={styles.summaryLabel}>Active</Text>
          <Text style={styles.summaryValue}>{orders?.filter((o) => ['Assigned', 'Accepted', 'Out for Delivery'].includes(o.status)).length ?? 0}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <View style={[styles.summaryDot, { backgroundColor: COLORS.success }]} />
          <Text style={styles.summaryLabel}>Delivered</Text>
          <Text style={styles.summaryValue}>{orders?.filter((o) => o.status === 'Delivered').length ?? 0}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <View style={[styles.summaryDot, { backgroundColor: COLORS.danger }]} />
          <Text style={styles.summaryLabel}>Cancelled</Text>
          <Text style={styles.summaryValue}>{orders?.filter((o) => ['Cancel', 'Rejected'].includes(o.status)).length ?? 0}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: { padding: 20, paddingBottom: 60, gap: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: COLORS.gray, fontWeight: '600' },

  // ── Professional Calendar Dropdown Styles ──────────────────────────────
  ddWrapper: {
    position: 'relative',
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  dropdownBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.info,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calPicker: {
    backgroundColor: '#fff',
    width: 280,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 25,
  },
  calHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 5,
  },
  calArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calYearTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.text,
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  calMonthBtn: {
    width: '30%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  calMonthBtnActive: {
    backgroundColor: COLORS.info,
    borderColor: COLORS.info,
  },
  calMonthBtnDisabled: {
    backgroundColor: '#fff',
    borderColor: '#F1F5F9',
    opacity: 0.3,
  },
  calMonthText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },
  calMonthTextActive: {
    color: '#fff',
  },
  calMonthTextDisabled: {
    color: COLORS.gray,
  },
  calCloseBtn: {
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  calCloseBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },

  // ── Chart card header row ─────────────────────────────────────────────────
  chartCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  chartCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.text,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    padding: 3,
    borderRadius: 10,
    gap: 4,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  toggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.gray,
  },
  toggleTextActive: {
    color: COLORS.text,
  },

  // ── KPI grid ─────────────────────────────────────────────────────────────
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  kpiCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderTopWidth: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 6,
  },
  kpiIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  kpiValue: { fontSize: 26, fontWeight: '900', letterSpacing: -1 },
  kpiLabel: { fontSize: 11, fontWeight: '700', color: COLORS.text },
  kpiSub: { fontSize: 9, color: COLORS.gray, fontWeight: '600' },
  // Calendar Grid Styles
  weekDaysRow: { flexDirection: 'row', marginBottom: 10, paddingHorizontal: 5 },
  weekDayText: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '800', color: COLORS.gray },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  dayCell: { width: '13.5%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  dayCellActive: { backgroundColor: COLORS.info },
  dayCellToday: { backgroundColor: COLORS.accent },
  dayText: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  dayTextActive: { color: '#fff' },
  dayTextToday: { color: COLORS.info },

  // ── Charts ────────────────────────────────────────────────────────────────
  chartsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  chartCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chartWrap: { flex: 1 },
  chartTitle: { fontSize: 12, fontWeight: '800', color: COLORS.text, marginBottom: 14 },

  // Simple bar chart styles (native fallback)
  chartBars: { flexDirection: 'row', height: 160, alignItems: 'flex-end', paddingBottom: 24 },
  barCol: { alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barVal: { fontSize: 8, fontWeight: '700', color: COLORS.gray, marginBottom: 2 },
  barTrack: { flex: 1, width: '60%', justifyContent: 'flex-end', maxHeight: 120 },
  barFill: { width: '100%', borderRadius: 4 },
  barName: { fontSize: 8, fontWeight: '700', color: COLORS.gray, marginTop: 4, textAlign: 'center' },

  // ── Summary bar ───────────────────────────────────────────────────────────
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    flexWrap: 'wrap',
    gap: 8,
  },
  summaryRow: { flex: 1, minWidth: 80, flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryDot: { width: 10, height: 10, borderRadius: 5 },
  summaryLabel: { flex: 1, fontSize: 12, fontWeight: '700', color: COLORS.text },
  summaryValue: { fontSize: 16, fontWeight: '900', color: COLORS.text },
  summaryDivider: { width: 1, height: 30, backgroundColor: '#F1F5F9' },
});
