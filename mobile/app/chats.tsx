import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { getMyConversations } from '../src/api/marketplace';
import { useAuth } from '../src/context/AuthContext';
import { colors } from '../src/theme/colors';

const format = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

export default function ChatsScreen() {
  const { accessToken } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    getMyConversations(accessToken)
      .then(setConversations)
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
  }, [accessToken]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.blue} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Mis mensajes</Text>
      {conversations.length === 0 ? (
        <Text style={styles.muted}>No hay conversaciones activas todavía.</Text>
      ) : (
        conversations.map((conv) => {
          const orderNumber = conv.order?.orderNumber;
          const label =
            conv.seller?.businessName || conv.buyer?.name || `Pedido ${orderNumber}`;
          const unread = conv.unreadCount || 0;
          return (
            <Pressable
              key={conv._id}
              style={styles.card}
              onPress={() => orderNumber && router.push(`/chat/${orderNumber}`)}
            >
              <View style={styles.cardRow}>
                <View style={styles.flex}>
                  <Text style={styles.cardTitle}>{label}</Text>
                  <Text style={styles.cardSub}>
                    {orderNumber} · {format(conv.order?.total || 0)}
                  </Text>
                </View>
                {unread > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: colors.navy, marginBottom: 8 },
  muted: { color: colors.slate500, fontSize: 14 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate100,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
  cardTitle: { fontWeight: '700', color: colors.navy, fontSize: 15 },
  cardSub: { color: colors.slate500, fontSize: 12, marginTop: 2 },
  badge: {
    backgroundColor: colors.red,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: '700' },
});
