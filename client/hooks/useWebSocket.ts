'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { SocketEvent, UserPosition, TacticalSymbol } from '@/shared/types';

interface UseWebSocketOptions {
  roomId: string;
  userId: string;
  serverUrl?: string;
}

interface WebSocketState {
  socket: Socket | null;
  connected: boolean;
  connecting: boolean;
  error: string | null;
  lastPing: number | null;
}

export function useWebSocket({ roomId, userId, serverUrl = 'ws://localhost:3001' }: UseWebSocketOptions) {
  const [state, setState] = useState<WebSocketState>({
    socket: null,
    connected: false,
    connecting: false,
    error: null,
    lastPing: null,
  });

  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Event listeners
  const [onPositionUpdate, setOnPositionUpdate] = useState<((position: UserPosition) => void) | null>(null);
  const [onSymbolCreate, setOnSymbolCreate] = useState<((symbol: TacticalSymbol) => void) | null>(null);
  const [onSymbolUpdate, setOnSymbolUpdate] = useState<((symbol: TacticalSymbol) => void) | null>(null);
  const [onSymbolDelete, setOnSymbolDelete] = useState<((symbolId: string) => void) | null>(null);
  const [onMemberJoin, setOnMemberJoin] = useState<((member: any) => void) | null>(null);
  const [onMemberLeave, setOnMemberLeave] = useState<((memberId: string) => void) | null>(null);
  const [onMemberStatusChange, setOnMemberStatusChange] = useState<((memberId: string, isOnline: boolean) => void) | null>(null);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    setState(prev => ({ ...prev, connecting: true, error: null }));

    const socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      auth: {
        userId,
        roomId,
      },
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSocket connected');
      reconnectAttempts.current = 0;
      setState(prev => ({
        ...prev,
        socket,
        connected: true,
        connecting: false,
        error: null,
      }));

      // Join the room
      socket.emit('join_room', { roomId, userId });
    });

    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setState(prev => ({
        ...prev,
        connected: false,
        connecting: false,
        error: `Disconnected: ${reason}`,
      }));
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      reconnectAttempts.current++;
      
      setState(prev => ({
        ...prev,
        connected: false,
        connecting: false,
        error: error.message,
      }));

      if (reconnectAttempts.current >= maxReconnectAttempts) {
        socket.disconnect();
      }
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('WebSocket reconnected after', attemptNumber, 'attempts');
      reconnectAttempts.current = 0;
    });

    socket.on('reconnect_failed', () => {
      console.error('WebSocket reconnection failed');
      setState(prev => ({
        ...prev,
        error: 'Failed to reconnect after maximum attempts',
      }));
    });

    // Handle ping/pong for connection monitoring
    socket.on('pong', () => {
      setState(prev => ({ ...prev, lastPing: Date.now() }));
    });

    // Position update events
    socket.on('position_update', (data: UserPosition) => {
      console.log('Position update received:', data);
      onPositionUpdate?.(data);
    });

    // Symbol events
    socket.on('symbol_created', (data: TacticalSymbol) => {
      console.log('Symbol created:', data);
      onSymbolCreate?.(data);
    });

    socket.on('symbol_updated', (data: TacticalSymbol) => {
      console.log('Symbol updated:', data);
      onSymbolUpdate?.(data);
    });

    socket.on('symbol_deleted', (data: { id: string }) => {
      console.log('Symbol deleted:', data);
      onSymbolDelete?.(data.id);
    });

    // Member events
    socket.on('member_joined', (data: any) => {
      console.log('Member joined:', data);
      onMemberJoin?.(data);
    });

    socket.on('member_left', (data: { userId: string }) => {
      console.log('Member left:', data);
      onMemberLeave?.(data.userId);
    });

    socket.on('member_status_changed', (data: { userId: string; isOnline: boolean }) => {
      console.log('Member status changed:', data);
      onMemberStatusChange?.(data.userId, data.isOnline);
    });

    // Room events
    socket.on('room_updated', (data: any) => {
      console.log('Room updated:', data);
    });

    setState(prev => ({ ...prev, socket }));
  }, [serverUrl, userId, roomId, onPositionUpdate, onSymbolCreate, onSymbolUpdate, onSymbolDelete, onMemberJoin, onMemberLeave, onMemberStatusChange]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setState(prev => ({
      ...prev,
      socket: null,
      connected: false,
      connecting: false,
    }));
  }, []);

  // Emit events
  const emitPositionUpdate = useCallback((position: UserPosition) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('position_update', position);
    }
  }, []);

  const emitSymbolCreate = useCallback((symbol: Omit<TacticalSymbol, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('symbol_create', symbol);
    }
  }, []);

  const emitSymbolUpdate = useCallback((symbolId: string, updates: Partial<TacticalSymbol>) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('symbol_update', { id: symbolId, ...updates });
    }
  }, []);

  const emitSymbolDelete = useCallback((symbolId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('symbol_delete', { id: symbolId });
    }
  }, []);

  // Ping function for connection monitoring
  const ping = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('ping');
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();

    // Setup ping interval
    const pingInterval = setInterval(ping, 30000); // Ping every 30 seconds

    return () => {
      clearInterval(pingInterval);
      disconnect();
    };
  }, [connect, disconnect, ping]);

  // Reconnect when room or user changes
  useEffect(() => {
    if (socketRef.current?.connected) {
      disconnect();
      setTimeout(connect, 100);
    }
  }, [roomId, userId, connect, disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    ping,
    emitPositionUpdate,
    emitSymbolCreate,
    emitSymbolUpdate,
    emitSymbolDelete,
    // Event listener setters
    setOnPositionUpdate: (handler: (position: UserPosition) => void) => setOnPositionUpdate(() => handler),
    setOnSymbolCreate: (handler: (symbol: TacticalSymbol) => void) => setOnSymbolCreate(() => handler),
    setOnSymbolUpdate: (handler: (symbol: TacticalSymbol) => void) => setOnSymbolUpdate(() => handler),
    setOnSymbolDelete: (handler: (symbolId: string) => void) => setOnSymbolDelete(() => handler),
    setOnMemberJoin: (handler: (member: any) => void) => setOnMemberJoin(() => handler),
    setOnMemberLeave: (handler: (memberId: string) => void) => setOnMemberLeave(() => handler),
    setOnMemberStatusChange: (handler: (memberId: string, isOnline: boolean) => void) => setOnMemberStatusChange(() => handler),
  };
}

// Connection status hook
export function useConnectionStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [networkType, setNetworkType] = useState<string>('unknown');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    const updateNetworkInfo = () => {
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        setNetworkType(connection.effectiveType || 'unknown');
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    if ('connection' in navigator) {
      (navigator as any).connection.addEventListener('change', updateNetworkInfo);
      updateNetworkInfo();
    }

    updateOnlineStatus();

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      
      if ('connection' in navigator) {
        (navigator as any).connection.removeEventListener('change', updateNetworkInfo);
      }
    };
  }, []);

  return {
    isOnline,
    networkType,
  };
}
