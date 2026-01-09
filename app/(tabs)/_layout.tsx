import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

/* ---------------- COLORS ---------------- */

const IOS_BLUE = '#007AFF';
const INACTIVE_GRAY = '#8E8E93';

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
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerTitle: () => <HeaderTitle />,
        headerTitleAlign: 'center',

        /* 🎯 TAB COLORS */
        tabBarActiveTintColor: IOS_BLUE,
        tabBarInactiveTintColor: INACTIVE_GRAY,

        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#E5E5EA',
        },
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

      {/* ℹ️ CDD */}
      <Tabs.Screen
        name="clean-drain-dry"
        options={{
          title: 'CDD',
          tabBarIcon: ({ color }) => (
            <FontAwesome name="info-circle" size={26} color={color} />
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
    marginRight: -4,
  },

  logo: {
    width: 30,
    height: 30,
    marginTop: 4,
  },
});
