import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { getMercadoPagoConnect, getSellerProfile } from '../../src/api/marketplace';
import { useAuth } from '../../src/context/AuthContext';
import { colors } from '../../src/theme/colors';

WebBrowser.maybeCompleteAuthSession();

export default function SellerMercadoPagoScreen() {
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connectUrl, setConnectUrl] = useState<string | null>(null);
  const [redirectUri, setRedirectUri] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    (async () => {
      try {
        const profile = await getSellerProfile(accessToken);
        setConnected(profile.mercadoPagoConnected);
        const mp = await getMercadoPagoConnect(accessToken);
        setConnectUrl(mp.url);
        setRedirectUri(mp.redirectUri || null);
        setEnabled(mp.enabled);
        if (mp.mercadoPagoConnected) setConnected(true);
      } catch {
        // no-op
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken]);

  const handleConnect = async () => {
    if (!connectUrl || !redirectUri) return;
    setConnecting(true);
    try {
      const result = await WebBrowser.openAuthSessionAsync(connectUrl, redirectUri);
      if (result.type !== 'success' || !result.url) {
        if (result.type === 'cancel') return;
        Alert.alert('Mercado Pago', 'No se completó la autorización.');
        return;
      }
      const match = result.url.match(/[?&]code=([^&]+)/);
      const code = match?.[1] ? decodeURIComponent(match[1]) : null;
      if (!code) {
        Alert.alert('Mercado Pago', 'No recibimos el código de autorización.');
        return;
      }
      // Deep link handler en mercadopago/callback completa la vinculación
      const stateMatch = result.url.match(/[?&]state=([^&]+)/);
      router.push({
        pathname: '/mercadopago/callback',
        params: {
          code,
          state: stateMatch?.[1] ? decodeURIComponent(stateMatch[1]) : undefined,
        },
      });
    } finally {
      setConnecting(false);
    }
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
      <Text style={styles.title}>Mercado Pago</Text>
      <Text style={styles.body}>
        Vinculá tu cuenta para recibir el 95% de cada venta. OrigenRed retiene 5% de comisión sobre el
        producto.
      </Text>

      {connected ? (
        <View style={styles.successBox}>
          <Text style={styles.successText}>✓ Cuenta vinculada</Text>
        </View>
      ) : enabled && connectUrl && redirectUri ? (
        <Pressable
          style={[styles.button, connecting && styles.buttonDisabled]}
          onPress={handleConnect}
          disabled={connecting}
        >
          {connecting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.buttonText}>Vincular Mercado Pago</Text>
          )}
        </Pressable>
      ) : (
        <View style={styles.warnBox}>
          <Text style={styles.warnText}>
            Mercado Pago Connect no está configurado en el servidor todavía.
          </Text>
        </View>
      )}

      {!connected && enabled && (
        <Text style={styles.hint}>
          Al autorizar en Mercado Pago volvés automáticamente a la app para completar la vinculación.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: colors.navy },
  body: { fontSize: 14, color: colors.slate600, lineHeight: 20 },
  button: {
    backgroundColor: '#009EE3',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  successBox: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  successText: { color: '#047857', fontWeight: '600' },
  warnBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warnText: { color: '#92400E', fontSize: 13 },
  hint: { fontSize: 12, color: colors.slate500, lineHeight: 18 },
});
