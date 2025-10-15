import express from 'express';
import { ApprovalStep } from '../models/ApprovalStep.js';
import { dbAll } from '../config/database.js'; // ADD THIS IMPORT

const router = express.Router();

// Get approval details
router.get('/:approval_id', async (req, res) => {
  try {
    const { approval_id } = req.params;
    const approval = await ApprovalStep.findById(approval_id);
    
    if (!approval) {
      return res.status(404).json({ error: 'Approval not found' });
    }
    
    res.json(approval);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Respond to approval
router.post('/:approval_id/respond', async (req, res) => {
  try {
    const { approval_id } = req.params;
    const { decision, feedback } = req.body;
    
    if (!['approve', 'reject'].includes(decision)) {
      return res.status(400).json({ error: 'Decision must be "approve" or "reject"' });
    }
    
    const approval = await ApprovalStep.respond(approval_id, decision, feedback);
    res.json({ message: `Approval ${decision}`, approval });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get approvals with filtering - FIXED
router.get('/', async (req, res) => {
  try {
    const { status, workflow_id } = req.query; // CHANGED: assigned_to → workflow_id
    let sql = 'SELECT * FROM approval_steps WHERE 1=1';
    const params = [];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (workflow_id) { // CHANGED: assigned_to → workflow_id
      sql += ' AND workflow_id = ?';
      params.push(workflow_id);
    }

    sql += ' ORDER BY requested_at DESC';

    const rows = await dbAll(sql, params);
    const approvals = rows.map(row => ApprovalStep.parseRow(row));
    res.json(approvals);
  } catch (error) {
    console.error('Error fetching approvals:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
