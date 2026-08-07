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
import { useAuth } from '../../src/context/AuthContext';
import {
  getSellerReturnRequests,
  updateSellerReturn,
} from '../../src/api/marketplace';
import { colors } from '../../src/theme/colors';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  refunded: 'Reembolsada',
};

export default function SellerReturnsScreen() {
  const { accessToken } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [reasonLabels, setReasonLabels] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const load = async () => {
    if (!accessToken) return;
    try {
      const data = await getSellerReturnRequests(accessToken);
      setRequests(data.requests || []);
      setReasonLabels(data.reasonLabels || {});
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [accessToken]);

  const handle = async (id: string, status: 'approved' | 'rejected') => {
    if (!accessToken) return;
    setUpdating(true);
    try {
      await updateSellerReturn(accessToken, id, status);
      await load();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo actualizar');
    } finally {
      setUpdating(false);
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
      <Text style={styles.title}>Devoluciones</Text>

      {requests.length === 0 ? (
        <Text style={styles.muted}>No hay solicitudes de devolución</Text>
      ) : (
        requests.map((req) => (
          <View key={req._id} style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.order}>{req.orderNumber}</Text>
              <Text style={styles.status}>{STATUS_LABELS[req.status] || req.status}</Text>
            </View>
            <Text style={styles.reason}>{reasonLabels[req.reason] || req.reason}</Text>
            {req.description && <Text style={styles.desc}>{req.description}</Text>}
            {req.buyer?.name && <Text style={styles.buyer}>Comprador: {req.buyer.name}</Text>}
            {req.status === 'pending' && (
              <View style={styles.actions}>
                <Pressable
                  style={[styles.approve, updating && styles.disabled]}
                  disabled={updating}
                  onPress={() => handle(req._id, 'approved')}
                >
                  <Text style={styles.approveText}>Aprobar</Text>
                </Pressable>
                <Pressable
                  style={[styles.reject, updating && styles.disabled]}
                  disabled={updating}
                  onPress={() => handle(req._id, 'rejected')}
                >
                  <Text style={styles.rejectText}>Rechazar</Text>
                </Pressable>
              </View>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: colors.navy },
  muted: { color: colors.slate500 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.slate100,
    gap: 6,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  order: { fontWeight: '700', color: colors.navy },
  status: { fontSize: 12, color: colors.slate500 },
  reason: { fontSize: 14, color: colors.slate600 },
  desc: { fontSize: 13, color: colors.slate500 },
  buyer: { fontSize: 12, color: colors.slate400 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  approve: {
    flex: 1,
    backgroundColor: '#16a34a',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  approveText: { color: colors.white, fontWeight: '700' },
  reject: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.slate200,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  rejectText: { color: colors.navy, fontWeight: '600' },
  disabled: { opacity: 0.6 },
});
