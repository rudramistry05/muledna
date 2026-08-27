import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Establish the persistent Socket.IO connection
export const socket = io(API_URL, {
  autoConnect: true,
  transports: ['websocket', 'polling'],
});

// Helper functions to hook and unhook handlers
export const subscribeToEvent = (event, callback) => {
  socket.on(event, callback);
};

export const unsubscribeFromEvent = (event, callback) => {
  socket.off(event, callback);
};

export default socket;
