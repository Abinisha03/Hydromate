import { api } from '@/convex/_generated/api';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
  // Dynamic import for web only
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

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function DashboardPage() {
  const orders = useQuery(api.orders.getAllOrders);
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear] = useState(now.getFullYear());

  // Build list of last 6 months for the filter
  const monthOptions = useMemo(() => {
    const opts = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(selectedYear, now.getMonth() - i, 1);
      opts.push({ month: d.getMonth(), year: d.getFullYear(), label: MONTH_NAMES[d.getMonth()] });
    }
    return opts;
  }, [selectedYear]);

  const stats = useMemo(() => {
    if (!orders) return null;
    const nowTs = Date.now();
    const DAY = 86400000;

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyData: { name: string; value: number }[] = [];

    // Build last-7-days buckets
    for (let i = 6; i >= 0; i--) {
      const d = new Date(nowTs - i * DAY);
      weeklyData.push({ name: dayNames[d.getDay()], value: 0 });
    }
    orders.forEach((o) => {
      const age = nowTs - o._creationTime;
      if (age <= 7 * DAY) {
        const dayIdx = Math.floor(age / DAY);
        const bucketIdx = 6 - dayIdx;
        if (bucketIdx >= 0 && bucketIdx < 7) weeklyData[bucketIdx].value += 1;
      }
    });

    // Build 4-week buckets for selected month
    const monthStart = new Date(selectedYear, selectedMonth, 1).getTime();
    const monthEnd = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999).getTime();
    const monthlyData: { name: string; value: number }[] = [
      { name: 'W1', value: 0 },
      { name: 'W2', value: 0 },
      { name: 'W3', value: 0 },
      { name: 'W4', value: 0 },
    ];
    orders.forEach((o) => {
      const t = o._creationTime;
      if (t >= monthStart && t <= monthEnd) {
        const dayOfMonth = new Date(t).getDate(); // 1–31
        const weekIdx = Math.min(3, Math.floor((dayOfMonth - 1) / 7)); // 0–3
        monthlyData[weekIdx].value += 1;
      }
    });

    const weeklyOrders = weeklyData.reduce((s, d) => s + d.value, 0);
    const monthlyOrders = orders.filter((o) => o._creationTime >= monthStart && o._creationTime <= monthEnd).length;
    const revenue = orders.filter((o) => o.status === 'Delivered').reduce((s, o) => s + o.totalAmount, 0);

    return { total: orders.length, weeklyOrders, monthlyOrders, revenue, weeklyData, monthlyData };
  }, [orders, selectedMonth, selectedYear]);

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
        <KpiCard icon="date-range" label="Weekly Orders" value={stats.weeklyOrders} color={COLORS.info} sub="Last 7 days" />
        <KpiCard icon="calendar-today" label="Monthly Orders" value={stats.monthlyOrders} color={COLORS.warning} sub={MONTH_NAMES[selectedMonth]} />
        <KpiCard icon="currency-rupee" label="Revenue" value={`₹${stats.revenue.toLocaleString()}`} color={COLORS.success} sub="Delivered orders" />
      </View>

      {/* Charts Row */}
      <View style={styles.chartsRow}>
        <View style={styles.chartCard}>
          <ChartComponent data={stats.weeklyData} color={COLORS.secondary} label="Weekly Orders (Last 7 Days)" />
        </View>
        <View style={styles.chartCard}>
          {/* Month Filter Tabs */}
          <View style={styles.monthFilterRow}>
            {monthOptions.map((opt) => (
              <TouchableOpacity
                key={`${opt.year}-${opt.month}`}
                style={[
                  styles.monthTab,
                  selectedMonth === opt.month && selectedYear === opt.year && styles.monthTabActive,
                ]}
                onPress={() => setSelectedMonth(opt.month)}
              >
                <Text
                  style={[
                    styles.monthTabText,
                    selectedMonth === opt.month && styles.monthTabTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <ChartComponent
            data={stats.monthlyData}
            color={COLORS.info}
            label={`Monthly Orders — ${MONTH_NAMES[selectedMonth]} (4 Weeks)`}
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

  monthFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  monthTab: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  monthTabActive: {
    backgroundColor: COLORS.info,
    borderColor: COLORS.info,
  },
  monthTabText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.gray,
  },
  monthTabTextActive: {
    color: '#fff',
  },

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
