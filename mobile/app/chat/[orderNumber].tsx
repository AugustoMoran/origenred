import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { getChatByOrder, sendChatMessage, ChatMessage } from '../../src/api/marketplace';
import { useAuth } from '../../src/context/AuthContext';
import {
  connectChatSocket,
  disconnectChatSocket,
  joinChatRoom,
  leaveChatRoom,
  markChatRead,
} from '../../src/services/socket';
import { colors } from '../../src/theme/colors';

type ReadPayload = {
  conversationId: string;
  readerId: string;
  readAt: string;
  messageIds: string[];
};

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

const applyRead = (messages: ChatMessage[], payload: ReadPayload): ChatMessage[] => {
  const ids = new Set(payload.messageIds);
  return messages.map((m) => (ids.has(m._id) ? { ...m, readAt: payload.readAt } : m));
};

export default function ChatScreen() {
  const { orderNumber } = useLocalSearchParams<{ orderNumber: string }>();
  const { user, accessToken } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<ScrollView>(null);

  const patchMessages = useCallback((updater: (prev: ChatMessage[]) => ChatMessage[]) => {
    setMessages(updater);
  }, []);

  useEffect(() => {
    if (!orderNumber || !accessToken) return;

    getChatByOrder(orderNumber, accessToken)
      .then((data) => {
        setMessages(data.messages);
        setConversationId(data.conversation._id);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [orderNumber, accessToken]);

  useEffect(() => {
    if (!accessToken || !conversationId || !user?.id) return;

    const socket = connectChatSocket(accessToken);
    joinChatRoom(conversationId);

    const onMessage = (msg: ChatMessage) => {
      patchMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      if (String(msg.sender?._id) !== String(user.id)) {
        markChatRead(conversationId);
      }
    };

    const onRead = (payload: ReadPayload) => {
      if (payload.conversationId && payload.conversationId !== conversationId) return;
      patchMessages((prev) => applyRead(prev, payload));
    };

    socket.on('chat:message', onMessage);
    socket.on('chat:read', onRead);

    return () => {
      socket.off('chat:message', onMessage);
      socket.off('chat:read', onRead);
      leaveChatRoom(conversationId);
      disconnectChatSocket();
    };
  }, [accessToken, conversationId, patchMessages, user?.id]);

  const handleSend = async () => {
    if (!text.trim() || !conversationId || !accessToken || !user?.id) return;
    const body = text.trim();
    const tempId = `pending-${Date.now()}`;
    const optimistic: ChatMessage = {
      _id: tempId,
      body,
      createdAt: new Date().toISOString(),
      pending: true,
      sender: { _id: String(user.id), name: user.name || '' },
    };
    setText('');
    patchMessages((prev) => [...prev, optimistic]);
    setSending(true);
    try {
      const sent = await sendChatMessage(conversationId, body, accessToken);
      patchMessages((prev) =>
        prev.filter((m) => m._id !== tempId).concat(sent)
      );
    } catch (e: any) {
      patchMessages((prev) => prev.filter((m) => m._id !== tempId));
      setText(body);
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  if (!user || !accessToken) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Iniciá sesión para usar el chat</Text>
        <Pressable style={styles.cta} onPress={() => router.push('/login')}>
          <Text style={styles.ctaText}>Iniciar sesión</Text>
        </Pressable>
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

  if (error && !conversationId) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        ref={bottomRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => bottomRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.length === 0 && (
          <Text style={styles.empty}>Iniciá la conversación con el vendedor</Text>
        )}
        {messages.map((msg) => {
          const isMine = String(msg.sender?._id) === String(user.id);
          const readLabel = isMine && msg.readAt ? `Visto ${formatTime(msg.readAt)}` : null;
          return (
            <View key={msg._id} style={[styles.bubbleWrap, isMine && styles.bubbleWrapMine]}>
              <View
                style={[
                  styles.bubble,
                  isMine ? styles.bubbleMine : styles.bubbleOther,
                  msg.pending && styles.bubblePending,
                ]}
              >
                {!isMine && msg.sender?.name && (
                  <Text style={styles.senderName}>{msg.sender.name}</Text>
                )}
                <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{msg.body}</Text>
                <View style={styles.metaRow}>
                  <Text style={[styles.metaText, isMine && styles.metaTextMine]}>
                    {formatTime(msg.createdAt)}
                  </Text>
                  {readLabel && (
                    <Text style={[styles.metaText, styles.readText, isMine && styles.metaTextMine]}>
                      {readLabel}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Mensaje..."
          value={text}
          onChangeText={setText}
          multiline
        />
        <Pressable style={styles.sendBtn} onPress={handleSend} disabled={sending || !text.trim()}>
          <Text style={styles.sendText}>Enviar</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  muted: { color: colors.slate500 },
  error: { color: colors.red },
  cta: {
    backgroundColor: colors.red,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  ctaText: { color: colors.white, fontWeight: '700' },
  messages: { flex: 1, backgroundColor: colors.slate50 },
  messagesContent: { padding: 16, gap: 8 },
  empty: { textAlign: 'center', color: colors.slate400, marginTop: 24 },
  bubbleWrap: { alignSelf: 'flex-start', maxWidth: '80%' },
  bubbleWrapMine: { alignSelf: 'flex-end' },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubblePending: { opacity: 0.85 },
  bubbleMine: { backgroundColor: colors.blue },
  bubbleOther: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.slate200 },
  senderName: { fontSize: 10, color: colors.slate500, marginBottom: 2 },
  bubbleText: { fontSize: 15, color: colors.navy },
  bubbleTextMine: { color: colors.white },
  metaRow: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 4 },
  metaText: { fontSize: 10, color: colors.slate400 },
  metaTextMine: { color: 'rgba(255,255,255,0.75)' },
  readText: { fontWeight: '600' },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.slate200,
  },
  input: {
    flex: 1,
    backgroundColor: colors.slate50,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: colors.red,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  sendText: { color: colors.white, fontWeight: '700' },
});
