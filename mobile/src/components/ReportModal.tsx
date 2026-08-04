import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { createReport, REPORT_REASONS } from '../api/marketplace';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  listingId?: string;
  sellerId?: string;
  orderId?: string;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  visible,
  onClose,
  title,
  listingId,
  sellerId,
  orderId,
}) => {
  const { accessToken } = useAuth();
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleClose = () => {
    setReason('');
    setDescription('');
    setError('');
    setSuccess(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!accessToken || !reason) return;
    setError('');
    setSubmitting(true);
    try {
      await createReport(
        { listingId, sellerId, orderId, reason, description: description.trim() || undefined },
        accessToken
      );
      setSuccess(true);
    } catch (e: any) {
      setError(e.message || 'Error al enviar la denuncia');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {success ? (
            <View style={styles.successBox}>
              <Text style={styles.successEmoji}>✅</Text>
              <Text style={styles.successTitle}>Denuncia enviada</Text>
              <Text style={styles.successSub}>Un administrador revisará el caso.</Text>
              <Pressable style={styles.submitBtn} onPress={handleClose}>
                <Text style={styles.submitBtnText}>Cerrar</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.content}>
              <View style={styles.header}>
                <Text style={styles.heading}>Enviar denuncia</Text>
                <Pressable onPress={handleClose} hitSlop={12}>
                  <Text style={styles.close}>✕</Text>
                </Pressable>
              </View>
              <Text style={styles.subtitle} numberOfLines={2}>{title}</Text>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Text style={styles.label}>Motivo *</Text>
              {REPORT_REASONS.map((r) => (
                <Pressable
                  key={r.value}
                  style={[styles.reasonRow, reason === r.value && styles.reasonRowActive]}
                  onPress={() => setReason(r.value)}
                >
                  <View style={[styles.radio, reason === r.value && styles.radioActive]} />
                  <Text style={styles.reasonText}>{r.label}</Text>
                </Pressable>
              ))}

              <TextInput
                style={styles.textArea}
                placeholder="Detalles adicionales (opcional)"
                multiline
                numberOfLines={3}
                value={description}
                onChangeText={setDescription}
                textAlignVertical="top"
              />

              <Pressable
                style={[styles.submitBtn, (!reason || submitting) && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={!reason || submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.submitBtnText}>Enviar denuncia</Text>
                )}
              </Pressable>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  content: { padding: 20, gap: 10, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heading: { fontSize: 18, fontWeight: '800', color: colors.navy },
  close: { fontSize: 20, color: colors.slate400 },
  subtitle: { fontSize: 14, color: colors.slate500 },
  label: { fontSize: 14, fontWeight: '600', color: colors.navy, marginTop: 8 },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  reasonRowActive: { borderColor: colors.blue, backgroundColor: '#eff6ff' },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.slate400,
  },
  radioActive: { borderColor: colors.blue, backgroundColor: colors.blue },
  reasonText: { fontSize: 14, color: colors.navy, flex: 1 },
  textArea: {
    backgroundColor: colors.slate50,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 88,
    marginTop: 4,
  },
  error: { color: colors.red, fontSize: 13 },
  submitBtn: {
    backgroundColor: colors.red,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  successBox: { padding: 32, alignItems: 'center', gap: 10 },
  successEmoji: { fontSize: 48 },
  successTitle: { fontSize: 18, fontWeight: '700', color: colors.navy },
  successSub: { fontSize: 14, color: colors.slate500, textAlign: 'center' },
});
