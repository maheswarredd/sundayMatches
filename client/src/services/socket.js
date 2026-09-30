import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || window.location.origin;

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });
  }
  return socket;
}

export function joinMatchRoom(matchId) {
  const s = getSocket();
  if (matchId) {
    s.emit('join:match', matchId);
  }
}

export function leaveMatchRoom(matchId) {
  const s = getSocket();
  if (matchId) {
    s.emit('leave:match', matchId);
  }
}
