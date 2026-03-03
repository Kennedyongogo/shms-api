const { DoctorSchedule, Staff } = require("../models");
const { createCrudController, parsePagination } = require("../utils/crudControllerFactory");

const base = createCrudController({
  Model: DoctorSchedule,
  name: "DoctorSchedule",
  searchableFields: [],
});

/** Allow only Super Admin or the staff who owns the schedule (doctor_id). */
const canModifySchedule = async (req, schedule) => {
  if (!schedule) return false;
  if (req.userType === "user" && req.role?.name === "Super Admin") return true;
  if (!req.userId) return false;
  const staff = await Staff.findOne({ where: { user_id: req.userId }, attributes: ["id"] });
  return staff && String(staff.id) === String(schedule.doctor_id);
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await DoctorSchedule.findByPk(id);
    if (!record) return res.status(404).json({ success: false, message: "DoctorSchedule not found" });
    const allowed = await canModifySchedule(req, record);
    if (!allowed) return res.status(403).json({ success: false, message: "Only Super Admin or the staff who owns this schedule can edit it" });
    const { day_of_week, start_time, end_time } = req.body;
    const payload = {};
    if (day_of_week !== undefined) payload.day_of_week = day_of_week;
    if (start_time !== undefined) payload.start_time = start_time;
    if (end_time !== undefined) payload.end_time = end_time;
    const updated = await record.update(payload);
    const { auditLog } = require("../utils/auditLog");
    await auditLog(req, { action: "UPDATE_DOCTORSCHEDULE", table_name: "DoctorSchedule", record_id: id });
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error updating DoctorSchedule",
      error: error.message,
    });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await DoctorSchedule.findByPk(id);
    if (!record) return res.status(404).json({ success: false, message: "DoctorSchedule not found" });
    const allowed = await canModifySchedule(req, record);
    if (!allowed) return res.status(403).json({ success: false, message: "Only Super Admin or the staff who owns this schedule can remove it" });
    await record.destroy();
    const { auditLog } = require("../utils/auditLog");
    await auditLog(req, { action: "DELETE_DOCTORSCHEDULE", table_name: "DoctorSchedule", record_id: id });
    return res.status(200).json({ success: true, message: "DoctorSchedule deleted" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error deleting DoctorSchedule",
      error: error.message,
    });
  }
};

const getAll = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const where = {};
    if (req.query.doctor_id) where.doctor_id = req.query.doctor_id;
    const { count, rows } = await DoctorSchedule.findAndCountAll({
      where,
      limit,
      offset,
      order: [["day_of_week", "ASC"], ["start_time", "ASC"]],
    });
    return res.status(200).json({
      success: true,
      data: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching schedules",
      error: error.message,
    });
  }
};

module.exports = {
  ...base,
  getAll,
  update,
  remove,
};

