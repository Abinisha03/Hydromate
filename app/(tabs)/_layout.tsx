import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, Text } from 'react-native';
import { HapticTab } from '@/components/haptic-tab';
import { MaterialIcons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2EC4B6', // Mint Teal
        tabBarInactiveTintColor: '#1B3A3A', // Dark Teal text
        tabBarStyle: {
          backgroundColor: '#E8FFF9', // Soft Accent
          height: Platform.OS === 'ios' ? 88 : 75,
          paddingBottom: Platform.OS === 'ios' ? 30 : 15,
          paddingTop: 10,
          borderTopWidth: 0,
          elevation: 8,
          shadowColor: '#0F9D8A',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <MaterialIcons name="water-drop" size={28} color={color} />,
          tabBarLabel: ({ color }) => <Text style={{ color, fontSize: 12, fontWeight: 'bold' }}>Home</Text>
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => <MaterialIcons name="history" size={28} color={color} />,
          tabBarLabel: ({ color }) => <Text style={{ color, fontSize: 12, fontWeight: 'bold' }}>History</Text>
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <MaterialIcons name="person" size={28} color={color} />,
          tabBarLabel: ({ color }) => <Text style={{ color, fontSize: 12, fontWeight: 'bold' }}>Profile</Text>
        }}
      />
    </Tabs>
  );
}
