const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Mock data
const mockAgents = [
  {
    id: 'agent-1',
    name: 'Claude',
    description: 'Anthropic Claude - Advanced reasoning and coding',
    configuration: { model: 'claude-3-sonnet' },
    status: 'idle',
    capabilities: []
  },
  {
    id: 'agent-2', 
    name: 'GPT-4',
    description: 'OpenAI GPT-4 - Powerful language model',
    configuration: { model: 'gpt-4' },
    status: 'idle',
    capabilities: []
  },
  {
    id: 'agent-3',
    name: 'Gemini',
    description: 'Google Gemini - Multimodal AI assistant', 
    configuration: { model: 'gemini-pro' },
    status: 'idle',
    capabilities: []
  }
];

const mockConversations = new Map();
const mockMessages = new Map();

// Mock user data
const mockUser = {
  id: 'user-1',
  username: 'testuser',
  email: 'test@example.com',
  role: 'user',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok' });
});

// Auth endpoints
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Mock authentication - accept any email/password for testing
  if (email && password) {
    const token = 'mock-jwt-token-' + Date.now();
    
    // Set cookie for authentication
    res.cookie('auth-token', token, {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    res.json({
      success: true,
      data: {
        user: mockUser,
        token
      }
    });
  } else {
    res.status(400).json({
      success: false,
      error: 'Email and password are required'
    });
  }
});

app.post('/api/auth/signup', (req, res) => {
  const { username, email, password } = req.body;
  
  // Mock signup - accept any valid data
  if (username && email && password) {
    const token = 'mock-jwt-token-' + Date.now();
    
    const newUser = {
      ...mockUser,
      username,
      email,
      id: 'user-' + Date.now()
    };
    
    // Set cookie for authentication
    res.cookie('auth-token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    
    res.json({
      success: true,
      data: {
        user: newUser,
        token
      }
    });
  } else {
    res.status(400).json({
      success: false,
      error: 'Username, email and password are required'
    });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('auth-token');
  res.json({ success: true });
});

app.get('/api/auth/me', (req, res) => {
  const token = req.cookies['auth-token'];
  
  if (token) {
    res.json({
      success: true,
      data: { user: mockUser }
    });
  } else {
    res.status(401).json({
      success: false,
      error: 'Not authenticated'
    });
  }
});

// Get agents
app.get('/api/agents', (req, res) => {
  res.json({ success: true, data: mockAgents });
});

// Create conversation
app.post('/api/conversations', (req, res) => {
  const { agentId, title } = req.body;
  const conversationId = 'conv-' + Date.now();
  
  const conversation = {
    id: conversationId,
    agentId,
    title,
    userId: 'user-1',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    messages: []
  };
  
  mockConversations.set(conversationId, conversation);
  mockMessages.set(conversationId, []);
  
  res.json({ success: true, data: conversation });
});

// Add message to conversation
app.post('/api/conversations/:id/messages', (req, res) => {
  const { id } = req.params;
  const { role, content } = req.body;
  
  const messageId = 'msg-' + Date.now();
  const message = {
    id: messageId,
    conversationId: id,
    role,
    content,
    timestamp: new Date(),
    metadata: {}
  };
  
  // Add user message
  const messages = mockMessages.get(id) || [];
  messages.push(message);
  mockMessages.set(id, messages);
  
  // Broadcast user message
  io.to(`conversation_${id}`).emit('new_message', {
    conversationId: id,
    message
  });
  
  // Simulate agent response
  setTimeout(() => {
    const agentMessageId = 'msg-' + Date.now();
    const agentMessage = {
      id: agentMessageId,
      conversationId: id,
      role: 'agent',
      content: `I received your message: "${content}". This is a mock response from the agent. In a real implementation, this would be processed by the LLM and MCP tools.`,
      timestamp: new Date(),
      metadata: { mock: true }
    };
    
    messages.push(agentMessage);
    mockMessages.set(id, messages);
    
    // Broadcast agent response
    io.to(`conversation_${id}`).emit('new_message', {
      conversationId: id,
      message: agentMessage
    });
  }, 1000);
  
  res.json({ success: true, data: message });
});

// Get conversation messages
app.get('/api/conversations/:id/messages', (req, res) => {
  const { id } = req.params;
  const messages = mockMessages.get(id) || [];
  res.json({ success: true, data: messages });
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join_conversation', (data) => {
    const { conversationId } = data;
    socket.join(`conversation_${conversationId}`);
    console.log(`Client ${socket.id} joined conversation ${conversationId}`);
  });
  
  socket.on('leave_conversation', (data) => {
    const { conversationId } = data;
    socket.leave(`conversation_${conversationId}`);
    console.log(`Client ${socket.id} left conversation ${conversationId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Mock backend server running on port ${PORT}`);
  console.log(`WebSocket server ready`);
});