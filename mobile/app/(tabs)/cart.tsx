import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import { useCart } from '../../src/context/CartContext';
import { colors } from '../../src/theme/colors';

const format = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

export default function CartScreen() {
  const { items, subtotal, updateQuantity, removeItem } = useCart();

  if (items.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Tu carrito está vacío</Text>
        <Link href="/search" asChild>
          <Pressable style={styles.cta}>
            <Text style={styles.ctaText}>Explorar productos</Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.list}>
        {items.map((item) => (
          <View key={item.listingId} style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
              <Pressable onPress={() => removeItem(item.listingId)}>
                <Text style={styles.remove}>✕</Text>
              </Pressable>
            </View>
            <Text style={styles.price}>{format(item.price)}</Text>
            <View style={styles.qtyRow}>
              <Pressable
                style={styles.qtyBtn}
                onPress={() => updateQuantity(item.listingId, item.quantity - 1)}
              >
                <Text style={styles.qtyBtnText}>−</Text>
              </Pressable>
              <Text style={styles.qty}>{item.quantity}</Text>
              <Pressable
                style={styles.qtyBtn}
                onPress={() => updateQuantity(item.listingId, item.quantity + 1)}
              >
                <Text style={styles.qtyBtnText}>+</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.totalLabel}>Subtotal</Text>
        <Text style={styles.total}>{format(subtotal)}</Text>
        <Pressable style={styles.checkoutBtn} onPress={() => router.push('/checkout')}>
          <Text style={styles.checkoutText}>Ir al checkout</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  muted: { color: colors.slate500 },
  cta: {
    backgroundColor: colors.red,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  ctaText: { color: colors.white, fontWeight: '700' },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.slate100,
    gap: 8,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  title: { flex: 1, fontWeight: '600', color: colors.navy },
  remove: { color: colors.slate400, fontSize: 18 },
  price: { fontWeight: '700', color: colors.navy },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 18, fontWeight: '700', color: colors.navy },
  qty: { fontWeight: '600', minWidth: 24, textAlign: 'center' },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.slate200,
    backgroundColor: colors.white,
    gap: 8,
  },
  totalLabel: { color: colors.slate500, fontSize: 13 },
  total: { fontSize: 22, fontWeight: '800', color: colors.navy },
  checkoutBtn: {
    backgroundColor: colors.red,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  checkoutText: { color: colors.white, fontWeight: '700', fontSize: 16 },
});
