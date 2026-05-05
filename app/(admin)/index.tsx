import { useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Animated,
  useWindowDimensions,
  Modal,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DashboardPage from './components/DashboardPage';
import OrdersPage from './components/OrdersPage';
import PricingPage from './components/PricingPage';
import Sidebar, { AdminTab } from './components/Sidebar';
import StaffPage from './components/StaffPage';
import TopHeader from './components/TopHeader';

const COLORS = {
  secondary: '#0F9D8A',
  danger: '#E53E3E',
  gray: '#718096',
  text: '#1B3A3A',
};

const PAGE_TITLES: Record<AdminTab, string> = {
  dashboard: 'Dashboard',
  orders: 'Orders',
  staff: 'Staff',
  pricing: 'Pricing',
};

const SIDEBAR_FULL = 220;
const SIDEBAR_MINI = 64;
const MOBILE_BREAKPOINT = 768;

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [logoutModal, setLogoutModal] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const isMobile = width < MOBILE_BREAKPOINT;

  // On mobile: sidebar is an overlay drawer (hidden by default)
  // On desktop: sidebar is always visible, can collapse to mini
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Animations
  const sidebarWidthAnim = useRef(new Animated.Value(isMobile ? SIDEBAR_FULL : sidebarCollapsed ? SIDEBAR_MINI : SIDEBAR_FULL)).current;
  const drawerAnim = useRef(new Animated.Value(-SIDEBAR_FULL)).current;

  useEffect(() => {
    if (!isMobile) {
      Animated.timing(sidebarWidthAnim, {
        toValue: sidebarCollapsed ? SIDEBAR_MINI : SIDEBAR_FULL,
        duration: 250,
        useNativeDriver: false,
      }).start();
    }
  }, [sidebarCollapsed, isMobile]);

  useEffect(() => {
    if (isMobile) {
      Animated.spring(drawerAnim, {
        toValue: drawerOpen ? 0 : -SIDEBAR_FULL,
        useNativeDriver: Platform.OS !== 'web',
        tension: 100,
        friction: 20,
      }).start();
    }
  }, [drawerOpen, isMobile]);

  const handleTabChange = (tab: AdminTab) => {
    setActiveTab(tab);
    if (isMobile) setDrawerOpen(false);
  };

  const handleLogout = () => setLogoutModal(true);

  const confirmLogout = async () => {
    setSigningOut(true);
    try {
      await signOut();
      router.replace('/home');
    } catch {
      setSigningOut(false);
      setLogoutModal(false);
    }
  };

  const sidebarWidth = useMemo(() => {
    return isMobile ? SIDEBAR_FULL : sidebarCollapsed ? SIDEBAR_MINI : SIDEBAR_FULL;
  }, [isMobile, sidebarCollapsed]);

  const CurrentPage = useMemo(() => {
    switch (activeTab) {
      case 'dashboard': return <DashboardPage />;
      case 'orders': return <OrdersPage />;
      case 'staff': return <StaffPage />;
      case 'pricing': return <PricingPage />;
    }
  }, [activeTab]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.layout}>

        {/* ── Desktop Sidebar ────────────────────────────────────────── */}
        {!isMobile && (
          <Animated.View style={{ width: sidebarWidthAnim }}>
            <Sidebar
              activeTab={activeTab}
              onTabChange={handleTabChange}
              onLogout={handleLogout}
              collapsed={sidebarCollapsed}
              onToggle={() => setSidebarCollapsed((c) => !c)}
            />
          </Animated.View>
        )}

        {/* ── Mobile Drawer Overlay ──────────────────────────────────── */}
        {isMobile && drawerOpen && (
          <TouchableOpacity
            style={styles.drawerOverlay}
            activeOpacity={1}
            onPress={() => setDrawerOpen(false)}
          />
        )}
        {isMobile && (
          <Animated.View style={[styles.mobileDrawer, { left: drawerAnim }]}>
            <Sidebar
              activeTab={activeTab}
              onTabChange={handleTabChange}
              onLogout={handleLogout}
              collapsed={false}
              onToggle={() => setDrawerOpen(false)}
            />
          </Animated.View>
        )}

        {/* ── Main Content ──────────────────────────────────────────── */}
        <View style={styles.main}>
          <TopHeader
            pageTitle={PAGE_TITLES[activeTab]}
            onMenuToggle={() => isMobile ? setDrawerOpen((o) => !o) : setSidebarCollapsed((c) => !c)}
            showMenuBtn={true}
            onLogout={handleLogout}
          />
          <View style={styles.pageContent}>
            {CurrentPage}
          </View>
        </View>
      </View>

      {/* ── Logout Confirmation Modal ──────────────────────────────── */}
      <Modal
        visible={logoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.logoutCard}>
            <View style={styles.logoutIconWrap}>
              <Text style={styles.logoutIcon}>👋</Text>
            </View>
            <Text style={styles.logoutTitle}>Confirm Logout</Text>
            <Text style={styles.logoutBody}>Are you sure you want to logout from the admin panel?</Text>
            <View style={styles.logoutBtns}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setLogoutModal(false)}
                disabled={signingOut}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={confirmLogout}
                disabled={signingOut}
              >
                <Text style={styles.confirmBtnText}>
                  {signingOut ? 'Logging out…' : 'Confirm Logout'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },

  layout: {
    flex: 1,
    flexDirection: 'row',
  },

  main: {
    flex: 1,
    flexDirection: 'column',
    overflow: 'hidden',
  },

  pageContent: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
  },

  // Mobile drawer
  mobileDrawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: SIDEBAR_FULL,
    zIndex: 999,
    elevation: 20,
  },
  drawerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 998,
  },

  // Logout modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    width: '88%',
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 20,
    gap: 12,
  },
  logoutIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  logoutIcon: { fontSize: 30 },
  logoutTitle: { fontSize: 20, fontWeight: '900', color: COLORS.text },
  logoutBody: { fontSize: 13, color: COLORS.gray, textAlign: 'center', lineHeight: 20 },
  logoutBtns: { flexDirection: 'row', gap: 12, width: '100%', marginTop: 8 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  confirmBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
  },
  confirmBtnText: { fontSize: 14, fontWeight: '900', color: '#fff' },
});
