const { AuditLog, User } = require("../models");
const { parsePagination } = require("../utils/crudControllerFactory");

const viewLogs = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { user_id, table_name, action } = req.query;
    const where = {};
    if (user_id) where.user_id = user_id;
    if (table_name) where.table_name = table_name;
    if (action) where.action = action;

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      limit,
      offset,
      order: [["timestamp", "DESC"]],
      include: [{ model: User, as: "user", attributes: ["id", "full_name", "email"], required: false }],
    });
    return res.status(200).json({
      success: true,
      data: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching audit logs", error: error.message });
  }
};

module.exports = { viewLogs };

