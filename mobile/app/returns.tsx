import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { getMyReturnRequests } from '../src/api/marketplace';
import { useAuth } from '../src/context/AuthContext';
import { colors } from '../src/theme/colors';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  refunded: 'Reembolsada',
};

export default function ReturnsScreen() {
  const { user, accessToken } = useAuth();
  const [requests, setRequests] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [reasonLabels, setReasonLabels] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    getMyReturnRequests(accessToken)
      .then((data: { requests?: any[]; reasonLabels?: Record<string, string> }) => {
        setRequests(data.requests || []);
        setReasonLabels(data.reasonLabels || {});
      })
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  }, [accessToken]);

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Iniciá sesión para ver tus devoluciones</Text>
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
      {requests.length === 0 ? (
        <Text style={styles.muted}>No tenés solicitudes de devolución</Text>
      ) : (
        requests.map((req) => (
          <View key={req._id} style={styles.card}>
            <View style={styles.row}>
              <Link href={`/order/${req.orderNumber}`} asChild>
                <Pressable>
                  <Text style={styles.orderNumber}>{req.orderNumber}</Text>
                </Pressable>
              </Link>
              <Text style={styles.status}>{STATUS_LABELS[req.status] || req.status}</Text>
            </View>
            <Text style={styles.reason}>{reasonLabels[req.reason] || req.reason}</Text>
            {req.description ? <Text style={styles.muted}>{req.description}</Text> : null}
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
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  orderNumber: { fontWeight: '700', color: colors.navy },
  status: { fontSize: 12, color: colors.slate600 },
  reason: { fontSize: 14, color: colors.slate600 },
});
