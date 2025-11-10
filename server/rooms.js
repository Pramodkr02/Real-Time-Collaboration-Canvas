export function getRoom(rooms, roomId) {
  if (!roomId) return null;
  return rooms.get(roomId) || null;
}

export function joinRoom(room, socketId, userInfo) {
  room.users.set(socketId, userInfo);
}

export function leaveRoom(room, socketId) {
  room.users.delete(socketId);
  room.cursors.delete(socketId);
}

export function listUsers(room) {
  return Array.from(room.users.values());
}

const palette = [
  '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f43f5e', '#22c55e', '#06b6d4'
];

export function generateColor(idx = 0) {
  return palette[idx % palette.length];
}

export function generateUsername() {
  const animals = ['Fox', 'Panda', 'Otter', 'Hawk', 'Wolf', 'Lion', 'Tiger', 'Falcon'];
  const n = Math.floor(Math.random() * 900) + 100;
  return `${animals[Math.floor(Math.random() * animals.length)]}${n}`;
}
