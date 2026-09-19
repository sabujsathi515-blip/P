import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Initial pre-populated demo contacts
const DEMO_USERS = [
  {
    userId: 'demo-user-1',
    name: 'Sarah Connor',
    email: 'sarah@connectcall.io',
    phoneNumber: '+880 1711-234567',
    photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    about: 'Always ready for an audio or video call! 🚀',
    online: true,
    lastSeen: Date.now(),
    createdAt: Date.now() - 86400000 * 7,
  },
  {
    userId: 'demo-user-2',
    name: 'Alex Vance',
    email: 'alex@connectcall.io',
    phoneNumber: '+880 1812-345678',
    photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    about: 'Working on WebRTC & real-time communication.',
    online: true,
    lastSeen: Date.now() - 1000 * 60 * 3,
    createdAt: Date.now() - 86400000 * 5,
  },
  {
    userId: 'demo-user-3',
    name: 'David Chen',
    email: 'david@connectcall.io',
    phoneNumber: '+1 (555) 345-6789',
    photoURL: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    about: 'Available during regular office hours.',
    online: false,
    lastSeen: Date.now() - 1000 * 60 * 45,
    createdAt: Date.now() - 86400000 * 3,
  },
  {
    userId: 'demo-user-4',
    name: 'Elena Rostova',
    email: 'elena@connectcall.io',
    phoneNumber: '+44 7700 900123',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    about: 'Design & UX lead at ConnectCall 🎨',
    online: true,
    lastSeen: Date.now(),
    createdAt: Date.now() - 86400000 * 2,
  },
];

// In-Memory Data Store (shared across all devices & clients)
const dbStore = {
  users: new Map<string, any>(DEMO_USERS.map((u) => [u.userId, u])),
  chats: new Map<string, any>(),
  messages: new Map<string, any[]>(), // chatId -> Message[]
  callRooms: new Map<string, any>(), // roomId -> CallRoom
  callHistory: [] as any[],
};

// SSE active connections (userId -> Set<express.Response>)
const sseConnections = new Map<string, Set<express.Response>>();

function broadcastToUser(userId: string, event: string, data: any) {
  const userClients = sseConnections.get(userId);
  if (userClients && userClients.size > 0) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of userClients) {
      try {
        res.write(payload);
      } catch (err) {
        console.warn('Error writing SSE to user', userId, err);
      }
    }
  }
}

function broadcastToUsers(userIds: string[], event: string, data: any) {
  for (const uid of userIds) {
    broadcastToUser(uid, event, data);
  }
}

function broadcastToAll(event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const [, clientSet] of sseConnections) {
    for (const res of clientSet) {
      try {
        res.write(payload);
      } catch (err) {
        // ignore
      }
    }
  }
}

// ----------------- API ENDPOINTS -----------------

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    users: dbStore.users.size,
    chats: dbStore.chats.size,
    activeRooms: dbStore.callRooms.size,
    connectedClients: Array.from(sseConnections.values()).reduce((acc, s) => acc + s.size, 0),
  });
});

