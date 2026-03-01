const { Op } = require("sequelize");
const { Staff, User, Hospital, Department, DoctorSchedule, sequelize } = require("../models");
const { createCrudController, parsePagination } = require("../utils/crudControllerFactory");
const { scopeByHospital, belongsToUserHospital, withHospitalId } = require("../utils/hospitalScope");

/** Parse available_at (ISO datetime) to { dayOfWeek: 0-6, timeStr: 'HH:mm' }. Returns null if invalid. */
function parseAvailableAt(availableAt) {
  if (!availableAt || typeof availableAt !== "string") return null;
  const d = new Date(availableAt.trim());
  if (Number.isNaN(d.getTime())) return null;
  const dayOfWeek = d.getDay();
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const timeStr = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
  return { dayOfWeek, timeStr };
}

const baseInclude = [
  {
    model: User,
    as: "user",
    attributes: ["id", "full_name", "email", "phone", "status", "last_login", "profile_image_path"],
  },
  { model: Hospital, as: "hospital", attributes: ["id", "name"], required: false },
  { model: Department, as: "department", attributes: ["id", "name"], required: false },
];

const crud = createCrudController({
  Model: Staff,
  name: "Staff",
  searchableFields: ["staff_type", "specialization", "license_number"],
  include: baseInclude,
});

// Enhanced listing: supports search across staff + linked user, and filters
const getAll = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { search, staff_type, hospital_id, department_id, user_id, available_at } = req.query;

    const where = { ...scopeByHospital(req) };
    if (staff_type) where.staff_type = staff_type;
    if (hospital_id && where.hospital_id == null) where.hospital_id = hospital_id;
    if (department_id) where.department_id = department_id;
    if (user_id) where.user_id = user_id;

    const parsed = parseAvailableAt(available_at);
    if (parsed) {
      const timeStr = parsed.timeStr;
      const scheduleRows = await DoctorSchedule.findAll({
        attributes: ["doctor_id"],
        where: {
          day_of_week: parsed.dayOfWeek,
          [Op.and]: [
            sequelize.literal(
              `start_time <= '${timeStr}' AND (end_time > '${timeStr}' OR end_time IN ('00:00', '00:00:00'))`
            ),
          ],
        },
        raw: true,
      });
      const doctorIds = [...new Set(scheduleRows.map((r) => r.doctor_id))];
      if (doctorIds.length === 0) {
        return res.status(200).json({
          success: true,
          data: [],
          pagination: { total: 0, page: parseInt(req.query.page, 10) || 1, limit: parseInt(req.query.limit, 10) || 10, totalPages: 0 },
        });
      }
      where.id = { [Op.in]: doctorIds };
    }

    const userWhere = search
      ? {
          [Op.or]: [
            { full_name: { [Op.iLike]: `%${search}%` } },
            { email: { [Op.iLike]: `%${search}%` } },
            { phone: { [Op.iLike]: `%${search}%` } },
          ],
        }
      : null;

    const staffSearchWhere = search
      ? {
          [Op.or]: [
            { staff_type: { [Op.iLike]: `%${search}%` } },
            { specialization: { [Op.iLike]: `%${search}%` } },
            { license_number: { [Op.iLike]: `%${search}%` } },
          ],
        }
      : null;

    const include = [
      {
        model: User,
        as: "user",
        attributes: ["id", "full_name", "email", "phone", "status", "last_login", "profile_image_path"],
        where: userWhere || undefined,
        required: Boolean(userWhere),
      },
      { model: Hospital, as: "hospital", attributes: ["id", "name"], required: false },
      { model: Department, as: "department", attributes: ["id", "name"], required: false },
      { model: DoctorSchedule, as: "schedules", attributes: ["id", "day_of_week", "start_time", "end_time"], required: false },
    ];

    const finalWhere = staffSearchWhere ? { ...where, [Op.and]: [staffSearchWhere] } : where;

    const { count, rows } = await Staff.findAndCountAll({
      where: finalWhere,
      include,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
      distinct: true,
    });

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching Staff",
      error: error.message,
    });
  }
};

const getByIdScoped = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await Staff.findByPk(id, { include: baseInclude });
    if (!record) return res.status(404).json({ success: false, message: "Staff not found" });
    if (!belongsToUserHospital(record, req)) return res.status(404).json({ success: false, message: "Staff not found" });
    return res.status(200).json({ success: true, data: record });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching Staff", error: error.message });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await Staff.findByPk(id);
    if (!record) return res.status(404).json({ success: false, message: "Staff not found" });
    if (!belongsToUserHospital(record, req)) return res.status(403).json({ success: false, message: "Access denied" });
    return crud.update(req, res);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await Staff.findByPk(id);
    if (!record) return res.status(404).json({ success: false, message: "Staff not found" });
    if (!belongsToUserHospital(record, req)) return res.status(403).json({ success: false, message: "Access denied" });
    return crud.remove(req, res);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const create = async (req, res) => {
  req.body = withHospitalId(req.body || {}, req);
  return crud.create(req, res);
};

module.exports = { ...crud, getAll, getById: getByIdScoped, update, remove, create };

