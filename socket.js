const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

const initializeSocket = (server) => {
    io = socketIO(server, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:5173',
            methods: ['GET', 'POST'],
            credentials: true
        },
        pingTimeout: 60000,
        pingInterval: 25000
    });

    // Authentication middleware
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;

        if (!token) {
            return next(new Error('Authentication error'));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.id;
            socket.userRole = decoded.role;
            next();
        } catch (err) {
            next(new Error('Authentication error'));
        }
    });

    // Connection handling
    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.userId} (${socket.userRole})`);

        // Join user-specific room
        socket.join(`user:${socket.userId}`);

        // Join role-specific room
        socket.join(socket.userRole);

        // Handle disconnection
        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.userId}`);
        });

        // Handle joining job-specific rooms
        socket.on('join:job', (jobId) => {
            socket.join(`job:${jobId}`);
            console.log(`User ${socket.userId} joined job room: ${jobId}`);
        });

        // Handle leaving job-specific rooms
        socket.on('leave:job', (jobId) => {
            socket.leave(`job:${jobId}`);
            console.log(`User ${socket.userId} left job room: ${jobId}`);
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

// Emit events to specific users
const emitToUser = (userId, event, data) => {
    if (io) {
        io.to(`user:${userId}`).emit(event, data);
    }
};

// Emit events to all users of a role
const emitToRole = (role, event, data) => {
    if (io) {
        io.to(role).emit(event, data);
    }
};

// Emit events to all users watching a specific job
const emitToJob = (jobId, event, data) => {
    if (io) {
        io.to(`job:${jobId}`).emit(event, data);
    }
};

module.exports = {
    initializeSocket,
    getIO,
    emitToUser,
    emitToRole,
    emitToJob
};
