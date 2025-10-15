import { dbRun, dbAll, dbGet } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import { SlackWebhookIntegration } from '../integrations/slack-webhook.js';
import { EmailIntegration } from '../integrations/email.js';

export class ApprovalStep {
  static async create({ workflow_id, step_name, assigned_to, ui_schema = {}, timeout_minutes = 60, channel = 'web' }) {
    console.log('🔍 APPROVAL CREATE DEBUG:', { channel, assigned_to, workflow_id, step_name });
    
    const id = uuidv4();
    const timeout_at = new Date(Date.now() + timeout_minutes * 60000);
    
    await dbRun(
      `INSERT INTO approval_steps 
       (id, workflow_id, step_name, assigned_to, ui_schema, timeout_at, channel) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, workflow_id, step_name, assigned_to, JSON.stringify(ui_schema), timeout_at.toISOString(), channel]
    );
    
    // Update workflow status to paused
    await dbRun(
      'UPDATE workflows SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['paused', workflow_id]
    );

    const approval = await this.findById(id);
    
    // Enhanced Slack debugging
    console.log('🔍 SLACK CHECK:', { 
      channel, 
      hasWebhook: !!process.env.SLACK_WEBHOOK_URL,
      webhookUrl: process.env.SLACK_WEBHOOK_URL ? '***SET***' : 'MISSING'
    });
    
    // Send to appropriate channel - USE WEBHOOK or Email
    if (channel === 'slack') {
      if (process.env.SLACK_WEBHOOK_URL) {
        try {
          console.log('🔍 ATTEMPTING SLACK WEBHOOK SEND...');
          await SlackWebhookIntegration.sendApprovalRequest(approval, process.env.SLACK_WEBHOOK_URL);
          console.log('✅ Slack webhook sent successfully for approval:', approval.id);
        } catch (error) {
          console.error('❌ Slack webhook failed:', error);
        }
      } else {
        console.log('⚠️  SLACK_WEBHOOK_URL not set, skipping Slack notification');
      }
    } else if (channel === 'email') {
      // Send email notification
      try {
        console.log('🔍 ATTEMPTING EMAIL SEND...');
        await EmailIntegration.sendApprovalRequest(approval);
        console.log('✅ Email sent successfully for approval:', approval.id);
      } catch (error) {
        console.error('❌ Email send failed:', error);
      }
    } else {
      console.log('🔍 Non-Slack channel:', channel);
    }
    
    return approval;
  }

  static async findById(id) {
    const row = await dbGet('SELECT * FROM approval_steps WHERE id = ?', [id]);
    return row ? this.parseRow(row) : null;
  }

  static async findByWorkflow(workflow_id) {
    const rows = await dbAll(
      'SELECT * FROM approval_steps WHERE workflow_id = ? ORDER BY requested_at',
      [workflow_id]
    );
    return rows.map(row => this.parseRow(row));
  }

  static async respond(id, decision, feedback = {}) {
    const status = decision === 'approve' ? 'approved' : 'rejected';
    
    await dbRun(
      `UPDATE approval_steps 
       SET status = ?, response_data = ?, responded_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [status, JSON.stringify(feedback), id]
    );
    
    // Get approval with updated data
    const approval = await this.findById(id);
    
    // FIXED: Check if ALL approvals for this workflow are completed
    const allApprovals = await dbAll(
      'SELECT status FROM approval_steps WHERE workflow_id = ?',
      [approval.workflow_id]
    );
    
    console.log('🔍 ALL APPROVALS STATUS:', allApprovals.map(a => a.status));
    
    // Check if any approvals are still pending
    const hasPendingApprovals = allApprovals.some(a => a.status === 'pending');
    console.log('🔍 HAS PENDING APPROVALS?', hasPendingApprovals);
    
    // Only set workflow to 'running' if NO approvals are pending
    const newWorkflowStatus = hasPendingApprovals ? 'paused' : 'running';
    console.log('🔍 SETTING WORKFLOW STATUS TO:', newWorkflowStatus);
    
    await dbRun(
      'UPDATE workflows SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newWorkflowStatus, approval.workflow_id]
    );

    // Enhanced Slack decision debugging
    console.log('🔍 SLACK DECISION CHECK:', { 
      channel: approval.channel, 
      hasWebhook: !!process.env.SLACK_WEBHOOK_URL,
      decision 
    });
    
    // Update channel message if applicable - USE WEBHOOK
    if (approval.channel === 'slack' && process.env.SLACK_WEBHOOK_URL) {
      try {
        console.log('🔍 SENDING SLACK DECISION NOTIFICATION...');
        await SlackWebhookIntegration.sendDecisionNotification(approval, decision, process.env.SLACK_WEBHOOK_URL);
        console.log('✅ Slack decision notification sent');
      } catch (error) {
        console.error('❌ Slack decision notification failed:', error);
      }
    } else if (approval.channel === 'email') {
      try {
        console.log('🔍 SENDING EMAIL DECISION NOTIFICATION...');
        await EmailIntegration.sendDecisionNotification(approval, decision);
        console.log('✅ Email decision notification sent');
      } catch (error) {
        console.error('❌ Email decision notification failed:', error);
      }
    }
    
    return approval;
  }

  static parseRow(row) {
    return {
      ...row,
      ui_schema: JSON.parse(row.ui_schema || '{}'),
      response_data: JSON.parse(row.response_data || '{}'),
      requested_at: new Date(row.requested_at),
      responded_at: row.responded_at ? new Date(row.responded_at) : null,
      timeout_at: row.timeout_at ? new Date(row.timeout_at) : null
    };
  }
}
