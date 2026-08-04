import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { getMyOrders } from '../../src/api/marketplace';
import { useAuth } from '../../src/context/AuthContext';
import { colors } from '../../src/theme/colors';

const STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Pendiente de pago',
  paid: 'Pagado',
  processing: 'En preparación',
  shipped: 'Enviado',
  delivered: 'Entregado',
};

const format = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

export default function OrdersScreen() {
  const { user, accessToken } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const data = await getMyOrders(accessToken);
      setOrders(data as any[]);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Iniciá sesión para ver tus compras</Text>
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
      {orders.length === 0 ? (
        <Text style={styles.muted}>Todavía no hiciste compras</Text>
      ) : (
        orders.map((order) => (
          <View key={order._id} style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.orderNumber}>{order.orderNumber}</Text>
              <Text style={styles.total}>{format(order.total)}</Text>
            </View>
            <Text style={styles.status}>
              {STATUS_LABELS[order.status] || order.status}
            </Text>
            {order.trackingCode && (
              <Text style={styles.tracking}>Tracking: {order.trackingCode}</Text>
            )}
            {order.chatEnabled && order.status !== 'pending_payment' && (
              <Link href={`/chat/${order.orderNumber}`} asChild>
                <Pressable>
                  <Text style={styles.chatLink}>💬 Chatear con vendedor</Text>
                </Pressable>
              </Link>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
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
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate100,
    gap: 4,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  orderNumber: { fontWeight: '700', color: colors.navy },
  total: { fontWeight: '700', color: colors.navy },
  status: { fontSize: 13, color: colors.slate600 },
  tracking: { fontSize: 12, color: colors.slate500, fontFamily: 'monospace' },
  chatLink: { fontSize: 13, color: colors.blue, fontWeight: '600', marginTop: 4 },
});
