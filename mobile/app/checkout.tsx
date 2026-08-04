import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { createCheckout, previewCheckout } from '../../src/api/marketplace';
import { useAuth } from '../../src/context/AuthContext';
import { useCart } from '../../src/context/CartContext';
import { colors } from '../../src/theme/colors';

const format = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

export default function CheckoutScreen() {
  const { items, clearCart, subtotal } = useCart();
  const { user, accessToken } = useAuth();

  const [form, setForm] = useState({
    fullName: user?.name || '',
    email: user?.email || '',
    phone: '',
    street: '',
    city: '',
    province: '',
    postalCode: '',
    notes: '',
  });
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof previewCheckout>> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shippingMethod, setShippingMethod] = useState<'delivery' | 'pickup'>('delivery');

  useEffect(() => {
    if (items.length === 0) {
      router.replace('/cart');
    }
  }, [items.length]);

  useEffect(() => {
    if (shippingMethod === 'pickup' || form.postalCode.length < 4 || items.length === 0) {
      if (shippingMethod === 'pickup' && items.length > 0) {
        previewCheckout(
          {
            items: items.map((i) => ({ listingId: i.listingId, quantity: i.quantity })),
            shippingMethod: 'pickup',
          },
          accessToken
        )
          .then(setPreview)
          .catch(() => setPreview(null));
      }
      return;
    }
    previewCheckout(
      {
        items: items.map((i) => ({ listingId: i.listingId, quantity: i.quantity })),
        postalCode: form.postalCode,
        province: form.province,
        shippingMethod,
      },
      accessToken
    )
      .then(setPreview)
      .catch(() => setPreview(null));
  }, [form.postalCode, form.province, shippingMethod, items, accessToken]);

  const handleSubmit = async () => {
    setError('');
    if (!form.fullName || !form.phone) {
      setError('Completá nombre y teléfono');
      return;
    }
    if (shippingMethod === 'delivery') {
      if (!form.street || !form.city || !form.province || !form.postalCode) {
        setError('Completá todos los datos de envío');
        return;
      }
    }
    if (!user && !form.email) {
      setError('Ingresá tu email o iniciá sesión');
      return;
    }

    setLoading(true);
    try {
      const result = await createCheckout(
        {
          items: items.map((i) => ({ listingId: i.listingId, quantity: i.quantity })),
          guestEmail: user ? undefined : form.email,
          guestName: form.fullName,
          guestPhone: form.phone,
          shippingAddress: {
            fullName: form.fullName,
            phone: form.phone,
            street: shippingMethod === 'pickup' ? 'Retiro en persona' : form.street,
            city: shippingMethod === 'pickup' ? form.city || 'Retiro' : form.city,
            province: shippingMethod === 'pickup' ? form.province || '—' : form.province,
            postalCode: shippingMethod === 'pickup' ? form.postalCode || '0000' : form.postalCode,
            notes: form.notes,
          },
          shippingMethod,
        },
        accessToken
      );

      clearCart();

      const payUrl = result.payment?.initPoint || result.payment?.sandboxInitPoint;
      if (payUrl) {
        await Linking.openURL(payUrl);
        Alert.alert(
          'Pedido creado',
          `Pedido ${result.order.orderNumber}. Completa el pago en Mercado Pago.`,
          [
            { text: 'Ver pedido', onPress: () => router.replace(`/order/${result.order.orderNumber}`) },
            { text: 'Mis compras', onPress: () => router.replace('/orders') },
          ]
        );
        return;
      }

      Alert.alert('Pedido confirmado', `Pedido ${result.order.orderNumber} registrado.`, [
        { text: 'Ver pedido', onPress: () => router.replace(`/order/${result.order.orderNumber}`) },
        { text: 'OK', onPress: () => router.replace('/orders') },
      ]);
    } catch (e: any) {
      setError(e.message || 'Error al procesar el pedido');
    } finally {
      setLoading(false);
    }
  };

  const total = preview?.total ?? subtotal;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.section}>Datos de envío</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Nombre completo"
          value={form.fullName}
          onChangeText={(v) => setForm((f) => ({ ...f, fullName: v }))}
        />
        {!user && (
          <TextInput
            style={styles.input}
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={form.email}
            onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
          />
        )}
        <TextInput
          style={styles.input}
          placeholder="Teléfono"
          keyboardType="phone-pad"
          value={form.phone}
          onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))}
        />
        <TextInput
          style={styles.input}
          placeholder="Calle y número"
          value={form.street}
          onChangeText={(v) => setForm((f) => ({ ...f, street: v }))}
        />
        <TextInput
          style={styles.input}
          placeholder="Ciudad"
          value={form.city}
          onChangeText={(v) => setForm((f) => ({ ...f, city: v }))}
        />
        <TextInput
          style={styles.input}
          placeholder="Provincia"
          value={form.province}
          onChangeText={(v) => setForm((f) => ({ ...f, province: v }))}
        />
        <TextInput
          style={styles.input}
          placeholder="Código postal"
          value={form.postalCode}
          onChangeText={(v) => setForm((f) => ({ ...f, postalCode: v }))}
        />

        <View style={styles.methodRow}>
          <Pressable
            style={[styles.methodBtn, shippingMethod === 'delivery' && styles.methodBtnActive]}
            onPress={() => setShippingMethod('delivery')}
          >
            <Text style={[styles.methodText, shippingMethod === 'delivery' && styles.methodTextActive]}>
              Envío
            </Text>
          </Pressable>
          <Pressable
            style={[styles.methodBtn, shippingMethod === 'pickup' && styles.methodBtnActive]}
            onPress={() => setShippingMethod('pickup')}
          >
            <Text style={[styles.methodText, shippingMethod === 'pickup' && styles.methodTextActive]}>
              Retiro
            </Text>
          </Pressable>
        </View>

        <View style={styles.summary}>
          <Text style={styles.summaryRow}>
            Subtotal: {format(preview?.subtotal ?? subtotal)}
          </Text>
          {preview && (
            <>
              <Text style={styles.summaryRow}>Envío: {format(preview.shippingTotal)}</Text>
              <Text style={styles.summaryRow}>
                Comisión: {format(preview.commissionTotal)}
              </Text>
            </>
          )}
          <Text style={styles.total}>Total: {format(total)}</Text>
        </View>

        <Pressable style={styles.button} onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.buttonText}>
              {preview?.mercadoPagoEnabled ? 'Pagar con Mercado Pago' : 'Confirmar pedido'}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, gap: 10 },
  section: { fontSize: 18, fontWeight: '700', color: colors.navy, marginBottom: 4 },
  error: { color: colors.red, fontSize: 13 },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  summary: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate100,
    gap: 6,
    marginTop: 8,
  },
  summaryRow: { color: colors.slate600, fontSize: 14 },
  total: { fontSize: 20, fontWeight: '800', color: colors.navy, marginTop: 4 },
  button: {
    backgroundColor: colors.red,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  buttonText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  methodRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  methodBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate200,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  methodBtnActive: { borderColor: colors.blue, backgroundColor: '#EFF6FF' },
  methodText: { fontSize: 14, fontWeight: '600', color: colors.slate600 },
  methodTextActive: { color: colors.blue },
});
