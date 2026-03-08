const cron = require('node-cron');
const db = require('./db');
const { runWorkflow } = require('./engine');

// workflowId → ScheduledTask[]
const jobs = new Map();

const PRESETS = {
  every_minute:      '* * * * *',
  every_hour:        '0 * * * *',
  every_6h:          '0 */6 * * *',
  every_day_9am:     '0 9 * * *',
  every_day_midnight:'0 0 * * *',
};

function getCronExpression(nodeData) {
  if (!nodeData) return null;
  if (nodeData.preset && nodeData.preset !== 'custom') {
    return PRESETS[nodeData.preset] || null;
  }
  return nodeData.cronExpression || null;
}

function cancelWorkflowJobs(workflowId) {
  const existing = jobs.get(workflowId);
  if (existing) {
    existing.forEach((t) => t.stop());
    jobs.delete(workflowId);
  }
}

function registerWorkflowJobs(workflowId) {
  cancelWorkflowJobs(workflowId);

  const wf = db.get('workflows').find({ id: workflowId }).value();
  if (!wf || !wf.nodes) return;

  const scheduleNodes = wf.nodes.filter((n) => n.type === 'scheduleNode');
  if (scheduleNodes.length === 0) return;

  const newJobs = [];
  for (const node of scheduleNodes) {
    const expr = getCronExpression(node.data);
    if (!expr) continue;

    if (!cron.validate(expr)) {
      console.warn(`[cron] Invalid expression "${expr}" — skipping node ${node.id}`);
      continue;
    }

    const task = cron.schedule(expr, async () => {
      // Always re-read from db so changes made after registration are picked up
      const latestWf = db.get('workflows').find({ id: workflowId }).value();
      if (!latestWf) return;
      console.log(`[cron] Triggering workflow "${latestWf.name}" (${workflowId})`);
      try {
        await runWorkflow(latestWf.nodes, latestWf.edges);
      } catch (err) {
        console.error(`[cron] Workflow ${workflowId} failed:`, err.message);
      }
    });

    newJobs.push(task);
  }

  if (newJobs.length > 0) {
    jobs.set(workflowId, newJobs);
    console.log(`[cron] Registered ${newJobs.length} job(s) for workflow ${workflowId}`);
  }
}

/** Call once at server startup to restore all cron jobs from db. */
function initAllJobs() {
  const workflows = db.get('workflows').value() || [];
  let registered = 0;
  for (const wf of workflows) {
    const hasSchedule = (wf.nodes || []).some((n) => n.type === 'scheduleNode');
    if (hasSchedule) {
      registerWorkflowJobs(wf.id);
      registered++;
    }
  }
  console.log(`[cron] Startup — registered jobs for ${registered} workflow(s)`);
}

module.exports = { initAllJobs, registerWorkflowJobs, cancelWorkflowJobs };
