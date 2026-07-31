"use client";

import { createContext, useContext, ReactNode, useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinRestaurant: (restaurantId: string) => void;
  leaveRestaurant: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const connectWebSocket = () => {
      // Clean up existing connection
      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 
        (typeof window !== 'undefined' && window.location.hostname.includes('onrender.com') 
          ? 'https://api.myquro.com' 
          : 'http://localhost:4000');
      // Convert HTTP/HTTPS to WS/WSS
      const socketUrl = backendUrl.replace(/^http/, 'ws');

      console.log('🔌 Connecting to WebSocket:', socketUrl);

      // Extract session token from cookies
      const cookies = document.cookie.split(';');
      let sessionToken = null;
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'better-auth.session_token' || name.endsWith('better-auth.session_token')) {
          sessionToken = value;
          break;
        }
      }
      
      console.log('🔌 [Frontend WebSocket] All cookies:', document.cookie);
      console.log('🔌 [Frontend WebSocket] Extracted session token:', sessionToken ? `${sessionToken.substring(0, 10)}...` : 'null');
      console.log('🔌 [Frontend WebSocket] Current domain:', window.location.hostname);
      console.log('🔌 [Frontend WebSocket] Cookie domain check - looking for better-auth.session_token');

      const newSocket = io(socketUrl, {
        auth: {
          sessionToken: sessionToken
        },
        withCredentials: true,
        transports: ['websocket', 'polling'],
        timeout: 5000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      socketRef.current = newSocket;
      setSocket(newSocket);

      newSocket.on('connect', () => {
        console.log('🔌 WebSocket connected successfully');
        setIsConnected(true);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('🔌 WebSocket disconnected:', reason);
        setIsConnected(false);
        // Attempt to reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('🔌 Attempting to reconnect WebSocket...');
          connectWebSocket();
        }, 5000);
      });

      newSocket.on('connect_error', (error) => {
        console.error('🔌 WebSocket connection error:', error);
        setIsConnected(false);
      });
    };

    connectWebSocket();

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  const joinRestaurant = (restaurantId: string) => {
    if (socket && restaurantId) {
      socket.emit('join-restaurant', restaurantId);
      console.log(`🔌 Joined restaurant room: ${restaurantId}`);
    }
  };

  const leaveRestaurant = () => {
    if (socket) {
      socket.emit('leave-restaurant');
      console.log('🔌 Left restaurant room');
    }
  };

  const value: WebSocketContextType = {
    socket,
    isConnected,
    joinRestaurant,
    leaveRestaurant,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
}