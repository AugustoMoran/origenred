import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const SOCKET_URL = API_URL.replace(/\/api\/?$/, '');

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      withCredentials: true,
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
};

export const connectSocket = () => {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
};

export const joinChatRoom = (conversationId: string) => {
  const s = connectSocket();
  s.emit('chat:join', conversationId);
};

export const leaveChatRoom = (conversationId: string) => {
  const s = getSocket();
  if (s.connected) s.emit('chat:leave', conversationId);
};
