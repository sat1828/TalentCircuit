import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  payload: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

interface NotificationState {
  socket: Socket | null;
  notifications: Notification[];
  unreadCount: number;
  connect: (token: string) => void;
  disconnect: () => void;
  addNotification: (notification: Notification) => void;
  setNotifications: (notifications: Notification[]) => void;
  markRead: (id?: string) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  socket: null,
  notifications: [],
  unreadCount: 0,
  connect: (token: string) => {
    const socket = io('/', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected');
    });

    socket.on('notification', (notification: Notification) => {
      get().addNotification(notification);
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
    });

    set({ socket });
  },
  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null });
    }
  },
  addNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },
  setNotifications: (notifications) => {
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.isRead).length,
    });
  },
  markRead: (id) => {
    if (id) {
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } else {
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      }));
    }
  },
}));
