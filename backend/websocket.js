import { Server } from 'socket.io';
import { db } from './config/database.js';

export function setupWebSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Join room for specific approval
    socket.on('join-approval', (approvalId) => {
      socket.join(`approval:${approvalId}`);
    });

    // Join room for workflow updates
    socket.on('join-workflow', (workflowId) => {
      socket.join(`workflow:${workflowId}`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
}

// Helper to emit approval updates
export function emitApprovalUpdate(io, approval) {
  io.to(`approval:${approval.id}`).emit('approval-updated', approval);
  io.to(`workflow:${approval.workflow_id}`).emit('workflow-updated');
}
