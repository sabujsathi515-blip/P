/**
 * RealtimeHub: Manages Server-Sent Events (SSE) connection to /api/realtime
 * and cross-tab BroadcastChannel for zero-latency instant messaging and call signaling.
 */

type RealtimeCallback = (data: any) => void;

class RealtimeHub {
  private eventSource: EventSource | null = null;
  private currentUserId: string | null = null;
  private listeners = new Map<string, Set<RealtimeCallback>>();
  private broadcastChannel: BroadcastChannel | null = null;
  private reconnectTimer: number | null = null;
  private isConnecting: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('connectcall_realtime_channel');
        this.broadcastChannel.onmessage = (event) => {
          const { type, data } = event.data || {};
          if (type) {
            this.triggerListeners(type, data);
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel not supported', e);
      }
    }
  }

  public connect(userId: string) {
    if (this.currentUserId === userId && this.eventSource?.readyState === EventSource.OPEN) {
      return;
    }

    this.currentUserId = userId;
    this.disconnect();

    if (typeof window === 'undefined') return;

    this.isConnecting = true;
    try {
      const url = `/api/realtime?userId=${encodeURIComponent(userId)}`;
      const es = new EventSource(url);
      this.eventSource = es;

      es.onopen = () => {
        this.isConnecting = false;
        // console.log('[RealtimeHub] Connected for user:', userId);
      };

      const eventTypes = [
        'new_message',
        'message_deleted',
        'messages_seen',
        'chat_update',
        'typing',
        'incoming_call',
        'call_update',
        'user_update',
        'call_history_updated',
      ];

      for (const eventType of eventTypes) {
        es.addEventListener(eventType, (e: MessageEvent) => {
          try {
            const parsed = JSON.parse(e.data);
            this.triggerListeners(eventType, parsed);
          } catch (err) {
            console.error('[RealtimeHub] Error parsing SSE event:', eventType, err);
          }
        });
      }

      es.onerror = () => {
        // SSE closed or errored, close and schedule reconnection
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }
        if (!this.reconnectTimer && this.currentUserId) {
          this.reconnectTimer = window.setTimeout(() => {
            this.reconnectTimer = null;
            if (this.currentUserId) {
              this.connect(this.currentUserId);
            }
          }, 2000);
        }
      };
    } catch (err) {
      console.warn('[RealtimeHub] Failed to initialize EventSource:', err);
    }
  }

  public disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnecting = false;
  }

  public on(event: string, callback: RealtimeCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  public broadcastLocally(type: string, data: any) {
    // 1. Dispatch to local listeners in current tab
    this.triggerListeners(type, data);

    // 2. Dispatch to other tabs via BroadcastChannel
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ type, data });
      } catch (err) {
        console.warn('BroadcastChannel postMessage error:', err);
      }
    }
  }

  private triggerListeners(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      for (const cb of callbacks) {
        try {
          cb(data);
        } catch (e) {
          console.error('[RealtimeHub] Error in listener callback:', e);
        }
      }
    }
  }
}

export const realtimeHub = new RealtimeHub();
