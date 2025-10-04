const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok' });
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