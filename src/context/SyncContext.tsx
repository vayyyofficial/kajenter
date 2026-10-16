import React, { createContext, useContext, useEffect, useRef } from 'react';
import { API_BASE } from '../services/api';

export interface SyncPayload {
  type: 'gallery' | 'members' | 'social' | 'settings' | 'metrics';
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'SYNC';
  timestamp: string;
  data?: any;
}

interface SyncContextType {
  lastEvent: SyncPayload | null;
}

const SyncContext = createContext<SyncContextType>({ lastEvent: null });

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const lastEventRef = useRef<SyncPayload | null>(null);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let retryTimeout: any = null;

    const connectSSE = () => {
      try {
        eventSource = new EventSource(`${API_BASE}/sync/stream`);

        eventSource.onmessage = (e) => {
          try {
            const parsed: SyncPayload = JSON.parse(e.data);
            lastEventRef.current = parsed;

            // Broadcast to window listeners
            window.dispatchEvent(
              new CustomEvent('x_icp_sync', { detail: parsed })
            );
          } catch {
            // Ignore non-json or ping frames
          }
        };

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          // Reconnect with backoff
          retryTimeout = setTimeout(connectSSE, 3000);
        };
      } catch {
        retryTimeout = setTimeout(connectSSE, 5000);
      }
    };

    connectSSE();

    return () => {
      if (eventSource) eventSource.close();
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, []);

  return (
    <SyncContext.Provider value={{ lastEvent: lastEventRef.current }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => useContext(SyncContext);

/**
 * Hook to automatically trigger refetch when relevant database entities change in real-time.
 */
export function useRealtimeSync(
  types: ('gallery' | 'members' | 'social' | 'settings')[],
  onUpdate: () => void
) {
  const callbackRef = useRef(onUpdate);
  callbackRef.current = onUpdate;

  useEffect(() => {
    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<SyncPayload>;
      const detail = customEvent.detail;
      if (detail && types.includes(detail.type as any)) {
        callbackRef.current();
      }
    };

    // Re-verify on window focus if tab was in background
    const handleFocus = () => {
      callbackRef.current();
    };

    window.addEventListener('x_icp_sync', handleSync);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('x_icp_sync', handleSync);
      window.removeEventListener('focus', handleFocus);
    };
  }, [types.join(',')]);
}
