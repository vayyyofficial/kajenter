import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { API_BASE } from '../services/api';
import { dataCache } from '../services/dataCache';

export interface SyncPayload {
  type: 'gallery' | 'members' | 'social' | 'settings' | 'metrics' | 'stories' | 'logs';
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'SYNC';
  timestamp: string;
  data?: any;
}

interface SyncContextType {
  lastEvent: SyncPayload | null;
}

const SyncContext = createContext<SyncContextType>({ lastEvent: null });

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lastEvent, setLastEvent] = useState<SyncPayload | null>(null);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let retryTimeout: any = null;

    const connectSSE = () => {
      try {
        eventSource = new EventSource(`${API_BASE}/sync/stream`);

        eventSource.onmessage = (e) => {
          try {
            const parsed: SyncPayload = JSON.parse(e.data);
            setLastEvent(parsed);

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
    <SyncContext.Provider value={{ lastEvent }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => useContext(SyncContext);

/**
 * Hook to automatically trigger updates when relevant database entities change in real-time.
 * Uses cached data and eliminates aggressive window focus re-fetching.
 */
export function useRealtimeSync(
  types: ('gallery' | 'members' | 'social' | 'settings' | 'stories' | 'logs')[],
  onUpdate: () => void
) {
  const callbackRef = useRef(onUpdate);

  useEffect(() => {
    callbackRef.current = onUpdate;
  }, [onUpdate]);

  const typesKey = types.join(',');

  useEffect(() => {
    const activeTypes = typesKey.split(',') as ('gallery' | 'members' | 'social' | 'settings' | 'stories' | 'logs')[];

    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<SyncPayload>;
      const detail = customEvent.detail;
      if (detail && activeTypes.includes(detail.type as any)) {
        // Invalidate cache for the updated type so fresh data is fetched
        dataCache.invalidate(detail.type as any);
        callbackRef.current();
      }
    };

    window.addEventListener('x_icp_sync', handleSync);

    return () => {
      window.removeEventListener('x_icp_sync', handleSync);
    };
  }, [typesKey]);
}
