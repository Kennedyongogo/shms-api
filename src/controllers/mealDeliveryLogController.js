const { MealDeliveryLog, Admission, Staff, User } = require("../models");
const { createCrudController, parsePagination } = require("../utils/crudControllerFactory");

async function getCurrentStaff(req) {
  if (!req.userId) return null;
  const staff = await Staff.findOne({ where: { user_id: req.userId } });
  return staff || null;
}

const include = [
  { model: Admission, as: "admission", attributes: ["id", "patient_id", "admission_date", "status"] },
  { model: Staff, as: "deliveredBy", attributes: ["id"], include: [{ model: User, as: "user", attributes: ["id", "full_name"] }] },
];

const crud = createCrudController({
  Model: MealDeliveryLog,
  name: "MealDeliveryLog",
  searchableFields: ["meal_type", "status"],
  include,
  defaultOrder: [["date", "DESC"]],
  buildCreateData: async (req) => {
    const body = req.body || {};
    const staff = await getCurrentStaff(req);
    const deliveredBy = body.delivered_by != null && body.delivered_by !== "" ? body.delivered_by : (staff?.id ?? null);
    return { ...body, delivered_by: deliveredBy };
  },
});

const getAll = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { admission_id, date, meal_type } = req.query;
    const where = {};
    if (admission_id && String(admission_id).trim()) {
      where.admission_id = String(admission_id).trim();
    }
    if (date && String(date).trim()) {
      where.date = String(date).trim();
    }
    if (meal_type && String(meal_type).trim()) {
      where.meal_type = String(meal_type).trim();
    }
    const { count, rows } = await MealDeliveryLog.findAndCountAll({
      where,
      limit,
      offset,
      include,
      order: [["date", "DESC"]],
    });
    return res.status(200).json({
      success: true,
      data: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching meal delivery logs",
      error: error.message,
    });
  }
};

module.exports = { ...crud, getAll };
