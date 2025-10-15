import express from 'express';
import { dbAll, dbGet } from '../config/database.js';

const router = express.Router();

// Get approval metrics overview
router.get('/overview', async (req, res) => {
  try {
    const totalWorkflows = await dbGet('SELECT COUNT(*) as count FROM workflows');
    const totalApprovals = await dbGet('SELECT COUNT(*) as count FROM approval_steps');
    const pendingApprovals = await dbGet('SELECT COUNT(*) as count FROM approval_steps WHERE status = ?', ['pending']);
    const approvedCount = await dbGet('SELECT COUNT(*) as count FROM approval_steps WHERE status = ?', ['approved']);
    const rejectedCount = await dbGet('SELECT COUNT(*) as count FROM approval_steps WHERE status = ?', ['rejected']);
    const expiredCount = await dbGet('SELECT COUNT(*) as count FROM approval_steps WHERE status = ?', ['timed_out']);
    
    // Workflow status breakdown
    const workflowsByStatus = await dbAll(`
      SELECT status, COUNT(*) as count 
      FROM workflows 
      GROUP BY status
    `);

    // Average response time (for completed approvals)
    const avgResponseTime = await dbGet(`
      SELECT AVG(
        JULIANDAY(responded_at) - JULIANDAY(requested_at)
      ) * 24 * 60 as avg_minutes
      FROM approval_steps 
      WHERE responded_at IS NOT NULL
    `);

    res.json({
      overview: {
        totalWorkflows: totalWorkflows.count,
        totalApprovals: totalApprovals.count,
        pendingApprovals: pendingApprovals.count,
        approvedCount: approvedCount.count,
        rejectedCount: rejectedCount.count,
        expiredCount: expiredCount.count,
        averageResponseTimeMinutes: Math.round(avgResponseTime.avg_minutes || 0)
      },
      workflowsByStatus: workflowsByStatus.reduce((acc, row) => {
        acc[row.status] = row.count;
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get approval response times by day
router.get('/response-times', async (req, res) => {
  try {
    const responseTimes = await dbAll(`
      SELECT 
        DATE(requested_at) as date,
        AVG(JULIANDAY(responded_at) - JULIANDAY(requested_at)) * 24 * 60 as avg_minutes,
        COUNT(*) as count
      FROM approval_steps 
      WHERE responded_at IS NOT NULL
        AND requested_at >= datetime('now', '-30 days')
      GROUP BY DATE(requested_at)
      ORDER BY date DESC
      LIMIT 30
    `);

    res.json(responseTimes.map(row => ({
      date: row.date,
      averageMinutes: Math.round(row.avg_minutes || 0),
      count: row.count
    })));
  } catch (error) {
    console.error('Analytics response times error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get top approvers by activity
router.get('/top-approvers', async (req, res) => {
  try {
    const topApprovers = await dbAll(`
      SELECT 
        assigned_to,
        COUNT(*) as total_approvals,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_count,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
        AVG(
          CASE WHEN responded_at IS NOT NULL 
          THEN (JULIANDAY(responded_at) - JULIANDAY(requested_at)) * 24 * 60 
          ELSE NULL END
        ) as avg_response_minutes
      FROM approval_steps
      WHERE requested_at >= datetime('now', '-30 days')
      GROUP BY assigned_to
      ORDER BY total_approvals DESC
      LIMIT 10
    `);

    res.json(topApprovers.map(row => ({
      assignedTo: row.assigned_to,
      totalApprovals: row.total_approvals,
      approvedCount: row.approved_count,
      rejectedCount: row.rejected_count,
      pendingCount: row.pending_count,
      averageResponseMinutes: Math.round(row.avg_response_minutes || 0)
    })));
  } catch (error) {
    console.error('Analytics top approvers error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get channel distribution
router.get('/channels', async (req, res) => {
  try {
    const channelStats = await dbAll(`
      SELECT 
        COALESCE(channel, 'web') as channel,
        COUNT(*) as count,
        AVG(
          CASE WHEN responded_at IS NOT NULL 
          THEN (JULIANDAY(responded_at) - JULIANDAY(requested_at)) * 24 * 60 
          ELSE NULL END
        ) as avg_response_minutes
      FROM approval_steps
      WHERE requested_at >= datetime('now', '-30 days')
      GROUP BY channel
      ORDER BY count DESC
    `);

    res.json(channelStats.map(row => ({
      channel: row.channel,
      count: row.count,
      averageResponseMinutes: Math.round(row.avg_response_minutes || 0)
    })));
  } catch (error) {
    console.error('Analytics channels error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get recent activity for live feed
router.get('/activity', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const recentActivity = await dbAll(`
      SELECT 
        a.id,
        a.step_name,
        a.status,
        a.assigned_to,
        a.channel,
        a.requested_at,
        a.responded_at,
        w.name as workflow_name,
        w.id as workflow_id
      FROM approval_steps a
      JOIN workflows w ON a.workflow_id = w.id
      ORDER BY COALESCE(a.responded_at, a.requested_at) DESC
      LIMIT ?
    `, [limit]);

    res.json(recentActivity.map(row => ({
      id: row.id,
      stepName: row.step_name,
      status: row.status,
      assignedTo: row.assigned_to,
      channel: row.channel,
      requestedAt: row.requested_at,
      respondedAt: row.responded_at,
      workflowName: row.workflow_name,
      workflowId: row.workflow_id,
      lastActivity: row.responded_at || row.requested_at
    })));
  } catch (error) {
    console.error('Analytics activity error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get workflow completion times
router.get('/workflow-performance', async (req, res) => {
  try {
    const workflowPerformance = await dbAll(`
      SELECT 
        w.id,
        w.name,
        w.status,
        w.created_at,
        w.updated_at,
        COUNT(a.id) as total_approvals,
        SUM(CASE WHEN a.status = 'approved' THEN 1 ELSE 0 END) as approved_count,
        SUM(CASE WHEN a.status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
        SUM(CASE WHEN a.status = 'pending' THEN 1 ELSE 0 END) as pending_count,
        AVG(
          CASE WHEN a.responded_at IS NOT NULL 
          THEN (JULIANDAY(a.responded_at) - JULIANDAY(a.requested_at)) * 24 * 60 
          ELSE NULL END
        ) as avg_approval_time_minutes
      FROM workflows w
      LEFT JOIN approval_steps a ON w.id = a.workflow_id
      WHERE w.created_at >= datetime('now', '-30 days')
      GROUP BY w.id, w.name, w.status, w.created_at, w.updated_at
      ORDER BY w.updated_at DESC
    `);

    res.json(workflowPerformance.map(row => ({
      id: row.id,
      name: row.name,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      totalApprovals: row.total_approvals,
      approvedCount: row.approved_count,
      rejectedCount: row.rejected_count,
      pendingCount: row.pending_count,
      averageApprovalTimeMinutes: Math.round(row.avg_approval_time_minutes || 0)
    })));
  } catch (error) {
    console.error('Analytics workflow performance error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get rollback statistics
router.get('/rollbacks', async (req, res) => {
  try {
    const rollbackStats = await dbGet(`
      SELECT 
        COUNT(*) as total_rollbacks,
        COUNT(DISTINCT workflow_id) as workflows_rolled_back
      FROM workflow_rollbacks
      WHERE created_at >= datetime('now', '-30 days')
    `);

    const rollbacksByReason = await dbAll(`
      SELECT 
        reason,
        COUNT(*) as count
      FROM workflow_rollbacks
      WHERE created_at >= datetime('now', '-30 days')
      GROUP BY reason
      ORDER BY count DESC
      LIMIT 5
    `);

    res.json({
      stats: rollbackStats,
      byReason: rollbacksByReason
    });
  } catch (error) {
    console.error('Analytics rollbacks error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;