import type { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../modules/auth/services/tokenService';
import { canAccessConversation } from '../modules/marketplace/services/chatService';

const extractTokenFromHandshake = (socket: Socket): string | null => {
  const authToken = socket.handshake.auth?.token;
  if (typeof authToken === 'string' && authToken) return authToken;

  const cookieHeader = socket.handshake.headers.cookie;
  if (!cookieHeader) return null;

  const match = cookieHeader.match(/(?:^|;\s*)accessToken=([^;]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
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
    socket.on('chat:join', async (conversationId: string) => {
      if (!conversationId || !socket.data.userId) return;

      const allowed = await canAccessConversation(conversationId, socket.data.userId);
      if (!allowed) {
        socket.emit('chat:error', { message: 'Acceso denegado al chat' });
        return;
      }

      socket.join(`chat:${conversationId}`);
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
