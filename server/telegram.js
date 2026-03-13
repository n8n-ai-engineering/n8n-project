const TelegramBot = require('node-telegram-bot-api');
const db = require('./db');

// token → TelegramBot instance  (one polling connection per unique token)
const pollingBots = new Map();

// workflowId → { token, handler }  (tracks the listener so it can be removed cleanly)
const workflowHandlers = new Map();

/**
 * Activate (or re-activate) the Telegram bot for a workflow.
 * Reuses an existing polling connection when the token is already active,
 * preventing 409 Conflict errors caused by starting a second getUpdates request.
 */
async function activateWorkflowBot(workflowId) {
  // Remove any existing listener for this workflow first (safe no-op if none)
  deactivateWorkflowBot(workflowId);

  const wf = db.get('workflows').find({ id: workflowId }).value();
  if (!wf || !wf.isActive) return;

  const triggerNode = (wf.nodes || []).find((n) => n.type === 'telegramTriggerNode');
  if (!triggerNode) return;

  const token = (triggerNode.data?.token || '').trim();
  if (!token) {
    console.warn(`[telegram] Workflow "${wf.name}" has a TelegramTrigger node but no bot token is set`);
    return;
  }

  try {
    // ── Reuse the existing polling connection for this token, or create one ──
    let bot = pollingBots.get(token);

    if (!bot) {
      bot = new TelegramBot(token, { polling: true });

      bot.on('polling_error', (err) => {
        const code = err?.code || err?.response?.statusCode;
        const tokenSuffix = `...${token.slice(-6)}`;
        if (code === 409 || (err.message || '').includes('409')) {
          console.error(`[telegram] Conflict (409) for token ${tokenSuffix} — another instance is already polling. Stopping.`);
          bot.stopPolling().catch(() => {});
          pollingBots.delete(token);
          // Remove all workflow entries that relied on this token
          for (const [wfId, entry] of workflowHandlers.entries()) {
            if (entry.token === token) workflowHandlers.delete(wfId);
          }
        } else {
          console.error(`[telegram] Polling error for token ${tokenSuffix}:`, err.message);
        }
      });

      pollingBots.set(token, bot);
      console.log(`[telegram] Started new polling connection for token ...${token.slice(-6)}`);
    } else {
      console.log(`[telegram] Reusing existing polling connection for token ...${token.slice(-6)}`);
    }

    // ── Build a named handler so it can be removed precisely later ──────────
    const handler = async (msg) => {
      // Always re-read from db so edits made after activation are picked up
      const latestWf = db.get('workflows').find({ id: workflowId }).value();
      if (!latestWf || !latestWf.isActive) return;

      console.log(`[telegram] "${latestWf.name}" — message from chat ${msg.chat.id}: "${msg.text}"`);

      // Lazy-require to avoid circular deps at startup
      const { runWorkflow } = require('./engine');
      try {
        const result = await runWorkflow(latestWf.nodes, latestWf.edges, {
          telegramPayload: {
            text: msg.text || '',
            chat_id: String(msg.chat.id),
            from: msg.from || {},
            message_id: msg.message_id,
          },
        });
        console.log('[telegram] Workflow execution success:', result.finalOutput);
      } catch (err) {
        console.error('[telegram] Workflow execution failed:', err);
      }
    };

    bot.on('message', handler);
    workflowHandlers.set(workflowId, { token, handler });
    console.log(`[telegram] Activated workflow "${wf.name}" (${workflowId})`);
  } catch (err) {
    console.error(`[telegram] Failed to activate bot for workflow "${wf.name}":`, err.message);
  }
}

/**
 * Remove the message listener for a workflow.
 * Stops polling entirely only when no other workflow is using the same token.
 */
function deactivateWorkflowBot(workflowId) {
  const entry = workflowHandlers.get(workflowId);
  if (!entry) return;

  const { token, handler } = entry;
  workflowHandlers.delete(workflowId);

  const bot = pollingBots.get(token);
  if (bot) {
    bot.removeListener('message', handler);
  }

  // Only stop polling if no other workflow is still using this token
  const tokenStillInUse = [...workflowHandlers.values()].some((e) => e.token === token);
  if (!tokenStillInUse && bot) {
    bot.stopPolling().catch((err) => {
      console.error(`[telegram] Error stopping polling for token ...${token.slice(-6)}:`, err.message);
    });
    pollingBots.delete(token);
    console.log(`[telegram] Stopped polling for token ...${token.slice(-6)} (no active workflows)`);
  }

  console.log(`[telegram] Deactivated workflow ${workflowId}`);
}

/**
 * Called once at server startup: restore all bots for active workflows
 * that contain a TelegramTrigger node.
 */
async function initAllBots() {
  const workflows = db.get('workflows').value() || [];
  let activated = 0;
  for (const wf of workflows) {
    if (!wf.isActive) continue;
    const hasTrigger = (wf.nodes || []).some((n) => n.type === 'telegramTriggerNode');
    if (hasTrigger) {
      await activateWorkflowBot(wf.id);
      activated++;
    }
  }
  console.log(`[telegram] Startup — activated ${activated} bot(s)`);
}

module.exports = { activateWorkflowBot, deactivateWorkflowBot, initAllBots };
