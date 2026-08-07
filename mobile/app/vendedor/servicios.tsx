import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import {
  createServiceLead,
  getSellerServices,
  OrigenRedService,
  ServiceLead,
} from '../../src/api/marketplace';
import { colors } from '../../src/theme/colors';

const STATUS_LABELS: Record<string, string> = {
  new: 'En revisión',
  contacted: 'Contactado',
  closed: 'Cerrado',
};

export default function SellerServicesScreen() {
  const { accessToken } = useAuth();
  const [services, setServices] = useState<OrigenRedService[]>([]);
  const [leads, setLeads] = useState<ServiceLead[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    (async () => {
      try {
        const data = await getSellerServices(accessToken);
        setServices(data.services);
        setLeads(data.leads);
        setLabels(data.labels);
      } catch {
        setServices([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken]);

  const leadByType = new Map(leads.map((l) => [l.serviceType, l]));

  const handleSubmit = async (serviceType: string) => {
    if (!accessToken) return;
    setSubmitting(true);
    try {
      await createServiceLead(accessToken, {
        serviceType,
        message: message.trim() || undefined,
      });
      Alert.alert('Listo', 'Solicitud enviada. Te contactaremos pronto.');
      const data = await getSellerServices(accessToken);
      setLeads(data.leads);
      setActiveType(null);
      setMessage('');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo enviar la solicitud');
    } finally {
      setSubmitting(false);
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
      <Text style={styles.title}>Servicios de OrigenRed</Text>
      <Text style={styles.subtitle}>
        Herramientas profesionales para hacer crecer tu negocio.
      </Text>

      {services.map((service) => {
        const existing = leadByType.get(service.type);
        const isOpen = activeType === service.type;

        return (
          <View key={service.type} style={styles.card}>
            <Text style={styles.cardTitle}>{service.title}</Text>
            <Text style={styles.cardDesc}>{service.description}</Text>

            {existing && existing.status !== 'closed' ? (
              <Text style={styles.badge}>{STATUS_LABELS[existing.status] || existing.status}</Text>
            ) : isOpen ? (
              <View style={styles.form}>
                <TextInput
                  style={styles.input}
                  placeholder="¿Qué necesitás? (opcional)"
                  value={message}
                  onChangeText={setMessage}
                  multiline
                />
                <Pressable
                  style={[styles.btn, submitting && styles.btnDisabled]}
                  disabled={submitting}
                  onPress={() => handleSubmit(service.type)}
                >
                  <Text style={styles.btnText}>Enviar solicitud</Text>
                </Pressable>
                <Pressable onPress={() => { setActiveType(null); setMessage(''); }}>
                  <Text style={styles.cancel}>Cancelar</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.btn} onPress={() => setActiveType(service.type)}>
                <Text style={styles.btnText}>Solicitar asesoramiento</Text>
              </Pressable>
            )}
          </View>
        );
      })}

      {leads.length > 0 && (
        <View style={styles.history}>
          <Text style={styles.historyTitle}>Mis solicitudes</Text>
          {leads.map((lead) => (
            <View key={lead._id} style={styles.historyRow}>
              <Text style={styles.historyLabel}>{labels[lead.serviceType] || lead.serviceType}</Text>
              <Text style={styles.historyStatus}>{STATUS_LABELS[lead.status] || lead.status}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: colors.navy },
  subtitle: { color: colors.slate500, fontSize: 14, marginBottom: 8 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate100,
    gap: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.navy },
  cardDesc: { fontSize: 14, color: colors.slate500 },
  badge: {
    fontSize: 12,
    color: '#b45309',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  form: { gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.slate100,
    borderRadius: 12,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  btn: {
    backgroundColor: colors.navy,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: colors.white, fontWeight: '700' },
  cancel: { color: colors.slate500, textAlign: 'center', paddingVertical: 8 },
  history: { marginTop: 8, gap: 8 },
  historyTitle: { fontWeight: '700', color: colors.navy },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between' },
  historyLabel: { color: colors.slate500 },
  historyStatus: { color: colors.slate400 },
});
