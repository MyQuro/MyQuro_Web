import { Server as SocketServer, Socket } from "socket.io";
import { auth } from "../auth/auth.js";
import { fromNodeHeaders } from "better-auth/node";

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  restaurantId?: string;
}

let ioInstance: SocketServer | null = null;

export function initializeSocket(io: SocketServer) {
  ioInstance = io;

  // Middleware for authentication
  io.use(async (socket: AuthenticatedSocket, next) => {
    console.log('🔌 [WebSocket Auth] Starting authentication for socket:', socket.id);

    try {
      // Get user session from handshake
      const authToken = socket.handshake.auth?.sessionToken;
      console.log('🔌 [WebSocket Auth] Auth token from handshake.auth:', authToken ? 'present' : 'missing');

      const cookieHeader = socket.handshake.headers?.cookie;
      console.log('🔌 [WebSocket Auth] Cookie header present:', !!cookieHeader);

      let sessionToken: string | undefined;
      let cookieName: string = 'better-auth.session_token';

      if (authToken) {
        sessionToken = authToken;
        console.log('🔌 [WebSocket Auth] Using token from handshake.auth');
      } else if (cookieHeader) {
        // Handle both standard and '__Secure-' prefixed cookies in production
        const match = cookieHeader.match(/((?:__Secure-|_Host-)?better-auth\.session_token)=([^;]+)/);
        if (match) {
          cookieName = match[1];
          sessionToken = match[2];
        }
        console.log('🔌 [WebSocket Auth] Extracted token from cookie:', sessionToken ? 'present' : 'missing');
      }

      console.log('🔌 [WebSocket Auth] Final session token:', sessionToken ? `${sessionToken.substring(0, 10)}...` : 'null');

      if (!sessionToken) {
        console.log('🔌 [WebSocket Auth] ERROR: No session token provided');
        console.log('🔌 [WebSocket Auth] handshake.auth:', JSON.stringify(socket.handshake.auth, null, 2));
        console.log('🔌 [WebSocket Auth] handshake.headers.cookie:', cookieHeader);
        return next(new Error('Authentication required'));
      }

      console.log('🔌 [WebSocket Auth] Validating session token...');

      // Validate session token using Better Auth
      const session = await auth.api.getSession({
        headers: fromNodeHeaders({
          cookie: `${cookieName}=${sessionToken}`,
        }),
      });

      console.log('🔌 [WebSocket Auth] Session validation result:', {
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id,
        sessionKeys: session ? Object.keys(session) : []
      });

      if (!session?.user) {
        console.log('🔌 [WebSocket Auth] ERROR: Invalid session token');
        console.log('🔌 [WebSocket Auth] Session object:', JSON.stringify(session, null, 2));
        return next(new Error('Invalid session'));
      }

      // Store user ID on socket for later use
      socket.userId = session.user.id;
      console.log('🔌 [WebSocket Auth] SUCCESS: Authenticated user:', session.user.id);
      next();
    } catch (error) {
      console.error('🔌 [WebSocket Auth] ERROR: Authentication failed:', error);
      console.error('🔌 [WebSocket Auth] Error stack:', error.stack);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log('🔌 Client connected:', socket.id);

    // Join restaurant room
    socket.on('join-restaurant', (restaurantId: string) => {
      if (restaurantId) {
        socket.restaurantId = restaurantId;
        socket.join(`restaurant:${restaurantId}`);
        console.log(`🔌 Socket ${socket.id} joined restaurant room: ${restaurantId}`);
        socket.emit('joined-room', { restaurantId });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('🔌 Client disconnected:', socket.id);
    });

    // Ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong');
    });
  });

  console.log('🔌 WebSocket server initialized');
}

// Helper functions to emit events to specific restaurant rooms
export function emitToRestaurant(restaurantId: string, event: string, data: any) {
  if (!ioInstance) {
    console.warn('🔌 Socket.IO not initialized');
    return;
  }
  ioInstance.to(`restaurant:${restaurantId}`).emit(event, data);
  console.log(`📡 Emitted ${event} to restaurant ${restaurantId}:`, data);
}

export function emitToAllRestaurants(event: string, data: any) {
  if (!ioInstance) {
    console.warn('🔌 Socket.IO not initialized');
    return;
  }
  ioInstance.emit(event, data);
  console.log(`📡 Emitted ${event} to all restaurants:`, data);
}