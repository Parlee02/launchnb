import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import React from 'react';

import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: useClientOnlyValue(false, true),
      }}
    >
      {/* 🚤 Launches */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Launches',
          tabBarIcon: ({ color }) => (
            <FontAwesome name="ship" size={26} color={color} />
          ),
        }}
      />

      {/* 🔁 Flows */}
      <Tabs.Screen
        name="flows"
        options={{
          title: 'Flows',
          tabBarIcon: ({ color }) => (
            <FontAwesome name="exchange" size={26} color={color} />
          ),
        }}
      />

      {/* 🧼 Decon */}
      <Tabs.Screen
        name="decon"
        options={{
          title: 'Decon',
          tabBarIcon: ({ color }) => (
            <FontAwesome name="tint" size={26} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
