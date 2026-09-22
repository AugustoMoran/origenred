import { io, Socket } from 'socket.io-client';
import { isAccessTokenExpired, loadAuthTokens } from './authTokenStorage';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const SOCKET_URL = API_URL.replace(/\/api\/?$/, '');

let socket: Socket | null = null;
let socketToken: string | null = null;

const socketAuthToken = (): string | undefined => {
  const tokens = loadAuthTokens();
  if (tokens?.accessToken && !isAccessTokenExpired(tokens.accessToken)) {
    return tokens.accessToken;
  }
  return undefined;
};

const ensureSocket = (): Socket => {
  const token = socketAuthToken();
  if (!socket) {
    socket = io(SOCKET_URL, {
      withCredentials: true,
      autoConnect: false,
      transports: ['websocket', 'polling'],
      auth: token ? { token } : {},
    });
    socketToken = token || null;
    return socket;
  }

  if (token !== socketToken) {
    socket.auth = token ? { token } : {};
    socketToken = token || null;
    if (socket.connected) {
      socket.disconnect();
    }
  }

  return socket;
};

export const getSocket = (): Socket => ensureSocket();

export const connectSocket = () => {
  const s = ensureSocket();
  if (!s.connected) s.connect();
  return s;
};

export const joinChatRoom = (conversationId: string) => {
  const s = connectSocket();
  const join = () => s.emit('chat:join', conversationId);
  if (s.connected) join();
  else s.once('connect', join);
};

export const leaveChatRoom = (conversationId: string) => {
  const s = getSocket();
  if (s.connected) s.emit('chat:leave', conversationId);
};

export const markChatRead = (conversationId: string) => {
  const s = getSocket();
  if (s.connected) s.emit('chat:markRead', conversationId);
};
