const { Op } = require("sequelize");
const { Staff, User, Hospital, Department } = require("../models");
const { createCrudController, parsePagination } = require("../utils/crudControllerFactory");

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
    const { search, staff_type, hospital_id, department_id, user_id } = req.query;

    const where = {};
    if (staff_type) where.staff_type = staff_type;
    if (hospital_id) where.hospital_id = hospital_id;
    if (department_id) where.department_id = department_id;
    if (user_id) where.user_id = user_id;

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
    ];

    const finalWhere = staffSearchWhere ? { ...where, [Op.and]: [staffSearchWhere] } : where;

    const { count, rows } = await Staff.findAndCountAll({
      where: finalWhere,
      include,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
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

module.exports = { ...crud, getAll };

