import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AppNotification } from "../components/main/NotificationsPanel";

const STORAGE_KEY = "spartacus.notifications.v1";
const MAX_STORED = 50;

interface NotificationsContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  add: (n: Omit<AppNotification, "id" | "read" | "receivedAt">) => void;
  markAllRead: () => void;
  clear: () => void;
}

const NotificationsCtx = createContext<NotificationsContextValue | null>(null);

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsCtx);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationsProvider");
  }
  return ctx;
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Load persisted notifications on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            setNotifications(JSON.parse(raw));
          } catch {
            // ignore corrupt cache
          }
        }
      })
      .catch(() => {
        // ignore
      });
  }, []);

  // Persist on change
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notifications)).catch(
      () => {},
    );
  }, [notifications]);

  const add = useCallback(
    (n: Omit<AppNotification, "id" | "read" | "receivedAt">) => {
      setNotifications((prev) => {
        const item: AppNotification = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          title: n.title,
          body: n.body,
          read: false,
          receivedAt: new Date().toISOString(),
        };
        return [item, ...prev].slice(0, MAX_STORED);
      });
    },
    [],
  );

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clear = useCallback(() => setNotifications([]), []);

  // Listen to incoming notifications globally and add them to context
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener((notif) => {
      const content = notif.request.content;
      add({
        title: content.title ?? "Notificação",
        body: content.body ?? "",
      });
    });
    return () => {
      sub.remove();
    };
  }, [add]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const value = useMemo(
    () => ({ notifications, unreadCount, add, markAllRead, clear }),
    [notifications, unreadCount, add, markAllRead, clear],
  );

  return (
    <NotificationsCtx.Provider value={value}>
      {children}
    </NotificationsCtx.Provider>
  );
}
