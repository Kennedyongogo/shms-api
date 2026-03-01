const { AuditLog, User } = require("../models");
const { parsePagination } = require("../utils/crudControllerFactory");
const { getHospitalId } = require("../utils/hospitalScope");

const viewLogs = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { user_id, table_name, action } = req.query;
    const where = {};
    if (user_id) where.user_id = user_id;
    if (table_name) where.table_name = table_name;
    if (action) where.action = action;

    const hid = getHospitalId(req);
    const userInclude = {
      model: User,
      as: "user",
      attributes: ["id", "full_name", "email", "hospital_id"],
      required: hid != null,
      ...(hid != null ? { where: { hospital_id: hid } } : {}),
    };

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      limit,
      offset,
      order: [["timestamp", "DESC"]],
      include: [userInclude],
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

const viewOneLog = async (req, res) => {
  try {
    const { id } = req.params;
    const log = await AuditLog.findByPk(id, {
      include: [{ model: User, as: "user", attributes: ["id", "full_name", "email", "hospital_id"], required: false }],
    });
    if (!log) {
      return res.status(404).json({ success: false, message: "Audit log not found" });
    }
    const hid = getHospitalId(req);
    if (hid != null && log.user?.hospital_id !== hid)
      return res.status(404).json({ success: false, message: "Audit log not found" });
    return res.status(200).json({ success: true, data: log });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching audit log", error: error.message });
  }
};

module.exports = { viewLogs, viewOneLog };

