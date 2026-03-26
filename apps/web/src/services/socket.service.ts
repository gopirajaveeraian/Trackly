import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket: Socket | null = null;

/**
 * Initializes the Socket.io connection.
 * Should be called after the user logs in.
 */
export function connectSocket(userId: string): Socket {
  if (socket?.connected) {
    return socket;
  }

  const token = localStorage.getItem('accessToken');

  socket = io(SOCKET_URL, {
    withCredentials: true,
    transports: ['websocket', 'polling'],
    auth: { token },
  });

  socket.on('connect', () => {
    console.log('[Socket.io] Connected:', socket?.id);
    // Join user room for notifications
    socket?.emit('join:user', userId);
  });

  socket.on('disconnect', () => {
    console.log('[Socket.io] Disconnected');
  });

  return socket;
}

/**
 * Disconnects the Socket.io connection.
 * Should be called when the user logs out.
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Returns the current socket instance.
 */
export function getSocket(): Socket | null {
  return socket;
}

/**
 * Joins a project room to receive real-time updates.
 */
export function joinProject(projectId: string): void {
  socket?.emit('join:project', projectId);
}

/**
 * Leaves a project room.
 */
export function leaveProject(projectId: string): void {
  socket?.emit('leave:project', projectId);
}
