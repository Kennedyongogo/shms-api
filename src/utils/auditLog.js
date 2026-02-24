const { AuditLog } = require("../models");

/**
 * Create an audit log entry for the current request. No-op if req.user is missing.
 * @param {object} req - Express request (must have req.user.id if authenticated)
 * @param {object} opts - { action: string, table_name?: string, record_id?: string }
 */
async function auditLog(req, opts) {
  const userId = req.user?.id;
  if (!userId) return;
  const { action, table_name, record_id } = opts || {};
  if (!action) return;
  try {
    await AuditLog.create({
      user_id: userId,
      action: String(action).slice(0, 255),
      table_name: table_name != null ? String(table_name).slice(0, 255) : null,
      record_id: record_id != null ? String(record_id).slice(0, 100) : null,
    });
  } catch (err) {
    console.error("[auditLog]", err.message);
  }
}

module.exports = { auditLog };
