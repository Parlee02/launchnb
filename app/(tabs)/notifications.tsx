import { UnreadNotificationsContext } from '@/app/context/UnreadNotificationsContext';
import { supabase } from '@/supabaseClient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect } from '@react-navigation/native';
import {
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/* ---------------- TYPES ---------------- */

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  is_read: boolean;
};

/* ---------------- SCREEN ---------------- */

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const { refreshUnreadCount } = useContext(UnreadNotificationsContext);

  /* ---------- LOAD NOTIFICATIONS ---------- */

  const loadNotifications = useCallback(async () => {
    setLoading(true);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error('❌ auth error:', authError);
    }

    const { data: notifData, error: notifError } = await supabase
      .from('notifications_with_read')
      .select('id, title, body, created_at, is_read')
      .order('created_at', { ascending: false });

    if (notifError || !notifData) {
      console.error('❌ failed to load notifications:', notifError);
      setNotifications([]);
      setLoading(false);
      return;
    }

    setNotifications(notifData);
    setLoading(false);
  }, []);

  /* ---------- LOAD ON MOUNT ---------- */

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  /* ---------- REFRESH BADGE ON FOCUS ---------- */

  useFocusEffect(
    useCallback(() => {
      refreshUnreadCount();
    }, [refreshUnreadCount])
  );

  /* ---------- UNREAD COUNT ---------- */

  const unreadCount = notifications.filter(n => !n.is_read).length;

  /* ---------- MARK AS READ (SMOOTH UX) ---------- */

  const markAsRead = useCallback(
    async (notificationId: string) => {
      const alreadyRead = notifications.find(
        n => n.id === notificationId
      )?.is_read;

      if (alreadyRead) return;

      // 🔥 Optimistic UI (instant, smooth)
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) return;

      await supabase
        .from('notification_reads')
        .upsert(
          {
            notification_id: notificationId,
            user_id: user.id,
          },
          { onConflict: 'notification_id,user_id' }
        );

      refreshUnreadCount();
      // No reload → avoids snap
    },
    [notifications, refreshUnreadCount]
  );

  /* ---------- RENDER ---------- */

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
   <SafeAreaView style={styles.container} edges={[]}>

      {!notifications.length && (
        <View style={styles.center}>
          <Text style={styles.empty}>No alerts yet</Text>
        </View>
      )}

      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const isRead = item.is_read;

          return (
            <Pressable
              style={[styles.card, !isRead && styles.unreadCard]}
              onPress={() => markAsRead(item.id)}
            >
              <View style={styles.cardHeader}>
                {!isRead && <View style={styles.dot} />}
                <Text style={styles.title}>{item.title}</Text>
              </View>

              <Text style={styles.body}>{item.body}</Text>

              <View style={styles.footer}>
                <FontAwesome name="clock-o" size={12} color="#8E8E93" />
                <Text style={styles.time}>
                  {new Date(item.created_at).toLocaleString()}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    fontSize: 16,
    color: '#8E8E93',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  badge: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  list: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 20,
  },
  card: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#F2F2F7',
    marginBottom: 14,
  },
  unreadCard: {
    backgroundColor: '#EEF4FF',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  body: {
    fontSize: 14,
    color: '#3C3C43',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  time: {
    fontSize: 12,
    color: '#8E8E93',
  },
});
