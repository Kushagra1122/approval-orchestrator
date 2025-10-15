import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import './config/database.js'; // Initialize DB
import { createServer } from 'http';
import { setupWebSocket } from './websocket.js';

import workflowRoutes from './routes/workflows.js';
import approvalRoutes from './routes/approvals.js';
import analyticsRoutes from './routes/analytics.js';

import workflowRollbackRoutes from './routes/workflow-rollbacks.js';
import { startCleanupJob } from './cron/cleanup.js';
import { configDotenv } from 'dotenv';

configDotenv(); 

const app = express();
const server = createServer(app);
const io = setupWebSocket(server);
const PORT = process.env.PORT || 8000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
// Routes
app.use('/workflows', workflowRoutes);
app.use('/approvals', approvalRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/workflow-rollbacks', workflowRollbackRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'Approval Orchestrator API',
    version: '1.0.0'
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  // Start background cleanup job (cleans expired approvals)
  try {
    const cleanupHandle = startCleanupJob();
    // Optionally attach to server for graceful shutdown in future
    server.cleanupHandle = cleanupHandle;
  } catch (err) {
    console.error('Failed to start cleanup job:', err);
  }
});



