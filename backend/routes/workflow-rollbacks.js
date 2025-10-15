import express from 'express';
import { Workflow } from '../models/Workflow.js';

const router = express.Router();

// Rollback a workflow
router.post('/:workflow_id/rollback', async (req, res) => {
  try {
    const { workflow_id } = req.params;
    const { reason, rolled_back_by, compensation_actions = [] } = req.body;

    if (!reason || !rolled_back_by) {
      return res.status(400).json({ 
        error: 'Reason and rolled_back_by are required' 
      });
    }

    const workflow = await Workflow.rollback(workflow_id, {
      reason,
      rolledBackBy: rolled_back_by,
      compensationActions: compensation_actions
    });

    res.json({ 
      message: 'Workflow rolled back successfully',
      workflow 
    });
  } catch (error) {
    console.error('❌ Rollback error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get rollback history for a workflow
router.get('/:workflow_id/rollbacks', async (req, res) => {
  try {
    const { workflow_id } = req.params;
    const rollbacks = await Workflow.getRollbackHistory(workflow_id);
    res.json(rollbacks);
  } catch (error) {
    console.error('❌ Get rollbacks error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;