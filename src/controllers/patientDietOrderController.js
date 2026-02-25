const { PatientDietOrder, Admission, DietType, Staff, User } = require("../models");
const { createCrudController, parsePagination } = require("../utils/crudControllerFactory");

const include = [
  { model: Admission, as: "admission", attributes: ["id", "patient_id", "admission_date", "status"] },
  { model: DietType, as: "dietType", attributes: ["id", "name", "description"] },
  { model: Staff, as: "prescribedBy", attributes: ["id"], include: [{ model: User, as: "user", attributes: ["id", "full_name"] }] },
];

const crud = createCrudController({
  Model: PatientDietOrder,
  name: "PatientDietOrder",
  searchableFields: [],
  include,
  defaultOrder: [["start_date", "DESC"]],
});

const getAll = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { admission_id, diet_type_id } = req.query;
    const where = {};
    if (admission_id && String(admission_id).trim()) {
      where.admission_id = String(admission_id).trim();
    }
    if (diet_type_id && String(diet_type_id).trim()) {
      where.diet_type_id = String(diet_type_id).trim();
    }
    const { count, rows } = await PatientDietOrder.findAndCountAll({
      where,
      limit,
      offset,
      include,
      order: [["start_date", "DESC"]],
    });
    return res.status(200).json({
      success: true,
      data: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching patient diet orders",
      error: error.message,
    });
  }
};

module.exports = { ...crud, getAll };
