import { UnreadNotificationsContext } from '@/app/context/UnreadNotificationsContext';
import { supabase } from '@/supabaseClient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect } from '@react-navigation/native';
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
};

/* ---------------- SCREEN ---------------- */

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
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
      .from('notifications')
      .select('id, title, body, created_at')
      .order('created_at', { ascending: false });

    if (notifError || !notifData) {
      console.error('❌ failed to load notifications:', notifError);
      setNotifications([]);
      setLoading(false);
      return;
    }

    setNotifications(notifData);

    // If user is not logged in, skip read tracking
    if (!user) {
      console.warn('⚠️ no user — showing notifications read-only');
      setLoading(false);
      return;
    }

    const { data: readData, error: readError } = await supabase
      .from('notification_reads')
      .select('notification_id')
      .eq('user_id', user.id);

    if (readError) {
      console.error('❌ failed to load read state:', readError);
    }

    setReadIds(new Set((readData ?? []).map(r => r.notification_id)));

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

  const unreadCount = useMemo(
    () => notifications.filter(n => !readIds.has(n.id)).length,
    [notifications, readIds]
  );

  /* ---------- MARK AS READ ---------- */

  const markAsRead = useCallback(
    async (notificationId: string) => {
      // Already read → no-op
      if (readIds.has(notificationId)) return;

      // Optimistic UI
      setReadIds(prev => new Set(prev).add(notificationId));

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        console.warn('⚠️ not logged in — skipping DB write');
        return;
      }

      const { error } = await supabase
        .from('notification_reads')
        .upsert(
          {
            notification_id: notificationId,
            user_id: user.id,
          },
          { onConflict: 'notification_id,user_id' }
        );

      if (error) {
        console.error('❌ notification_reads upsert failed:', error);
      } else {
        console.log('✅ notification marked as read:', notificationId);
      }

      refreshUnreadCount();
    },
    [readIds, refreshUnreadCount]
  );

  /* ---------- RENDER ---------- */

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {(unreadCount > 0 || notifications.length > 0) && (
        <View style={styles.topBar}>
          {unreadCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          ) : (
            <View />
          )}
        </View>
      )}

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
          const isRead = readIds.has(item.id);

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
