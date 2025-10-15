import { dbAll, dbRun } from '../config/database.js';

// Cleanup job - finds approval_steps where status is 'pending' and timeout_at <= now
// Behavior controlled by env:
// - DELETE_EXPIRED_APPROVALS (default: false) => actually DELETE rows; otherwise set status='timed_out'
// - CLEANUP_INTERVAL_MINUTES (default: 5) => how often the job runs

const DEFAULT_INTERVAL_MINUTES = 5;

function parseBool(v) {
  if (v === undefined || v === null) return false;
  return String(v).toLowerCase() === 'true';
}

export function startCleanupJob() {
  const intervalMinutes = parseInt(process.env.CLEANUP_INTERVAL_MINUTES || DEFAULT_INTERVAL_MINUTES, 10);
  const deleteExpired = parseBool(process.env.DELETE_EXPIRED_APPROVALS);

  console.log(`🧹 Starting cleanup job: interval=${intervalMinutes}min deleteExpired=${deleteExpired}`);

  async function runOnce() {
    try {
      const now = new Date().toISOString();
      const rows = await dbAll(
        `SELECT * FROM approval_steps WHERE status = 'pending' AND timeout_at IS NOT NULL AND timeout_at <= ?`,
        [now]
      );

      if (!rows || rows.length === 0) {
        // nothing to do
        return;
      }

      console.log(`🧹 Found ${rows.length} expired approval(s)`);

      for (const row of rows) {
        // if deleteExpired is true, remove the row; otherwise mark timed_out and set responded_at
        if (deleteExpired) {
          await dbRun('DELETE FROM approval_steps WHERE id = ?', [row.id]);
          console.log(`🗑️  Deleted expired approval ${row.id}`);
        } else {
          await dbRun(
            `UPDATE approval_steps SET status = ?, responded_at = CURRENT_TIMESTAMP WHERE id = ?`,
            ['timed_out', row.id]
          );
          console.log(`⏱️  Marked approval ${row.id} as timed_out`);
        }

        // After removing/marking this approval, check whether the workflow still has any pending approvals
        try {
          const pending = await dbAll('SELECT status FROM approval_steps WHERE workflow_id = ?', [row.workflow_id]);
          const hasPending = pending.some(p => p.status === 'pending');
          const newStatus = hasPending ? 'paused' : 'running';
          await dbRun('UPDATE workflows SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newStatus, row.workflow_id]);
          console.log(`🔁 Workflow ${row.workflow_id} status set to ${newStatus}`);
        } catch (wfErr) {
          console.error('Error updating workflow status after cleanup:', wfErr);
        }
      }
    } catch (err) {
      console.error('Cleanup job error:', err);
    }
  }

  // Run immediately, then schedule
  runOnce();
  const timer = setInterval(runOnce, intervalMinutes * 60 * 1000);

  // Return a handle so tests or shutdown code can stop it
  return { stop: () => clearInterval(timer) };
}
