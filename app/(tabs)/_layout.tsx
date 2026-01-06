import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

/* ---------- HEADER TITLE ---------- */

function HeaderTitle() {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>LaunchNB</Text>
      <Image
        source={require('@/assets/nb-pin.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

/* ---------- TABS ---------- */

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,

        // show header
        headerShown: true,

        // custom header
        headerTitle: () => <HeaderTitle />,
        headerTitleAlign: 'center',
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

/* ---------- STYLES ---------- */

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginRight: -4, // 👈 controls distance to pin
  },

  logo: {
    width: 30,   // slightly smaller = tighter
    height: 30,
    marginTop: 4, // optical alignment tweak
  },
});

