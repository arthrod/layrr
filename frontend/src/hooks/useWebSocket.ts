import { useEffect, useRef, useState, useCallback } from 'react';

const WS_MESSAGE_PATH = '/__layrr/ws/message';

interface WebSocketMessage {
  id: number;
  [key: string]: any;
}

export function useWebSocket(proxyURL: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const messageHandlersRef = useRef<Map<number, (data: any) => void>>(new Map());
  const reconnectTimeoutRef = useRef<number>();
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000;

  const sendMessage = useCallback((message: WebSocketMessage, onResponse?: (data: any) => void) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const messageId = Date.now();
      message.id = messageId;

      if (onResponse) {
        messageHandlersRef.current.set(messageId, onResponse);
        console.log('[WebSocket] Registered response handler for message ID:', messageId);
      }

      const messageStr = JSON.stringify(message);
      wsRef.current.send(messageStr);
      console.log('[WebSocket] ✅ Message sent to backend');
      console.log('[WebSocket] Message ID:', messageId);
      console.log('[WebSocket] Message content:', message);
      console.log('[WebSocket] Raw message:', messageStr);
      return messageId;
    } else {
      console.error('[WebSocket] ❌ Not connected - readyState:', wsRef.current?.readyState);
      return null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!proxyURL) {
      console.log('[WebSocket] ⚠️ No proxyURL provided, skipping connection');
      return;
    }

    const url = new URL(proxyURL);
    const wsUrl = `ws://${url.host}${WS_MESSAGE_PATH}`;

    console.log('[WebSocket] 🔌 Attempting to connect...');
    console.log('[WebSocket] Proxy URL:', proxyURL);
    console.log('[WebSocket] WebSocket URL:', wsUrl);

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[WebSocket] ✅ Connected to backend successfully!');
      console.log('[WebSocket] Connection state:', ws.readyState);
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('[WebSocket] 📨 Message received from backend');
      console.log('[WebSocket] Response data:', data);
      console.log('[WebSocket] Status:', data.status);
      console.log('[WebSocket] Message ID:', data.id);

      if (data.id && messageHandlersRef.current.has(data.id)) {
        console.log('[WebSocket] ✅ Found handler for message ID:', data.id);
        const handler = messageHandlersRef.current.get(data.id);
        handler?.(data);

        // Clean up handler on completion or error
        if (data.status === 'complete' || data.status === 'error') {
          console.log('[WebSocket] 🧹 Cleaning up handler for message ID:', data.id);
          messageHandlersRef.current.delete(data.id);
        }
      } else {
        console.warn('[WebSocket] ⚠️ No handler found for message ID:', data.id);
      }
    };

    ws.onerror = (error) => {
      console.error('[WebSocket] ❌ Error occurred');
      console.error('[WebSocket] Error object:', error);
      console.error('[WebSocket] ReadyState:', ws.readyState);
      setIsConnected(false);
    };

    ws.onclose = (event) => {
      console.log('[WebSocket] 🔌 Disconnected');
      console.log('[WebSocket] Close code:', event.code);
      console.log('[WebSocket] Close reason:', event.reason);
      console.log('[WebSocket] Was clean:', event.wasClean);
      setIsConnected(false);

      // Attempt to reconnect with exponential backoff
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        const delay = baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current);
        console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);

        reconnectTimeoutRef.current = window.setTimeout(() => {
          reconnectAttemptsRef.current++;
          connect();
        }, delay);
      } else {
        console.error('[WebSocket] Max reconnection attempts reached');
      }
    };

    wsRef.current = ws;
  }, [proxyURL]);

  useEffect(() => {
    if (proxyURL) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [proxyURL, connect]);

  return { isConnected, sendMessage };
}
