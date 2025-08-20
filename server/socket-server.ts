import { createServer } from 'http';
import { Server } from 'socket.io';
import { SocketEvent, UserPosition, TacticalSymbol } from '../shared/types/index.js';

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Store active rooms and users
interface RoomData {
  id: string;
  members: Map<string, {
    userId: string;
    socketId: string;
    username: string;
    isOnline: boolean;
    lastSeen: Date;
    position?: UserPosition;
  }>;
  symbols: Map<string, TacticalSymbol>;
}

const activeRooms = new Map<string, RoomData>();

// Utility functions
function getRoomData(roomId: string): RoomData {
  if (!activeRooms.has(roomId)) {
    activeRooms.set(roomId, {
      id: roomId,
      members: new Map(),
      symbols: new Map(),
    });
  }
  return activeRooms.get(roomId)!;
}

function cleanupRoom(roomId: string) {
  const room = activeRooms.get(roomId);
  if (room && room.members.size === 0) {
    activeRooms.delete(roomId);
    console.log(`Room ${roomId} cleaned up`);
  }
}

function broadcastToRoom(roomId: string, event: string, data: any, excludeSocketId?: string) {
  const room = activeRooms.get(roomId);
  if (!room) return;

  room.members.forEach((member) => {
    if (member.socketId !== excludeSocketId) {
      io.to(member.socketId).emit(event, data);
    }
  });
}

// Socket connection handling
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);
  
  let currentUserId: string | null = null;
  let currentRoomId: string | null = null;

  // Join room
  socket.on('join_room', ({ roomId, userId, username }) => {
    try {
      console.log(`User ${userId} joining room ${roomId}`);
      
      // Leave previous room if any
      if (currentRoomId && currentUserId) {
        leaveRoom(currentRoomId, currentUserId, socket.id);
      }

      currentUserId = userId;
      currentRoomId = roomId;

      const room = getRoomData(roomId);
      
      // Add user to room
      room.members.set(userId, {
        userId,
        socketId: socket.id,
        username: username || 'Unknown',
        isOnline: true,
        lastSeen: new Date(),
      });

      // Join socket room
      socket.join(roomId);

      // Notify others about new member
      broadcastToRoom(roomId, 'member_joined', {
        userId,
        username,
        isOnline: true,
        joinedAt: new Date().toISOString(),
      }, socket.id);

      // Send current room state to the new member
      const roomState = {
        members: Array.from(room.members.values()).map(member => ({
          userId: member.userId,
          username: member.username,
          isOnline: member.isOnline,
          lastSeen: member.lastSeen.toISOString(),
          position: member.position,
        })),
        symbols: Array.from(room.symbols.values()),
      };

      socket.emit('room_state', roomState);
      socket.emit('join_room_success', { roomId, userId });

      console.log(`User ${userId} joined room ${roomId}. Room now has ${room.members.size} members.`);
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('join_room_error', { message: 'Failed to join room' });
    }
  });

  // Position update
  socket.on('position_update', (positionData: UserPosition) => {
    try {
      if (!currentRoomId || !currentUserId) {
        socket.emit('error', { message: 'Not in a room' });
        return;
      }

      const room = getRoomData(currentRoomId);
      const member = room.members.get(currentUserId);
      
      if (member) {
        member.position = positionData;
        member.lastSeen = new Date();

        // Broadcast position update to other room members
        broadcastToRoom(currentRoomId, 'position_update', positionData, socket.id);
        
        console.log(`Position updated for user ${currentUserId} in room ${currentRoomId}`);
      }
    } catch (error) {
      console.error('Error updating position:', error);
      socket.emit('error', { message: 'Failed to update position' });
    }
  });

  // Symbol creation
  socket.on('symbol_create', (symbolData: Omit<TacticalSymbol, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (!currentRoomId || !currentUserId) {
        socket.emit('error', { message: 'Not in a room' });
        return;
      }

      const symbolId = `symbol_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const symbol: TacticalSymbol = {
        ...symbolData,
        id: symbolId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const room = getRoomData(currentRoomId);
      room.symbols.set(symbolId, symbol);

      // Broadcast symbol creation to all room members
      broadcastToRoom(currentRoomId, 'symbol_created', symbol);
      
      console.log(`Symbol created by user ${currentUserId} in room ${currentRoomId}`);
    } catch (error) {
      console.error('Error creating symbol:', error);
      socket.emit('error', { message: 'Failed to create symbol' });
    }
  });

  // Symbol update
  socket.on('symbol_update', ({ id, ...updates }: { id: string } & Partial<TacticalSymbol>) => {
    try {
      if (!currentRoomId || !currentUserId) {
        socket.emit('error', { message: 'Not in a room' });
        return;
      }

      const room = getRoomData(currentRoomId);
      const symbol = room.symbols.get(id);
      
      if (!symbol) {
        socket.emit('error', { message: 'Symbol not found' });
        return;
      }

      // Update symbol
      const updatedSymbol = {
        ...symbol,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      room.symbols.set(id, updatedSymbol);

      // Broadcast symbol update to all room members
      broadcastToRoom(currentRoomId, 'symbol_updated', updatedSymbol);
      
      console.log(`Symbol ${id} updated by user ${currentUserId} in room ${currentRoomId}`);
    } catch (error) {
      console.error('Error updating symbol:', error);
      socket.emit('error', { message: 'Failed to update symbol' });
    }
  });

  // Symbol deletion
  socket.on('symbol_delete', ({ id }: { id: string }) => {
    try {
      if (!currentRoomId || !currentUserId) {
        socket.emit('error', { message: 'Not in a room' });
        return;
      }

      const room = getRoomData(currentRoomId);
      const symbol = room.symbols.get(id);
      
      if (!symbol) {
        socket.emit('error', { message: 'Symbol not found' });
        return;
      }

      room.symbols.delete(id);

      // Broadcast symbol deletion to all room members
      broadcastToRoom(currentRoomId, 'symbol_deleted', { id });
      
      console.log(`Symbol ${id} deleted by user ${currentUserId} in room ${currentRoomId}`);
    } catch (error) {
      console.error('Error deleting symbol:', error);
      socket.emit('error', { message: 'Failed to delete symbol' });
    }
  });

  // Ping/Pong for connection monitoring
  socket.on('ping', () => {
    socket.emit('pong');
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`Socket disconnected: ${socket.id}, reason: ${reason}`);
    
    if (currentRoomId && currentUserId) {
      leaveRoom(currentRoomId, currentUserId, socket.id);
    }
  });

  // Helper function to handle leaving room
  function leaveRoom(roomId: string, userId: string, socketId: string) {
    const room = activeRooms.get(roomId);
    if (!room) return;

    const member = room.members.get(userId);
    if (member && member.socketId === socketId) {
      room.members.delete(userId);
      
      // Notify others about member leaving
      broadcastToRoom(roomId, 'member_left', {
        userId,
        leftAt: new Date().toISOString(),
      });

      console.log(`User ${userId} left room ${roomId}. Room now has ${room.members.size} members.`);
      
      // Clean up empty room
      cleanupRoom(roomId);
    }
  }
});

// Health check endpoint
httpServer.on('request', (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      activeRooms: activeRooms.size,
      totalConnections: io.engine.clientsCount,
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

// Start server
const PORT = process.env.SOCKET_PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Socket.io server running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    console.log('Socket.io server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  httpServer.close(() => {
    console.log('Socket.io server closed');
    process.exit(0);
  });
});

export default io;
