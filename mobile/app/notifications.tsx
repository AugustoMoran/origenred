import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link, router } from 'expo-router';
import { getNotificationSummary } from '../src/api/marketplace';
import { useAuth } from '../src/context/AuthContext';
import { colors } from '../src/theme/colors';

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string;
  at: string;
  unread?: boolean;
  orderNumber?: string;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

const hrefToRoute = (href: string, orderNumber?: string) => {
  if (href.startsWith('/cuenta/chat/') && orderNumber) return `/chat/${orderNumber}`;
  if (href.startsWith('/cuenta/compras/') && orderNumber) return `/order/${orderNumber}`;
  if (href === '/cuenta/devoluciones') return '/returns';
  if (href === '/cuenta/mensajes') return '/chats';
  if (href === '/vendedor/devoluciones') return '/vendedor/devoluciones';
  if (href === '/vendedor/ventas') return '/vendedor/orders';
  return null;
};

export default function NotificationsScreen() {
  const { user, accessToken } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    getNotificationSummary(accessToken)
      .then((data) => setItems(data.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [accessToken]);

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Iniciá sesión para ver notificaciones</Text>
        <Link href="/login" asChild>
          <Pressable style={styles.cta}>
            <Text style={styles.ctaText}>Iniciar sesión</Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.blue} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Notificaciones</Text>

      {items.length === 0 ? (
        <Text style={styles.muted}>No hay notificaciones recientes</Text>
      ) : (
        items.map((item) => {
          const route = hrefToRoute(item.href, item.orderNumber);
          return (
            <Pressable
              key={item.id}
              style={[styles.card, item.unread && styles.cardUnread]}
              onPress={() => {
                if (route) router.push(route as any);
              }}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDate}>{formatDate(item.at)}</Text>
              </View>
              <Text style={styles.cardBody}>{item.body}</Text>
              {item.unread && <Text style={styles.badge}>Nuevo</Text>}
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 22, fontWeight: '800', color: colors.navy },
  muted: { color: colors.slate500, textAlign: 'center' },
  cta: {
    backgroundColor: colors.red,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  ctaText: { color: colors.white, fontWeight: '700' },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.slate100,
    gap: 6,
  },
  cardUnread: { borderColor: '#fecaca', backgroundColor: '#fef2f2' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  cardTitle: { fontWeight: '700', color: colors.navy, flex: 1 },
  cardDate: { fontSize: 11, color: colors.slate400 },
  cardBody: { fontSize: 14, color: colors.slate500 },
  badge: { fontSize: 10, fontWeight: '700', color: colors.red },
});
