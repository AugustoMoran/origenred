import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { completeMercadoPagoConnect } from '../../src/api/marketplace';
import { useAuth } from '../../src/context/AuthContext';
import { colors } from '../../src/theme/colors';

export default function MercadoPagoCallbackScreen() {
  const { code, state } = useLocalSearchParams<{ code?: string; state?: string }>();
  const { accessToken } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!code || !accessToken) {
      if (!code) {
        setStatus('error');
        setMessage('No recibimos el código de autorización de Mercado Pago.');
      }
      return;
    }

    completeMercadoPagoConnect(
      { code: String(code), state: state ? String(state) : undefined },
      accessToken
    )
      .then(() => {
        setStatus('success');
        setMessage('Tu cuenta de Mercado Pago fue vinculada correctamente.');
        setTimeout(() => router.replace('/vendedor/mercadopago'), 1500);
      })
      .catch((e: Error) => {
        setStatus('error');
        setMessage(e.message || 'No se pudo completar la vinculación.');
      });
  }, [code, state, accessToken]);

  return (
    <View style={styles.container}>
      {status === 'loading' && (
        <>
          <ActivityIndicator color={colors.blue} size="large" />
          <Text style={styles.title}>Vinculando Mercado Pago...</Text>
        </>
      )}
      {status === 'success' && (
        <>
          <Text style={styles.emoji}>✅</Text>
          <Text style={styles.title}>¡Listo!</Text>
          <Text style={styles.body}>{message}</Text>
        </>
      )}
      {status === 'error' && (
        <>
          <Text style={styles.emoji}>⚠️</Text>
          <Text style={styles.title}>Error al vincular</Text>
          <Text style={styles.body}>{message}</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  emoji: { fontSize: 48 },
  title: { fontSize: 20, fontWeight: '800', color: colors.navy },
  body: { fontSize: 14, color: colors.slate600, textAlign: 'center' },
});
