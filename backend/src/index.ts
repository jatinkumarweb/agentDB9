import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 8000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'AgentDB9 Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    message: 'AgentDB9 Backend API is running',
    version: '1.0.0'
  });
});

// Environment testing endpoints
app.post('/api/test/environment', async (req, res) => {
  try {
    const { environmentTester } = await import('@agentdb9/shared');
    
    const [health, connectivity, models, databases] = await Promise.all([
      environmentTester.getEnvironmentHealth(),
      environmentTester.runConnectivityTests(),
      environmentTester.runModelTests(),
      environmentTester.runDatabaseTests()
    ]);

    res.json({
      success: true,
      health,
      connectivity,
      models,
      databases,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Environment test error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Database connection test
app.get('/api/test/database', async (req, res) => {
  try {
    // Mock database test - in real implementation, test actual PostgreSQL connection
    const startTime = Date.now();
    
    // Simulate database query
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const responseTime = Date.now() - startTime;
    
    res.json({
      connected: true,
      responseTime,
      details: {
        version: '15.0',
        database: 'coding_agent',
        tables: ['users', 'projects', 'files']
      }
    });
  } catch (error) {
    res.status(500).json({
      connected: false,
      error: error instanceof Error ? error.message : 'Database connection failed'
    });
  }
});

// Redis connection test
app.get('/api/test/redis', async (req, res) => {
  try {
    // Mock Redis test - in real implementation, test actual Redis connection
    const startTime = Date.now();
    
    // Simulate Redis ping
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const responseTime = Date.now() - startTime;
    
    res.json({
      connected: true,
      responseTime,
      details: {
        version: '7.0',
        keys: 42,
        memory: '2.1MB'
      }
    });
  } catch (error) {
    res.status(500).json({
      connected: false,
      error: error instanceof Error ? error.message : 'Redis connection failed'
    });
  }
});

// VS Code extension setup endpoint
app.post('/api/vscode/setup-extensions', async (req, res) => {
  try {
    // Mock VS Code extension setup
    const extensions = [
      'ms-vscode.vscode-typescript-next',
      'bradlc.vscode-tailwindcss',
      'ms-vscode.vscode-docker',
      'esbenp.prettier-vscode'
    ];
    
    res.json({
      success: true,
      message: 'VS Code extensions setup initiated',
      extensions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Extension setup failed'
    });
  }
});

// Environment monitoring state
let environmentHealth: any = null;
let monitoringClients = new Set();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Handle environment monitoring subscription
  socket.on('subscribe_environment', () => {
    monitoringClients.add(socket.id);
    console.log(`Client ${socket.id} subscribed to environment monitoring`);
    
    // Send current health status if available
    if (environmentHealth) {
      socket.emit('environment_health', environmentHealth);
    }
  });
  
  socket.on('unsubscribe_environment', () => {
    monitoringClients.delete(socket.id);
    console.log(`Client ${socket.id} unsubscribed from environment monitoring`);
  });
  
  socket.on('disconnect', () => {
    monitoringClients.delete(socket.id);
    console.log('Client disconnected:', socket.id);
  });
});

// Broadcast environment health updates
const broadcastEnvironmentHealth = (health: any) => {
  environmentHealth = health;
  
  monitoringClients.forEach(clientId => {
    const socket = io.sockets.sockets.get(clientId);
    if (socket) {
      socket.emit('environment_health', health);
    }
  });
};

// Periodic environment health check
const startEnvironmentMonitoring = () => {
  const checkInterval = 30000; // 30 seconds
  
  const performHealthCheck = async () => {
    try {
      const { environmentTester } = await import('@agentdb9/shared');
      const health = await environmentTester.getEnvironmentHealth();
      
      // Only broadcast if there are monitoring clients
      if (monitoringClients.size > 0) {
        broadcastEnvironmentHealth(health);
      }
    } catch (error) {
      console.error('Environment health check failed:', error);
    }
  };
  
  // Initial check
  performHealthCheck();
  
  // Periodic checks
  setInterval(performHealthCheck, checkInterval);
};

// Start monitoring after server starts
setTimeout(startEnvironmentMonitoring, 5000);

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📡 Socket.IO server ready`);
});