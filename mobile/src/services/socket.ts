import { io, Socket } from 'socket.io-client';
import { getSocketUrl } from '../api/client';

let socket: Socket | null = null;
let currentToken: string | null = null;

export const connectChatSocket = (accessToken: string): Socket => {
  if (socket && currentToken === accessToken) {
    if (!socket.connected) socket.connect();
    return socket;
  }

  if (socket) {
    socket.disconnect();
  }

  currentToken = accessToken;
  socket = io(getSocketUrl(), {
    autoConnect: true,
    transports: ['websocket', 'polling'],
    auth: { token: accessToken },
  });

  return socket;
};

export const disconnectChatSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentToken = null;
  }
};

export const joinChatRoom = (conversationId: string) => {
  if (socket?.connected) socket.emit('chat:join', conversationId);
};

export const leaveChatRoom = (conversationId: string) => {
  if (socket?.connected) socket.emit('chat:leave', conversationId);
};