// SSE Real-time Stream
app.get('/api/realtime', (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) {
    return res.status(400).send('userId query parameter required');
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Register client
  if (!sseConnections.has(userId)) {
    sseConnections.set(userId, new Set());
  }
  sseConnections.get(userId)!.add(res);

  // Send initial handshake
  res.write(`event: connected\ndata: ${JSON.stringify({ userId, timestamp: Date.now() })}\n\n`);

  // Check and push any pending incoming call for this user
  const now = Date.now();
  for (const room of dbStore.callRooms.values()) {
    if (
      room.receiverId === userId &&
      (room.status === 'calling' || room.status === 'ringing') &&
      now - room.createdAt < 45000
    ) {
      res.write(`event: incoming_call\ndata: ${JSON.stringify(room)}\n\n`);
    }
  }

  // Heartbeat every 15 seconds to keep connection alive
  const heartbeat = setInterval(() => {
    try {
      res.write(`event: ping\ndata: ${Date.now()}\n\n`);
    } catch {
      clearInterval(heartbeat);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    const clientSet = sseConnections.get(userId);
    if (clientSet) {
      clientSet.delete(res);
      if (clientSet.size === 0) {
        sseConnections.delete(userId);
      }
    }
  });
});

// USERS: List all registered & demo users
app.get('/api/users', (req, res) => {
  const users = Array.from(dbStore.users.values());
  res.json(users);
});

// USERS: Sync / Register / Update profile
app.post('/api/users/sync', (req, res) => {
  const profile = req.body;
  if (!profile || !profile.userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const existing = dbStore.users.get(profile.userId) || {};
  const updated = {
    ...existing,
    ...profile,
    lastSeen: Date.now(),
  };
  dbStore.users.set(profile.userId, updated);
  broadcastToAll('user_update', updated);
  res.json(updated);
});

// USERS: Update online or call status
app.post('/api/users/status', (req, res) => {
  const { userId, online, inCall, activeCallRoomId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const user = dbStore.users.get(userId);
  if (user) {
    if (online !== undefined) user.online = online;
    if (inCall !== undefined) user.inCall = inCall;
    if (activeCallRoomId !== undefined) user.activeCallRoomId = activeCallRoomId;
    user.lastSeen = Date.now();
    dbStore.users.set(userId, user);
    broadcastToAll('user_update', user);
  }
  res.json({ success: true });
});

// CHATS: Get chats for a user
app.get('/api/chats', (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: 'userId query param required' });

  const userChats: any[] = [];
  for (const chat of dbStore.chats.values()) {
    if (chat.participants && chat.participants.includes(userId)) {
      userChats.push(chat);
    }
  }
  userChats.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  res.json(userChats);
});

// CHATS: Create or get chat
app.post('/api/chats', (req, res) => {
  const chatData = req.body;
  if (!chatData || !chatData.chatId) {
    return res.status(400).json({ error: 'chatId is required' });
  }

  let chat = dbStore.chats.get(chatData.chatId);
  if (!chat) {
    chat = {
      ...chatData,
      updatedAt: Date.now(),
      unreadCount: chatData.unreadCount || {},
    };
    dbStore.chats.set(chatData.chatId, chat);
  } else {
    // Merge participant details if provided
    if (chatData.participantDetails) {
      chat.participantDetails = {
        ...chat.participantDetails,
        ...chatData.participantDetails,
      };
    }
  }

  res.json(chat);
});

// MESSAGES: Get messages in a chat
app.get('/api/chats/:chatId/messages', (req, res) => {
  const { chatId } = req.params;
  const msgs = dbStore.messages.get(chatId) || [];
  res.json(msgs);
});

// MESSAGES: Send message
app.post('/api/chats/:chatId/messages', (req, res) => {
  const { chatId } = req.params;
  const message = req.body;

  if (!message || !message.messageId) {
    return res.status(400).json({ error: 'messageId is required' });
  }

  const msgs = dbStore.messages.get(chatId) || [];
  msgs.push(message);
  dbStore.messages.set(chatId, msgs);

  // Update chat summary
  let chat = dbStore.chats.get(chatId);
  if (!chat) {
    chat = {
      chatId,
      participants: [message.senderId, message.receiverId],
      updatedAt: message.timestamp || Date.now(),
      unreadCount: {},
    };
    dbStore.chats.set(chatId, chat);
  }

  chat.lastMessage = {
    text: message.text,
    timestamp: message.timestamp || Date.now(),
    senderId: message.senderId,
    status: message.status || 'sent',
  };
  chat.updatedAt = message.timestamp || Date.now();
  chat.unreadCount = chat.unreadCount || {};
  chat.unreadCount[message.receiverId] = (chat.unreadCount[message.receiverId] || 0) + 1;
  chat.typingUsers = chat.typingUsers || {};
  chat.typingUsers[message.senderId] = false;

  // Real-time notify both receiver and sender
  broadcastToUsers(
    [message.receiverId, message.senderId],
    'new_message',
    { chatId, message, chat }
  );

  res.json(message);
});

// MESSAGES: Delete message
app.delete('/api/chats/:chatId/messages/:messageId', (req, res) => {
  const { chatId, messageId } = req.params;
  const msgs = dbStore.messages.get(chatId) || [];
  const filtered = msgs.filter((m) => m.messageId !== messageId);
  dbStore.messages.set(chatId, filtered);

  const chat = dbStore.chats.get(chatId);
  if (chat && chat.participants) {
    broadcastToUsers(chat.participants, 'message_deleted', { chatId, messageId });
  }

  res.json({ success: true });
});

// MESSAGES: Mark messages as seen
app.post('/api/chats/:chatId/seen', (req, res) => {
  const { chatId } = req.params;
  const { userId } = req.body;

  const msgs = dbStore.messages.get(chatId) || [];
  let updated = false;
  for (const m of msgs) {
    if (m.receiverId === userId && m.status !== 'seen') {
      m.status = 'seen';
      updated = true;
    }
  }

  const chat = dbStore.chats.get(chatId);
  if (chat) {
    chat.unreadCount = chat.unreadCount || {};
    chat.unreadCount[userId] = 0;
    if (chat.participants) {
      broadcastToUsers(chat.participants, 'messages_seen', { chatId, userId });
    }
  }

  res.json({ success: true, updated });
});

// CHATS: Typing status
app.post('/api/chats/:chatId/typing', (req, res) => {
  const { chatId } = req.params;
  const { userId, isTyping } = req.body;

  const chat = dbStore.chats.get(chatId);
  if (chat) {
    chat.typingUsers = chat.typingUsers || {};
    chat.typingUsers[userId] = isTyping;
    if (chat.participants) {
      const otherParticipants = chat.participants.filter((p: string) => p !== userId);
      broadcastToUsers(otherParticipants, 'typing', { chatId, userId, isTyping });
    }
  }
  res.json({ success: true });
});

// CALLS: Initiate call
app.post('/api/calls/initiate', (req, res) => {
  const roomData = req.body;
  if (!roomData || !roomData.roomId || !roomData.receiverId) {
    return res.status(400).json({ error: 'roomId and receiverId are required' });
  }

  const room = {
    ...roomData,
    status: roomData.status || 'calling',
    createdAt: roomData.createdAt || Date.now(),
    callerCandidates: roomData.callerCandidates || [],
    receiverCandidates: roomData.receiverCandidates || [],
  };

  dbStore.callRooms.set(room.roomId, room);

  // Mark caller as in call
  const caller = dbStore.users.get(room.callerId);
  if (caller) {
    caller.inCall = true;
    caller.activeCallRoomId = room.roomId;
    broadcastToAll('user_update', caller);
  }

  // Broadcast incoming call event directly to the receiver in real time!
  broadcastToUser(room.receiverId, 'incoming_call', room);
  broadcastToUser(room.callerId, 'call_update', room);

  res.json(room);
});

// CALLS: Get Call Room
app.get('/api/calls/room/:roomId', (req, res) => {
  const { roomId } = req.params;
  const room = dbStore.callRooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json(room);
});

// CALLS: Answer Call
app.post('/api/calls/room/:roomId/answer', (req, res) => {
  const { roomId } = req.params;
  const { answer } = req.body;

  const room = dbStore.callRooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  room.answer = answer;
  room.status = 'connected';
  room.connectedAt = Date.now();

  // Mark receiver as inCall
  const receiver = dbStore.users.get(room.receiverId);
  if (receiver) {
    receiver.inCall = true;
    receiver.activeCallRoomId = roomId;
    broadcastToAll('user_update', receiver);
  }

  // Notify both caller and receiver immediately
  broadcastToUsers([room.callerId, room.receiverId], 'call_update', room);

  res.json(room);
});

// CALLS: Add ICE Candidate
app.post('/api/calls/room/:roomId/candidate', (req, res) => {
  const { roomId } = req.params;
  const { candidate, isCaller } = req.body;

  const room = dbStore.callRooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const key = isCaller ? 'callerCandidates' : 'receiverCandidates';
  room[key] = room[key] || [];
  room[key].push(candidate);

  // Send update to the opposing party
  const targetUserId = isCaller ? room.receiverId : room.callerId;
  broadcastToUser(targetUserId, 'call_update', room);

  res.json({ success: true });
});

// CALLS: Update Call Status (ringing, ended, declined, missed, busy, failed)
app.post('/api/calls/room/:roomId/status', (req, res) => {
  const { roomId } = req.params;
  const { status, duration } = req.body;

  const room = dbStore.callRooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  room.status = status;
  if (duration !== undefined) room.duration = duration;
  if (['ended', 'declined', 'missed', 'failed', 'busy'].includes(status)) {
    room.endedAt = Date.now();

    // Release caller and receiver from call state
    const caller = dbStore.users.get(room.callerId);
    if (caller) {
      caller.inCall = false;
      caller.activeCallRoomId = null;
      broadcastToAll('user_update', caller);
    }
    const receiver = dbStore.users.get(room.receiverId);
    if (receiver) {
      receiver.inCall = false;
      receiver.activeCallRoomId = null;
      broadcastToAll('user_update', receiver);
    }
  }

  broadcastToUsers([room.callerId, room.receiverId], 'call_update', room);

  res.json(room);
});

// CALLS: Check active incoming call for user
app.get('/api/calls/incoming', (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: 'userId query param required' });

  const now = Date.now();
  let activeIncoming = null;
  for (const room of dbStore.callRooms.values()) {
    if (
      room.receiverId === userId &&
      (room.status === 'calling' || room.status === 'ringing') &&
      now - room.createdAt < 45000
    ) {
      activeIncoming = room;
      break;
    }
  }

  res.json(activeIncoming);
});

// CALLS: Record Call History
app.post('/api/calls/history', (req, res) => {
  const record = req.body;
  if (!record || !record.callId) {
    return res.status(400).json({ error: 'callId required' });
  }
  dbStore.callHistory.unshift(record);
  broadcastToUsers([record.callerId, record.receiverId], 'call_history_updated', record);
  res.json(record);
});

// CALLS: Get Call History for user
app.get('/api/calls/history', (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: 'userId query param required' });

  const userHistory = dbStore.callHistory.filter(
    (c) => c.callerId === userId || c.receiverId === userId
  );
  res.json(userHistory);
});

// ----------------- VITE MIDDLEWARE & SERVER START -----------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ConnectCall full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
