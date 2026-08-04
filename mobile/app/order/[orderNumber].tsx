import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { getOrder, MarketplaceOrder } from '../../src/api/marketplace';
import { useAuth } from '../../src/context/AuthContext';
import { colors } from '../../src/theme/colors';

const STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Pendiente de pago',
  paid: 'Pagado',
  processing: 'En preparación',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
};

const FULFILLMENT_LABELS: Record<string, string> = {
  processing: 'En preparación',
  shipped: 'Enviado',
  delivered: 'Entregado',
};

const format = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

export default function OrderDetailScreen() {
  const { orderNumber } = useLocalSearchParams<{ orderNumber: string }>();
  const { accessToken } = useAuth();
  const [order, setOrder] = useState<MarketplaceOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orderNumber) return;
    getOrder(orderNumber, accessToken)
      .then(setOrder)
      .catch((e) => setError(e.message || 'Pedido no encontrado'))
      .finally(() => setLoading(false));
  }, [orderNumber, accessToken]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.blue} />
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{error || 'Pedido no encontrado'}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.orderNumber}>{order.orderNumber}</Text>
        <Text style={styles.statusBadge}>
          {STATUS_LABELS[order.status] || order.status}
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Total</Text>
          <Text style={styles.total}>{format(order.total)}</Text>
        </View>

        {order.shippingAddress && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Envío a</Text>
            <Text style={styles.text}>{order.shippingAddress.fullName}</Text>
            <Text style={styles.text}>{order.shippingAddress.street}</Text>
            <Text style={styles.text}>
              {order.shippingAddress.city}, {order.shippingAddress.province} ({order.shippingAddress.postalCode})
            </Text>
            <Text style={styles.text}>{order.shippingAddress.phone}</Text>
          </View>
        )}

        {order.trackingCode && (
          <Text style={styles.text}>
            Seguimiento: <Text style={styles.mono}>{order.trackingCode}</Text>
          </Text>
        )}

        {order.shippingBySeller && order.shippingBySeller.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Estado por vendedor</Text>
            {order.shippingBySeller.map((s) => (
              <View key={String(s.seller)} style={styles.fulfillmentRow}>
                <Text style={styles.text}>{s.sellerName || 'Vendedor'}</Text>
                <Text style={styles.textMuted}>
                  {FULFILLMENT_LABELS[s.status] || s.status}
                  {s.trackingCode ? ` · ${s.trackingCode}` : ''}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Productos</Text>
          {order.items?.map((item) => (
            <View key={item.listing} style={styles.itemRow}>
              <Text style={styles.text}>{item.title} ×{item.quantity}</Text>
              <Text style={styles.text}>{format(item.subtotal)}</Text>
            </View>
          ))}
        </View>

        {order.chatEnabled && order.status !== 'pending_payment' && (
          <Link href={`/chat/${order.orderNumber}`} asChild>
            <Pressable>
              <Text style={styles.chatLink}>💬 Chatear con el vendedor</Text>
            </Pressable>
          </Link>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  muted: { color: colors.slate500, textAlign: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderNumber: { fontSize: 20, fontWeight: '800', color: colors.navy },
  statusBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.slate600,
    backgroundColor: colors.slate100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate100,
    gap: 12,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 16, fontWeight: '700', color: colors.navy },
  total: { fontSize: 18, fontWeight: '800', color: colors.navy },
  section: { gap: 4, borderTopWidth: 1, borderTopColor: colors.slate100, paddingTop: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.navy, marginBottom: 4 },
  text: { fontSize: 14, color: colors.slate600 },
  textMuted: { fontSize: 13, color: colors.slate500 },
  mono: { fontFamily: 'monospace' },
  fulfillmentRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  chatLink: { fontSize: 14, color: colors.red, fontWeight: '600' },
});
