import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { UnreadNotificationsContext } from '@/app/context/UnreadNotificationsContext';
import { registerForPushNotifications } from '@/lib/registerForPushNotifications';
import { supabase } from '@/supabaseClient';

const IOS_BLUE = '#007AFF';
const INACTIVE_GRAY = '#8E8E93';

export default function TabLayout() {
  const [unreadCount, setUnreadCount] = useState(0);

  // 🔔 Register push notifications ONCE at app start
  useEffect(() => {
    registerForPushNotifications();
  }, []);

  // 🔴 Compute unread count (notifications NOT read by this user)
  const refreshUnreadCount = useCallback(async () => {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;

    if (!user) {
      setUnreadCount(0);
      return;
    }

    // 1️⃣ Get all notification IDs
    const { data: notifRows, error: notifErr } = await supabase
      .from('notifications')
      .select('id');

    if (notifErr || !notifRows || notifRows.length === 0) {
      setUnreadCount(0);
      return;
    }

    const notifIds = notifRows.map(r => r.id);

    // 2️⃣ Get read notifications for this user
    const { data: readRows, error: readErr } = await supabase
      .from('notification_reads')
      .select('notification_id')
      .eq('user_id', user.id);

    if (readErr) {
      // worst case: assume all unread
      setUnreadCount(notifIds.length);
      return;
    }

    const readSet = new Set((readRows ?? []).map(r => r.notification_id));
    const unread = notifIds.filter(id => !readSet.has(id)).length;

    setUnreadCount(unread);
  }, []);

  // Load badge count on app start
  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  const ctxValue = useMemo(
    () => ({ unreadCount, refreshUnreadCount }),
    [unreadCount, refreshUnreadCount]
  );

  return (
    <UnreadNotificationsContext.Provider value={ctxValue}>
      <Tabs
        screenOptions={{
          headerShown: false, // 🚨 Root layout owns header now
          tabBarActiveTintColor: IOS_BLUE,
          tabBarInactiveTintColor: INACTIVE_GRAY,
        }}
      >
        {/* 🚤 Launches */}
        <Tabs.Screen
          name="index"
          options={{
            title: 'Launch',
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

        {/* 📸 Report AIS */}
        <Tabs.Screen
          name="report"
          options={{
            title: 'Report',
            tabBarIcon: ({ color }) => (
              <FontAwesome name="camera" size={26} color={color} />
            ),
          }}
        />

        {/* 🔔 Alerts */}
        <Tabs.Screen
          name="notifications"
          options={{
            title: 'Alerts',
            tabBarIcon: ({ color }) => (
              <FontAwesome name="bell" size={26} color={color} />
            ),
            tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
            tabBarBadgeStyle: {
              backgroundColor: '#FF3B30',
              color: '#FFFFFF',
              fontSize: 12,
              fontWeight: '700',
              minWidth: 18,
              height: 18,
              lineHeight: 18,
            },
          }}
        />
      </Tabs>
    </UnreadNotificationsContext.Provider>
  );
}
