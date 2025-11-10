import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { getRoom, joinRoom, leaveRoom, listUsers, generateColor, generateUsername } from './rooms.js';
import { createDrawingState } from './drawingState.js';

const users = [];

const addUser = ({ id, name, room }) => {
  const existingUser = users.find((user) => user.room === room && user.name === name);

  if (existingUser) {
    return { error: 'Username is taken.' };
  }

  const user = { id, name, room };
  users.push(user);
  return { user };
};

const removeUser = (id) => {
  const index = users.findIndex((user) => user.id === id);

  if (index !== -1) {
    return users.splice(index, 1)[0];
  }
};

const getUser = (id) => users.find((user) => user.id === id);

const getUsersInRoom = (room) => users.filter((user) => user.room === room);

import fs from 'fs';
import path from 'path';

const __dirname = path.resolve();

const dirs = [
  path.join(__dirname, 'server', 'models'),
  path.join(__dirname, 'server', 'routes'),
  path.join(__dirname, 'server', 'controllers'),
  path.join(__dirname, 'server', 'middleware'),
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});
import fs from 'fs';
import path from 'path';

const __dirname = path.resolve();

const dirs = [
  path.join(__dirname, 'server', 'models'),
  path.join(__dirname, 'server', 'routes'),
  path.join(__dirname, 'server', 'controllers'),
  path.join(__dirname, 'server', 'middleware'),
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors());

const authenticated = (req, res, next) => {
  // In a real application, you would use a more robust authentication mechanism, such as tokens or sessions.
  // For this example, we'll just check for the presence of a user object in the request.
  if (req.user) {
    next();
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
};
app.use(express.json());

app.post('/register', (req, res) => {
  res.send('Register route');
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;

  // In a real application, you would validate the user's credentials against a database.
  // For this example, we'll just check if the email and password are not empty.
  if (email && password) {
    const user = { email };
    res.json(user);
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});
app.post('/logout', (req, res) => {
  res.send('Logout route');
});

app.get('/', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/canvas', cors(), authenticated, (req, res) => {
  res.send('Collaborative canvas');
});

app.put('/profile', (req, res) => {
  const { email, name, bio } = req.body;

  // In a real application, you would update the user's profile in a database.
  // For this example, we'll just log the new profile information to the console.
  console.log('Updating profile for:', email);
  console.log('New profile information:', { name, bio });

  res.json({ message: 'Profile updated successfully' });
});

// Health check endpoint for monitoring
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    rooms: rooms.size,
    totalUsers: Array.from(rooms.values()).reduce((total, room) => total + room.users.size, 0)
  });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { 
    origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'], 
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

const rooms = new Map();

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  let currentRoomId = null;
  let userInfo = null;

  socket.on('join_room', ({ roomId, username }) => {
    const rid = roomId && String(roomId).trim() !== '' ? String(roomId) : 'default';
    currentRoomId = rid;

    if (!rooms.has(rid)) {
      rooms.set(rid, {
        users: new Map(),
        cursors: new Map(),
        inProgress: new Map(), // userId -> { tool, color, width, path: [{x,y}] }
        state: createDrawingState()
      });
    }

    const room = rooms.get(rid);
    const color = generateColor(room.users.size);
    const name = username && username.trim() ? username.trim() : generateUsername();

    userInfo = { userId: socket.id, username: name, color };

    joinRoom(room, socket.id, userInfo);
    socket.join(rid);

    const payload = { ops: room.state.getState(), users: listUsers(room) };
    socket.emit('room_state', payload);

    io.to(rid).emit('update_users', { users: listUsers(room) });
  });

  socket.on('start_stroke', (data) => {
    const room = getRoom(rooms, currentRoomId);
    if (!room) return;
    const { x, y, color, width, tool } = data;
    room.inProgress.set(socket.id, { tool, color, width, path: [{ x, y }] });
    socket.to(currentRoomId).emit('draw_stroke', { ...data, userId: socket.id });
  });

  socket.on('draw_stroke', (data) => {
    const room = getRoom(rooms, currentRoomId);
    if (!room) return;
    const stroke = room.inProgress.get(socket.id);
    if (stroke && Array.isArray(data.pathChunk)) {
      stroke.path.push(...data.pathChunk.map(p => ({ x: p.x, y: p.y })));
    }
    socket.to(currentRoomId).emit('draw_stroke', { ...data, userId: socket.id });
  });

  socket.on('end_stroke', (_data) => {
    const room = getRoom(rooms, currentRoomId);
    if (!room) return;
    const stroke = room.inProgress.get(socket.id);
    if (!stroke) return;
    const op = {
      opId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId: socket.id,
      type: 'stroke',
      data: stroke,
      timestamp: Date.now()
    };
    room.state.applyOp(op);
    room.inProgress.delete(socket.id);
    socket.to(currentRoomId).emit('draw_stroke', { userId: socket.id, end: true, ...stroke });
  });

  socket.on('cursor_move', ({ x, y }) => {
    const room = getRoom(rooms, currentRoomId);
    if (!room) return;
    room.cursors.set(socket.id, { userId: socket.id, x, y, color: userInfo?.color });
    socket.to(currentRoomId).emit('cursor_move', { userId: socket.id, x, y, color: userInfo?.color });
  });

  socket.on('ping', (_data, cb) => {
    if (typeof cb === 'function') cb();
  });

  socket.on('undo', () => {
    const room = getRoom(rooms, currentRoomId);
    if (!room) return;
    room.state.undoLast();
    io.to(currentRoomId).emit('room_state', { ops: room.state.getState(), users: listUsers(room) });
  });

  socket.on('redo', () => {
    const room = getRoom(rooms, currentRoomId);
    if (!room) return;
    room.state.redoLast();
    io.to(currentRoomId).emit('room_state', { ops: room.state.getState(), users: listUsers(room) });
  });

  socket.on('clear', () => {
    const room = getRoom(rooms, currentRoomId);
    if (!room) return;
    room.state.clearCanvas(socket.id);
    io.to(currentRoomId).emit('room_state', { ops: room.state.getState(), users: listUsers(room) });
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    if (!currentRoomId) return;
    const room = getRoom(rooms, currentRoomId);
    if (!room) return;
    leaveRoom(room, socket.id);
    io.to(currentRoomId).emit('update_users', { users: listUsers(room) });
    if (room.users.size === 0) {
      // Optional: keep memory to allow restore on rejoin
      console.log(`Room ${currentRoomId} is now empty`);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
