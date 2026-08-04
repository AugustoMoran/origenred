import React, { useEffect, useRef, useState } from 'react';
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
} from '../../src/services/socket';
import { colors } from '../../src/theme/colors';

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
    if (!accessToken || !conversationId) return;

    const socket = connectChatSocket(accessToken);
    joinChatRoom(conversationId);

    const onMessage = (msg: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    };

    socket.on('chat:message', onMessage);

    return () => {
      socket.off('chat:message', onMessage);
      leaveChatRoom(conversationId);
      disconnectChatSocket();
    };
  }, [accessToken, conversationId]);

  const handleSend = async () => {
    if (!text.trim() || !conversationId || !accessToken) return;
    setSending(true);
    try {
      await sendChatMessage(conversationId, text.trim(), accessToken);
      setText('');
    } catch (e: any) {
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
          return (
            <View key={msg._id} style={[styles.bubbleWrap, isMine && styles.bubbleWrapMine]}>
              <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
                {!isMine && msg.sender?.name && (
                  <Text style={styles.senderName}>{msg.sender.name}</Text>
                )}
                <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{msg.body}</Text>
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
  bubbleMine: { backgroundColor: colors.blue },
  bubbleOther: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.slate200 },
  senderName: { fontSize: 10, color: colors.slate500, marginBottom: 2 },
  bubbleText: { fontSize: 15, color: colors.navy },
  bubbleTextMine: { color: colors.white },
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
