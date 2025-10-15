import { dbRun, dbAll, dbGet } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import { SlackWebhookIntegration } from '../integrations/slack-webhook.js'; // ADD THIS IMPORT
import { EmailIntegration } from '../integrations/email.js';

export class Workflow {
  static async create({ name, context = {} }) {
    const id = uuidv4();
    await dbRun(
      'INSERT INTO workflows (id, name, context) VALUES (?, ?, ?)',
      [id, name, JSON.stringify(context)]
    );
    return this.findById(id);
  }

  static async findAll() {
    const rows = await dbAll('SELECT * FROM workflows ORDER BY created_at DESC');
    return rows.map(row => this.parseRow(row));
  }

  static async findById(id) {
    const row = await dbGet('SELECT * FROM workflows WHERE id = ?', [id]);
    return row ? this.parseRow(row) : null;
  }

  static async updateStatus(id, status) {
    await dbRun(
      'UPDATE workflows SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, id]
    );
    return this.findById(id);
  }

  // NEW: Rollback workflow to previous state
// In Workflow.js - Update the rollback method
static async rollback(workflowId, { reason, rolledBackBy, compensationActions = [] }) {
  const workflow = await this.findById(workflowId);
  
  if (!workflow) {
    throw new Error('Workflow not found');
  }

  if (workflow.status !== 'paused' && workflow.status !== 'running') {
    throw new Error('Can only rollback paused or running workflows');
  }

  // Create rollback record
  const rollbackId = uuidv4();
  await dbRun(
    `INSERT INTO workflow_rollbacks 
     (id, workflow_id, rolled_back_from_step, rolled_back_to_step, reason, rolled_back_by, compensation_actions) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      rollbackId, 
      workflowId, 
      workflow.status, 
      'rolled_back', 
      reason, 
      rolledBackBy, 
      JSON.stringify(compensationActions)
    ]
  );

  // Update workflow status and set rollback reason
  await dbRun(
    `UPDATE workflows 
     SET status = 'rolled_back', rollback_reason = ?, updated_at = CURRENT_TIMESTAMP 
     WHERE id = ?`,
    [reason, workflowId]
  );

  // Get all approvals for this workflow and execute compensation actions
  const approvals = await dbAll(
    'SELECT * FROM approval_steps WHERE workflow_id = ?',
    [workflowId]
  );

  console.log(`🔍 Found ${approvals.length} approvals for workflow ${workflowId}`);
  
  // FIXED: Execute compensation for ALL approvals, not just approved ones
  for (const approval of approvals) {
    console.log(`🔍 Processing approval: ${approval.step_name} (status: ${approval.status})`);
    
    // For pending approvals, we still want to notify stakeholders about the rollback
    if (approval.status === 'approved' || approval.status === 'pending') {
      console.log(`🔍 Executing compensation for approval: ${approval.step_name}`);
      await this.executeCompensationActions(approval, compensationActions);
    } else {
      console.log(`🔍 Skipping compensation for ${approval.status} approval: ${approval.step_name}`);
    }
  }

  console.log(`✅ Workflow ${workflowId} rolled back: ${reason}`);
  return this.findById(workflowId);
}

  // NEW: Execute compensation actions for rolled back approvals
  static async executeCompensationActions(approval, compensationActions) {
    console.log(`🔍 EXECUTING COMPENSATION for approval: ${approval.step_name}`);
    console.log(`🔍 Approval ID: ${approval.id}`);
    console.log(`🔍 Approval channel: ${approval.channel}`);
    console.log(`🔍 Compensation actions count: ${compensationActions.length}`);
    console.log(`🔍 Compensation actions:`, compensationActions);
    
    for (const action of compensationActions) {
      console.log(`🔍 PROCESSING ACTION:`, action);
      switch (action.type) {
        case 'notify_stakeholders':
          console.log('🔍 CALLING notifyStakeholders...');
          await this.notifyStakeholders(approval, action);
          break;
        case 'reverse_action':
          console.log('🔍 CALLING reverseAction...');
          await this.reverseAction(approval, action);
          break;
        case 'update_system':
          console.log('🔍 CALLING updateSystem...');
          await this.updateSystem(approval, action);
          break;
        default:
          console.log(`⚠️ Unknown compensation action: ${action.type}`);
      }
    }
  }

  // NEW: Notify stakeholders about rollback
  static async notifyStakeholders(approval, action) {
    const message = action.message || `Approval "${approval.step_name}" has been rolled back`;
    
    console.log(`📢 NOTIFICATION: ${message} to ${approval.assigned_to}`);
    console.log(`🔍 Approval channel: ${approval.channel}`);
    console.log(`🔍 Webhook URL present: ${!!process.env.SLACK_WEBHOOK_URL}`);
    
    // If it was a Slack approval, send actual rollback notification
    if (approval.channel === 'slack' && process.env.SLACK_WEBHOOK_URL) {
      try {
        console.log('🔍 SENDING SLACK ROLLBACK NOTIFICATION...');
        console.log('🔍 Rollback data:', {
          reason: action.message || "Workflow rolled back",
          rolledBackBy: "system", 
          compensationActions: [action]
        });
        
        await SlackWebhookIntegration.sendRollbackNotification(approval, {
          reason: action.message || "Workflow rolled back",
          rolledBackBy: "system",
          compensationActions: [action]
        }, process.env.SLACK_WEBHOOK_URL);
        
        console.log('✅ Slack rollback notification sent successfully');
      } catch (error) {
        console.error('❌ Failed to send Slack rollback notification:', error);
      }
    } else if (approval.channel === 'email') {
      try {
        console.log('🔍 SENDING EMAIL ROLLBACK NOTIFICATION...');
        await EmailIntegration.sendRollbackNotification(approval, {
          reason: action.message || "Workflow rolled back",
          rolledBackBy: "system",
          compensationActions: [action]
        });
        console.log('✅ Email rollback notification sent successfully');
      } catch (error) {
        console.error('❌ Failed to send Email rollback notification:', error);
      }
    } else {
      console.log('⚠️  Skipping Slack notification - conditions not met');
      console.log('🔍 Channel is slack:', approval.channel === 'slack');
      console.log('🔍 Webhook set:', !!process.env.SLACK_WEBHOOK_URL);
    }
  }

  // NEW: Reverse actions that were taken
  static async reverseAction(approval, action) {
    console.log(`🔄 Reversing action for: ${approval.step_name}`);
    
    // Example: Reverse a deployment
    if (approval.step_name.toLowerCase().includes('deploy')) {
      console.log(`🚀 Reverting deployment from approval: ${approval.id}`);
    }
    
    // Example: Reverse a purchase
    if (approval.step_name.toLowerCase().includes('purchase')) {
      console.log(`💰 Cancelling purchase from approval: ${approval.id}`);
    }
  }

  // NEW: Update external systems
  static async updateSystem(approval, action) {
    console.log(`⚙️ Updating system for rolled back approval: ${approval.step_name}`);
  }

  // NEW: Get rollback history for a workflow
  static async getRollbackHistory(workflowId) {
    const rows = await dbAll(
      'SELECT * FROM workflow_rollbacks WHERE workflow_id = ? ORDER BY created_at DESC',
      [workflowId]
    );
    return rows.map(row => this.parseRollbackRow(row));
  }

  // NEW: Parse rollback row
  static parseRollbackRow(row) {
    return {
      ...row,
      compensation_actions: JSON.parse(row.compensation_actions || '[]'),
      created_at: new Date(row.created_at)
    };
  }

  static parseRow(row) {
    return {
      ...row,
      context: JSON.parse(row.context || '{}'),
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }
}
