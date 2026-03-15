const { Op } = require("sequelize");
const { KenyaLabTest, LabTest, Staff } = require("../models");
const { createCrudController, parsePagination, buildSearchWhere } = require("../utils/crudControllerFactory");

const searchableFields = ["test_name", "code", "description", "category"];
const defaultOrder = [["createdAt", "DESC"]];

/** Resolve hospital for current user (User.hospital_id or Staff.hospital_id). */
const getHospitalId = async (req) => {
  if (req.user?.hospital_id) return req.user.hospital_id;
  if (!req.user?.id) return null;
  const staff = await Staff.findOne({ where: { user_id: req.user.id }, attributes: ["hospital_id"] });
  return staff?.hospital_id ?? null;
};

/** GET /api/kenya-lab-tests - when exclude_added=1, exclude tests already in this hospital's lab_tests. */
const getAll = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { search } = req.query;
    const searchWhere = buildSearchWhere(search, searchableFields);
    let where = searchWhere;

    if (req.query.exclude_added === "1") {
      const hospitalId = await getHospitalId(req);
      if (hospitalId) {
        const existing = await LabTest.findAll({
          where: { hospital_id: hospitalId },
        attributes: ["test_code"],
      });
      const codes = [...new Set(existing.map((t) => (t.test_code || "").toString().trim()).filter(Boolean))];
      if (codes.length > 0) {
        const sequelize = LabTest.sequelize;
        const trimmedCode = sequelize.fn("TRIM", sequelize.col("code"));
        const excludeClause = {
          [Op.or]: [
            { code: null },
            sequelize.where(trimmedCode, ""),
            sequelize.where(trimmedCode, { [Op.notIn]: codes }),
          ],
        };
        where = Object.keys(searchWhere).length ? { [Op.and]: [searchWhere, excludeClause] } : excludeClause;
      }
      }
    }

    const { count, rows } = await KenyaLabTest.findAndCountAll({
      where,
      limit,
      offset,
      order: defaultOrder,
    });

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching KenyaLabTests",
      error: error.message,
    });
  }
};

const base = createCrudController({
  Model: KenyaLabTest,
  name: "KenyaLabTest",
  searchableFields,
  scopeByHospital: false,
});

module.exports = { ...base, getAll };
