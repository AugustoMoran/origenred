import type { Server } from 'socket.io';

export const registerMarketplaceChatSocket = (io: Server) => {
  io.on('connection', (socket) => {
    socket.on('chat:join', (conversationId: string) => {
      if (conversationId) socket.join(`chat:${conversationId}`);
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
