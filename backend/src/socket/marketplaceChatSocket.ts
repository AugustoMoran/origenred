import type { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../modules/auth/services/tokenService';
import {
  canAccessConversation,
  markIncomingMessagesAsRead,
} from '../modules/marketplace/services/chatService';

const extractTokenFromHandshake = (socket: Socket): string | null => {
  const authToken = socket.handshake.auth?.token;
  if (typeof authToken === 'string' && authToken) return authToken;

  const cookieHeader = socket.handshake.headers.cookie;
  if (!cookieHeader) return null;

  const re = /(?:^|;\s*)accessToken=([^;]+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(cookieHeader))) {
    const token = decodeURIComponent(match[1]);
    try {
      verifyAccessToken(token);
      return token;
    } catch {
      // stale duplicate cookie (e.g. legacy path=/api)
    }
  }
  return null;
};

export const emitChatRead = (
  io: Server | null,
  conversationId: string,
  receipt: {
    conversationId: string;
    readerId: string;
    readAt: Date;
    messageIds: string[];
  }
) => {
  if (!io || !conversationId || !receipt.messageIds.length) return;
  io.to(`chat:${conversationId}`).emit('chat:read', {
    conversationId,
    readerId: receipt.readerId,
    readAt: receipt.readAt.toISOString(),
    messageIds: receipt.messageIds,
  });
};

export const markReadForUsersViewingChat = async (
  io: Server | null,
  conversationId: string,
  excludeUserId: string
) => {
  if (!io) return;
  const sockets = await io.in(`chat:${conversationId}`).fetchSockets();
  for (const s of sockets) {
    const uid = s.data.userId as string | undefined;
    if (!uid || uid === excludeUserId) continue;
    const receipt = await markIncomingMessagesAsRead(conversationId, uid);
    if (receipt) emitChatRead(io, conversationId, receipt);
  }
};

export const registerMarketplaceChatSocket = (io: Server) => {
  io.use((socket, next) => {
    const token = extractTokenFromHandshake(socket);
    if (!token) {
      next(new Error('Unauthorized'));
      return;
    }

    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const markReadIfAllowed = async (conversationId: string) => {
      if (!conversationId || !socket.data.userId) return;
      const allowed = await canAccessConversation(conversationId, socket.data.userId);
      if (!allowed) return;
      const receipt = await markIncomingMessagesAsRead(conversationId, socket.data.userId);
      if (receipt) emitChatRead(io, conversationId, receipt);
    };

    socket.on('chat:join', async (conversationId: string) => {
      if (!conversationId || !socket.data.userId) return;

      const allowed = await canAccessConversation(conversationId, socket.data.userId);
      if (!allowed) {
        socket.emit('chat:error', { message: 'Acceso denegado al chat' });
        return;
      }

      socket.join(`chat:${conversationId}`);
      await markReadIfAllowed(conversationId);
    });

    socket.on('chat:markRead', async (conversationId: string) => {
      await markReadIfAllowed(conversationId);
    });

    socket.on('chat:leave', (conversationId: string) => {
      if (conversationId) socket.leave(`chat:${conversationId}`);
    });
  });
};

export const emitChatMessage = (io: Server | null, conversationId: string, message: unknown) => {
  if (!io || !conversationId) return;
  io.to(`chat:${conversationId}`).emit('chat:message', message);
};
