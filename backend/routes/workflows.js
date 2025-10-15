
import express from 'express';
import { Workflow } from '../models/Workflow.js';
import { ApprovalStep } from '../models/ApprovalStep.js';
import { SlackWebhookIntegration } from '../integrations/slack-webhook.js';
import { EmailIntegration } from '../integrations/email.js';

const router = express.Router();

// Create workflow
router.post('/', async (req, res) => {
  try {
    const { name, context } = req.body;
    const workflow = await Workflow.create({ name, context });
    res.json(workflow);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List workflows
router.get('/', async (req, res) => {
  try {
    const workflows = await Workflow.findAll();
    res.json(workflows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single workflow
router.get('/:workflow_id', async (req, res) => {
  try {
    const { workflow_id } = req.params;
    const workflow = await Workflow.findById(workflow_id);
    
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    res.json(workflow);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create approval step
router.post('/:workflow_id/approvals', async (req, res) => {
  try {
    const { workflow_id } = req.params;
    const { step_name, assigned_to, ui_schema, timeout_minutes, channel } = req.body;
    
    console.log('🔍 WORKFLOW APPROVAL DEBUG: Received data:', {
      workflow_id, step_name, assigned_to, channel, timeout_minutes
    });
    
    const approval = await ApprovalStep.create({
      workflow_id,
      step_name,
      assigned_to,
      ui_schema,
      timeout_minutes,
      channel
    });
    
    console.log('✅ Approval created successfully:', approval.id);
    res.json(approval);
  } catch (error) {
    console.error('❌ ERROR in approval creation:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
});

// Test Slack webhook
router.post('/test-slack', async (req, res) => {
  try {
    const testApproval = {
      id: 'test-id',
      workflow_id: 'test-workflow-id', 
      step_name: 'Test Approval',
      assigned_to: '#social',
      requested_at: new Date(),
      timeout_at: new Date(Date.now() + 3600000)
    };
    
    await SlackWebhookIntegration.sendApprovalRequest(testApproval, process.env.SLACK_WEBHOOK_URL);
    res.json({ message: 'Test Slack message sent' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test Email
router.post('/test-email', async (req, res) => {
  try {
    const to = req.body?.to || process.env.EMAIL_ADMIN || process.env.EMAIL_USER;
    if (!to) return res.status(400).json({ error: 'No recipient specified (pass { "to": "you@example.com" } or set EMAIL_ADMIN or EMAIL_USER)' });

    const testApproval = {
      id: 'test-id',
      workflow_id: 'test-workflow-id',
      step_name: 'Test Email Approval',
      assigned_to: to,
      requested_at: new Date(),
      timeout_at: new Date(Date.now() + 3600000)
    };

    await EmailIntegration.sendApprovalRequest(testApproval);
    res.json({ message: 'Test Email sent', to });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
