import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type AdminTab = 'dashboard' | 'orders' | 'staff' | 'pricing';

interface SidebarProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  onLogout: () => void;
  collapsed: boolean;
  onToggle: () => void;
}

const NAV_ITEMS: { id: AdminTab; icon: string; label: string }[] = [
  { id: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
  { id: 'orders', icon: 'receipt-long', label: 'Orders' },
  { id: 'staff', icon: 'badge', label: 'Staff' },
  { id: 'pricing', icon: 'payments', label: 'Pricing' },
];

export default function Sidebar({ activeTab, onTabChange, onLogout, collapsed, onToggle }: SidebarProps) {
  const isWeb = Platform.OS === 'web';

  return (
    <View style={[styles.sidebar, { width: '100%' }]}>
      {/* Logo */}
      <View style={styles.logoArea}>
        <TouchableOpacity onPress={onToggle} style={styles.hamburger}>
          <MaterialIcons name="menu" size={22} color="#fff" />
        </TouchableOpacity>
        {!collapsed && (
          <View style={styles.brandWrap}>
            <FontAwesome5 name="tint" size={14} color="#fff" />
            <Text style={styles.brandName}>HydroMate</Text>
          </View>
        )}
      </View>

      {!collapsed && <Text style={styles.panelLabel}>ADMIN PANEL</Text>}

      <View style={styles.divider} />

      {/* Nav Items */}
      <View style={styles.navList}>
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.navItem, isActive && styles.navItemActive, collapsed && styles.navItemCollapsed]}
              onPress={() => onTabChange(item.id)}
            >
              <MaterialIcons
                name={item.icon as any}
                size={20}
                color={isActive ? '#fff' : 'rgba(255,255,255,0.6)'}
              />
              {!collapsed && (
                <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                  {item.label}
                </Text>
              )}
              {isActive && !collapsed && <View style={styles.activePill} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Logout */}
      <View style={styles.bottomArea}>
        <View style={styles.divider} />
        <TouchableOpacity
          style={[styles.logoutBtn, collapsed && styles.navItemCollapsed]}
          onPress={onLogout}
        >
          <MaterialIcons name="logout" size={20} color="rgba(255,100,100,0.9)" />
          {!collapsed && <Text style={styles.logoutText}>Logout</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    backgroundColor: '#0F9D8A',
    height: '100%',
    paddingTop: 16,
    paddingBottom: 16,
    overflow: 'hidden',
    borderRightWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  logoArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 4,
    gap: 10,
  },
  hamburger: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
  },
  panelLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    paddingHorizontal: 18,
    marginBottom: 8,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginHorizontal: 14,
    marginVertical: 8,
  },
  navList: {
    flex: 1,
    paddingHorizontal: 8,
    gap: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 10,
    position: 'relative',
  },
  navItemCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  navItemActive: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  navLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.65)',
  },
  navLabelActive: {
    color: '#fff',
    fontWeight: '900',
  },
  activePill: {
    position: 'absolute',
    right: 0,
    width: 3,
    height: 22,
    borderRadius: 2,
    backgroundColor: '#fff',
  },
  bottomArea: {
    paddingHorizontal: 8,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 10,
    marginTop: 4,
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,100,100,0.9)',
  },
});
