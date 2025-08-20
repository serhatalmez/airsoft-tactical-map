const { Server } = require('socket.io');
const { createServer } = require('http');

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.PRODUCTION_URL 
      : ['http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Store active connections by room
const roomConnections = new Map();
const userRooms = new Map(); // userId -> roomId

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Join room event
  socket.on('join-room', (data) => {
    const { roomId, userId } = data;
    
    // Leave previous room if exists
    const previousRoom = userRooms.get(userId);
    if (previousRoom) {
      socket.leave(previousRoom);
      const roomUsers = roomConnections.get(previousRoom);
      if (roomUsers) {
        roomUsers.delete(socket.id);
      }
    }

    // Join new room
    socket.join(roomId);
    userRooms.set(userId, roomId);
    
    if (!roomConnections.has(roomId)) {
      roomConnections.set(roomId, new Set());
    }
    roomConnections.get(roomId).add(socket.id);

    console.log(`User ${userId} joined room ${roomId}`);
    
    // Notify room about new user
    socket.to(roomId).emit('user-joined', { userId, socketId: socket.id });
    
    // Send current room status
    const roomUsers = roomConnections.get(roomId);
    socket.emit('room-status', {
      connectedUsers: roomUsers ? roomUsers.size : 0,
      roomId,
    });
  });

  // Position update event
  socket.on('position-update', (data) => {
    const { roomId } = data;
    
    // Broadcast position to all users in the room except sender
    socket.to(roomId).emit('position-update', data);
    
    console.log(`Position update from user ${data.userId} in room ${roomId}`);
  });

  // Tactical symbol events
  socket.on('symbol-create', (data) => {
    const { roomId } = data;
    
    // Broadcast new symbol to all users in the room except sender
    socket.to(roomId).emit('symbol-create', data);
    
    console.log(`Symbol created in room ${roomId}: ${data.type}`);
  });

  socket.on('symbol-update', (data) => {
    const { roomId } = data;
    
    // Broadcast symbol update to all users in the room except sender
    socket.to(roomId).emit('symbol-update', data);
    
    console.log(`Symbol updated in room ${roomId}: ${data.id}`);
  });

  socket.on('symbol-delete', (data) => {
    const { roomId, id } = data;
    
    // Broadcast symbol deletion to all users in the room except sender
    socket.to(roomId).emit('symbol-delete', { id });
    
    console.log(`Symbol deleted in room ${roomId}: ${id}`);
  });

  // Disconnect event
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // Remove from room connections
    for (const [roomId, users] of roomConnections.entries()) {
      if (users.has(socket.id)) {
        users.delete(socket.id);
        
        // Notify room about user leaving
        socket.to(roomId).emit('user-left', { socketId: socket.id });
        
        // Clean up empty rooms
        if (users.size === 0) {
          roomConnections.delete(roomId);
        }
        break;
      }
    }

    // Clean up user rooms mapping
    for (const [userId, roomId] of userRooms.entries()) {
      const roomUsers = roomConnections.get(roomId);
      if (!roomUsers || !roomUsers.has(socket.id)) {
        userRooms.delete(userId);
      }
    }
  });

  // Ping event for connection monitoring
  socket.on('ping', () => {
    socket.emit('pong');
  });
});

const PORT = process.env.SOCKET_IO_PORT || 3002;

httpServer.listen(PORT, () => {
  console.log(`🚀 Socket.IO server running on port ${PORT}`);
  console.log(`📡 CORS enabled for: ${process.env.NODE_ENV === 'production' ? process.env.PRODUCTION_URL : 'localhost:3000, localhost:3001'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    console.log('Socket.IO server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  httpServer.close(() => {
    console.log('Socket.IO server closed');
    process.exit(0);
  });
});
