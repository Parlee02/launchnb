import { createContext } from 'react';

export type UnreadCtx = {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
};

export const UnreadNotificationsContext = createContext<UnreadCtx>({
  unreadCount: 0,
  refreshUnreadCount: async () => {},
});
