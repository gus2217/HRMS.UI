// ============================================================
// notificationHub.ts
// Location: src/features/notifications/services/notificationHub.ts
//
// SignalR client for real-time notification delivery. Connects to
// /hubs/notifications with the bearer token and surfaces
// "notificationReceived" events so the bell updates instantly.
// ============================================================

import * as signalR from '@microsoft/signalr';
import { getAccessToken } from '@/lib/apiClient';

const HUB_URL = '/hubs/notifications';

let connection: signalR.HubConnection | null = null;
let started = false;
let retryTimer: number | null = null;

/** Subscribes a callback to live notifications. Reconnects with backoff. */
export function subscribeToNotifications(onReceived: (dto: { id: string; category: string }) => void) {
  if (!connection) {
    connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, {
        accessTokenFactory: () => getAccessToken() ?? '',
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connection.on('notificationReceived', onReceived);
  }

  const connect = () => {
    if (started || !connection) return;
    started = true;
    connection
      .start()
      .catch(() => {
        started = false;
        retryTimer = window.setTimeout(connect, 15_000);
      });
  };

  // Re-subscribe to the event (idempotent after reconnect).
  connection.off('notificationReceived');
  connection.on('notificationReceived', onReceived);

  connect();
  return () => {
    // Note: keep the connection alive for other subscribers; only clear callbacks.
    connection?.off('notificationReceived', onReceived);
  };
}

/** Tears the hub down (used on logout). */
export function disconnectNotifications() {
  if (retryTimer !== null) {
    window.clearTimeout(retryTimer);
    retryTimer = null;
  }
  started = false;
  void connection?.stop();
  connection = null;
}
