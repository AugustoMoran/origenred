import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { colors } from '../src/theme/colors';

export default function PaymentReturnScreen() {
  const { orderNumber, status } = useLocalSearchParams<{ orderNumber?: string; status?: string }>();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (orderNumber) {
        router.replace(`/order/${orderNumber}`);
      } else {
        router.replace('/');
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [orderNumber]);

  const isSuccess = status !== 'failure' && status !== 'pending';

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{isSuccess ? '✅' : '⏳'}</Text>
      <Text style={styles.title}>
        {isSuccess ? 'Pago procesado' : 'Procesando pago...'}
      </Text>
      {orderNumber && (
        <Text style={styles.sub}>Pedido {orderNumber}</Text>
      )}
      <Text style={styles.hint}>Redirigiendo a tus compras...</Text>
      <ActivityIndicator color={colors.blue} style={{ marginTop: 16 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  emoji: { fontSize: 48 },
  title: { fontSize: 22, fontWeight: '800', color: colors.navy },
  sub: { fontSize: 16, color: colors.slate600 },
  hint: { fontSize: 13, color: colors.slate400, marginTop: 8 },
});
