import nodemailer from 'nodemailer';
import { dbGet } from '../config/database.js';

function formatDate(d) {
  try { return new Date(d).toLocaleString(); } catch { return '' }
}

export class EmailIntegration {
  static async createTransport() {
    const host = process.env.EMAIL_HOST;

    if (!host || host.includes('example.com')) {
      console.log('📧 EMAIL: No SMTP host configured; using Ethereal test account');
      const testAccount = await nodemailer.createTestAccount();
      const transport = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      transport._isEthereal = true;
      return transport;
    }

    return nodemailer.createTransport({
      host,
      port: process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: process.env.EMAIL_USER
        ? {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          }
        : undefined,
    });
  }

  static async sendMail({ to, subject, text, html }) {
    try {
      const transporter = await this.createTransport();
      const from = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'no-reply@example.com';

      console.log('📧 EMAIL: Sending to', to, 'subject:', subject);

      const info = await transporter.sendMail({ from, to, subject, text, html });
      console.log('📧 EMAIL: Sent message id', info.messageId);

      try {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) console.log('📧 EMAIL: Preview URL:', previewUrl);
      } catch { /* ignore */ }

      return info;
    } catch (error) {
      console.error('❌ EMAIL: sendMail error', error);
      throw error;
    }
  }

  static async sendApprovalRequest(approval, _unused) {
    try {
      console.log('📧 EMAIL: Starting approval request...');
      const workflow = await dbGet('SELECT * FROM workflows WHERE id = ?', [approval.workflow_id]);
      const baseUrl = process.env.FRONTEND_URL || 'https://approval-orchestrator.netlify.app';

      const to = approval.assigned_to;
      const subject = `Approval Required: ${approval.step_name}`;

      const approveUrl = `${baseUrl}/approvals/${approval.id}?decision=approve`;
      const rejectUrl = `${baseUrl}/approvals/${approval.id}?decision=reject`;
      const viewUrl = `${baseUrl}/approvals/${approval.id}`;

      const text = `Approval Required: ${approval.step_name}\n\nWorkflow: ${workflow?.name}\nAssigned To: ${approval.assigned_to}\nRequested: ${formatDate(approval.requested_at)}\nTimeout: ${formatDate(approval.timeout_at)}\n\nContext:\n${JSON.stringify(workflow?.context || {}, null, 2)}\n\nApprove: ${approveUrl}\nReject: ${rejectUrl}\nView: ${viewUrl}`;

      const html = `
        <h2>Approval Required: ${approval.step_name}</h2>
        <p><strong>Workflow:</strong> ${workflow?.name}</p>
        <p><strong>Assigned To:</strong> ${approval.assigned_to}</p>
        <p><strong>Requested:</strong> ${formatDate(approval.requested_at)}</p>
        <p><strong>Timeout:</strong> ${formatDate(approval.timeout_at)}</p>
        <pre>${JSON.stringify(workflow?.context || {}, null, 2)}</pre>
        <p>
          <a href="${approveUrl}">✅ Approve</a> &nbsp;
          <a href="${rejectUrl}">❌ Reject</a> &nbsp;
          <a href="${viewUrl}">🔎 View Details</a>
        </p>
      `;

      return await this.sendMail({ to, subject, text, html });
    } catch (error) {
      console.error('❌ EMAIL: sendApprovalRequest error', error);
      throw error;
    }
  }

  static async sendDecisionNotification(approval, decision, _unused) {
    try {
      console.log('📧 EMAIL: Starting decision notification...');
      const workflow = await dbGet('SELECT * FROM workflows WHERE id = ?', [approval.workflow_id]);

      const to = approval.assigned_to;
      const statusText = decision === 'approve' ? 'approved' : 'rejected';
      const subject = `Approval ${statusText}: ${approval.step_name}`;

      let text = `Approval ${statusText}: ${approval.step_name}\n\nWorkflow: ${workflow?.name}\nDecision: ${statusText}\nBy: ${approval.assigned_to}\nWhen: ${formatDate(new Date())}`;
      if (approval.response_data && Object.keys(approval.response_data || {}).length > 0) {
        text += `\n\nFeedback:\n${JSON.stringify(approval.response_data, null, 2)}`;
      }

      const html = `
        <h2>Approval ${statusText}: ${approval.step_name}</h2>
        <p><strong>Workflow:</strong> ${workflow?.name}</p>
        <p><strong>Decision:</strong> ${statusText}</p>
        <p><strong>By:</strong> ${approval.assigned_to}</p>
        <p><strong>When:</strong> ${formatDate(new Date())}</p>
        <pre>${approval.response_data && Object.keys(approval.response_data || {}).length ? JSON.stringify(approval.response_data, null, 2) : ''}</pre>
      `;

      return await this.sendMail({ to, subject, text, html });
    } catch (error) {
      console.error('❌ EMAIL: sendDecisionNotification error', error);
      throw error;
    }
  }

  static async sendRollbackNotification(approval, rollbackData, _unused) {
    try {
      console.log('📧 EMAIL: Starting rollback notification...');
      const workflow = await dbGet('SELECT * FROM workflows WHERE id = ?', [approval.workflow_id]);

      const to = approval.assigned_to;
      const subject = `Rollback: ${approval.step_name}`;

      let text = `Approval Rolled Back: ${approval.step_name}\n\nWorkflow: ${workflow?.name}\nReason: ${rollbackData.reason}\nRolled Back By: ${rollbackData.rolledBackBy}\nWhen: ${formatDate(new Date())}\n\nImpact: This approval decision has been reversed.`;
      if (rollbackData.compensationActions?.length > 0) {
        text += `\n\nCompensation Actions:\n${JSON.stringify(rollbackData.compensationActions, null, 2)}`;
      }

      const html = `
        <h2>Approval Rolled Back</h2>
        <p><strong>Approval:</strong> ${approval.step_name}</p>
        <p><strong>Workflow:</strong> ${workflow?.name}</p>
        <p><strong>Reason:</strong> ${rollbackData.reason}</p>
        <p><strong>Rolled Back By:</strong> ${rollbackData.rolledBackBy}</p>
        <pre>${rollbackData.compensationActions?.length ? JSON.stringify(rollbackData.compensationActions, null, 2) : ''}</pre>
      `;

      return await this.sendMail({ to, subject, text, html });
    } catch (error) {
      console.error('❌ EMAIL: sendRollbackNotification error', error);
      throw error;
    }
  }

  static async sendWorkflowRollbackNotification(workflow, rollbackData, _unused) {
    try {
      console.log('📧 EMAIL: Starting workflow rollback notification...');

      const to =
        workflow.context?.notificationEmails?.join(',') ||
        process.env.EMAIL_ADMIN;

      if (!to) {
        console.log('⚠️  EMAIL: No recipients found for workflow rollback, skipping');
        return null;
      }

      const subject = `Workflow Rolled Back: ${workflow.name}`;
      const text = `Workflow Rolled Back: ${workflow.name}\n\nReason: ${rollbackData.reason}\nRolled Back By: ${rollbackData.rolledBackBy}\nWhen: ${formatDate(new Date())}\n\nContext:\n${JSON.stringify(workflow.context || {}, null, 2)}`;

      const html = `
        <h2>Workflow Rolled Back: ${workflow.name}</h2>
        <p><strong>Reason:</strong> ${rollbackData.reason}</p>
        <p><strong>Rolled Back By:</strong> ${rollbackData.rolledBackBy}</p>
        <pre>${JSON.stringify(workflow.context || {}, null, 2)}</pre>
      `;

      return await this.sendMail({ to, subject, text, html });
    } catch (error) {
      console.error('❌ EMAIL: sendWorkflowRollbackNotification error', error);
      throw error;
    }
  }
}
