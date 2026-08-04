import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { getSellerOrders, updateSellerOrder } from '../../src/api/marketplace';
import { useAuth } from '../../src/context/AuthContext';
import { colors } from '../../src/theme/colors';

const STATUS_LABELS: Record<string, string> = {
  paid: 'Pagado',
  processing: 'En preparación',
  shipped: 'Enviado',
  delivered: 'Entregado',
};

const format = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

export default function SellerOrdersScreen() {
  const { accessToken } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const data = await getSellerOrders(accessToken);
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

  const markShipped = async (orderNumber: string) => {
    if (!accessToken) return;
    await updateSellerOrder(
      orderNumber,
      { status: 'shipped', trackingCode: tracking[orderNumber] },
      accessToken
    );
    load();
  };

  const markDelivered = async (orderNumber: string) => {
    if (!accessToken) return;
    await updateSellerOrder(orderNumber, { status: 'delivered' }, accessToken);
    load();
  };

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
        <Text style={styles.muted}>Sin ventas todavía</Text>
      ) : (
        orders.map((order) => {
          const fulfillment = order.shippingBySeller?.[0];
          const fulfillmentStatus = fulfillment?.status || 'processing';

          return (
            <View key={order._id} style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                <Text style={styles.total}>{format(order.total)}</Text>
              </View>
              <Text style={styles.status}>
                {STATUS_LABELS[fulfillmentStatus] || STATUS_LABELS[order.status] || order.status}
              </Text>

              {fulfillmentStatus === 'processing' && (
                <View style={styles.actionRow}>
                  <TextInput
                    style={styles.input}
                    placeholder="Tracking (opcional)"
                    value={tracking[order.orderNumber] || ''}
                    onChangeText={(v) =>
                      setTracking((prev) => ({ ...prev, [order.orderNumber]: v }))
                    }
                  />
                  <Pressable style={styles.shipBtn} onPress={() => markShipped(order.orderNumber)}>
                    <Text style={styles.shipBtnText}>Enviado</Text>
                  </Pressable>
                </View>
              )}

              {fulfillmentStatus === 'shipped' && (
                <Pressable onPress={() => markDelivered(order.orderNumber)}>
                  <Text style={styles.link}>Marcar entregado</Text>
                </Pressable>
              )}

              {order.chatEnabled && (
                <Link href={`/chat/${order.orderNumber}`} asChild>
                  <Pressable>
                    <Text style={styles.link}>💬 Chat con comprador</Text>
                  </Pressable>
                </Link>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: colors.slate500, textAlign: 'center' },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.slate100,
    gap: 6,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  orderNumber: { fontWeight: '700', color: colors.navy },
  total: { fontWeight: '700', color: colors.navy },
  status: { fontSize: 13, color: colors.slate600 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  input: {
    flex: 1,
    backgroundColor: colors.slate50,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  shipBtn: {
    backgroundColor: colors.blue,
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  shipBtnText: { color: colors.white, fontWeight: '600', fontSize: 13 },
  link: { color: colors.blue, fontSize: 13, fontWeight: '600' },
});
