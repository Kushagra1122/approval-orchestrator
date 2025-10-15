import fetch from 'node-fetch';
import { dbGet } from '../config/database.js';

export class SlackWebhookIntegration {
  static async sendApprovalRequest(approval, webhookUrl) {
    try {
      console.log('🔍 SLACK WEBHOOK: Starting approval request...');
      
      const workflow = await dbGet(
        'SELECT * FROM workflows WHERE id = ?', 
        [approval.workflow_id]
      );

      console.log('🔍 SLACK WEBHOOK: Workflow found:', workflow?.name);

      const payload = {
        text: `📋 Approval Required: ${approval.step_name}`,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: `📋 Approval Required: ${approval.step_name}`
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Workflow:* ${workflow.name}\n*Assigned To:* ${approval.assigned_to}\n*Requested:* ${new Date(approval.requested_at).toLocaleString()}\n*Timeout:* ${new Date(approval.timeout_at).toLocaleString()}`
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Context:*\n\`\`\`${JSON.stringify(workflow.context, null, 2)}\`\`\``
            }
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "✅ Approve"
                },
                url: `http://localhost:5173/approvals/${approval.id}?decision=approve`,
                action_id: "approve"
              },
              {
                type: "button", 
                text: {
                  type: "plain_text",
                  text: "❌ Reject"
                },
                url: `http://localhost:5173/approvals/${approval.id}?decision=reject`,
                action_id: "reject"
              },
              {
                type: "button",
                text: {
                  type: "plain_text", 
                  text: "📊 View Details"
                },
                url: `http://localhost:5173/approvals/${approval.id}`,
                action_id: "view_details"
              }
            ]
          }
        ]
      };

      console.log('🔍 SLACK WEBHOOK: Sending payload to:', webhookUrl);
      console.log('🔍 SLACK WEBHOOK: Payload:', JSON.stringify(payload, null, 2));

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      console.log('🔍 SLACK WEBHOOK: Response status:', response.status);
      console.log('🔍 SLACK WEBHOOK: Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ SLACK WEBHOOK: Failed response:', errorText);
        throw new Error(`Webhook failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      console.log(`✅ Slack webhook sent for approval ${approval.id}`);
      return true;
    } catch (error) {
      console.error('❌ Slack webhook error:', error);
      throw error;
    }
  }

  static async sendDecisionNotification(approval, decision, webhookUrl) {
    try {
      console.log('🔍 SLACK DECISION: Starting decision notification...');

      const workflow = await dbGet(
        'SELECT * FROM workflows WHERE id = ?',
        [approval.workflow_id]
      );

      const statusEmoji = decision === 'approve' ? '✅' : '❌';
      const statusText = decision === 'approve' ? 'approved' : 'rejected';
      
      const payload = {
        text: `Decision: ${approval.step_name} ${statusText}`,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text", 
              text: `${statusEmoji} Approval ${statusText}: ${approval.step_name}`
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Workflow:* ${workflow.name}\n*Decision:* ${statusText}\n*By:* ${approval.assigned_to}\n*When:* ${new Date().toLocaleString()}`
            }
          }
        ]
      };

      // Add feedback if available
      if (approval.response_data && Object.keys(approval.response_data).length > 0) {
        payload.blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Feedback:*\n\`\`\`${JSON.stringify(approval.response_data, null, 2)}\`\`\``
          }
        });
      }

      console.log('🔍 SLACK DECISION: Sending decision payload...');
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      console.log('🔍 SLACK DECISION: Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Webhook failed: ${response.statusText} - ${errorText}`);
      }

      console.log(`✅ Slack decision notification sent for approval ${approval.id}`);
      return true;
    } catch (error) {
      console.error('❌ Slack decision notification error:', error);
      throw error;
    }
  }

  // NEW: Send rollback notification to Slack
  static async sendRollbackNotification(approval, rollbackData, webhookUrl) {
    try {
      console.log('🔍 SLACK ROLLBACK: Starting rollback notification...');

      const workflow = await dbGet(
        'SELECT * FROM workflows WHERE id = ?',
        [approval.workflow_id]
      );

      const payload = {
        text: `🔄 Rollback: ${approval.step_name}`,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "🔄 Approval Rolled Back"
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Approval:* ${approval.step_name}\n*Workflow:* ${workflow.name}\n*Reason:* ${rollbackData.reason}\n*Rolled Back By:* ${rollbackData.rolledBackBy}\n*When:* ${new Date().toLocaleString()}`
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Impact:* This approval decision has been reversed and any associated actions have been rolled back. Please disregard the previous approval.`
            }
          }
        ]
      };

      // Add compensation actions if available
      if (rollbackData.compensationActions && rollbackData.compensationActions.length > 0) {
        const actionsText = rollbackData.compensationActions.map(action => {
          if (action.type === 'notify_stakeholders') {
            return `• 📢 ${action.message || 'Stakeholders notified'}`;
          } else if (action.type === 'reverse_action') {
            return `• 🔄 ${action.target || 'Action reversed'}`;
          } else if (action.type === 'update_system') {
            return `• ⚙️ System updated`;
          }
          return `• ${action.type}`;
        }).join('\n');

        payload.blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Compensation Actions Taken:*\n${actionsText}`
          }
        });
      }

      console.log('🔍 SLACK ROLLBACK: Sending rollback payload...');
      console.log('🔍 SLACK ROLLBACK: Payload:', JSON.stringify(payload, null, 2));

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      console.log('🔍 SLACK ROLLBACK: Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Rollback webhook failed: ${response.statusText} - ${errorText}`);
      }

      console.log(`✅ Slack rollback notification sent for approval ${approval.id}`);
      return true;
    } catch (error) {
      console.error('❌ Slack rollback notification error:', error);
      throw error;
    }
  }

  // NEW: Send workflow-level rollback notification
  static async sendWorkflowRollbackNotification(workflow, rollbackData, webhookUrl) {
    try {
      console.log('🔍 SLACK WORKFLOW ROLLBACK: Starting workflow rollback notification...');

      const payload = {
        text: `🔄 Workflow Rolled Back: ${workflow.name}`,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "🔄 Workflow Rolled Back"
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Workflow:* ${workflow.name}\n*Reason:* ${rollbackData.reason}\n*Rolled Back By:* ${rollbackData.rolledBackBy}\n*When:* ${new Date().toLocaleString()}`
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Status:* The entire workflow has been rolled back. All approvals in this workflow have been invalidated.`
            }
          }
        ]
      };

      // Add workflow context if available
      if (workflow.context && Object.keys(workflow.context).length > 0) {
        payload.blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Original Context:*\n\`\`\`${JSON.stringify(workflow.context, null, 2)}\`\`\``
          }
        });
      }

      console.log('🔍 SLACK WORKFLOW ROLLBACK: Sending workflow rollback payload...');

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      console.log('🔍 SLACK WORKFLOW ROLLBACK: Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Workflow rollback webhook failed: ${response.statusText} - ${errorText}`);
      }

      console.log(`✅ Slack workflow rollback notification sent for workflow ${workflow.id}`);
      return true;
    } catch (error) {
      console.error('❌ Slack workflow rollback notification error:', error);
      throw error;
    }
  }
}
