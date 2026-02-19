const { Op } = require("sequelize");
const { LabResult, LabOrderItem, LabTest, LabOrder, Patient, User, Staff } = require("../models");
const { parsePagination } = require("../utils/crudControllerFactory");

const include = [
  {
    model: LabOrderItem,
    as: "labOrderItem",
    required: true,
    include: [
      { model: LabTest, as: "labTest", required: false },
      {
        model: LabOrder,
        as: "labOrder",
        required: false,
        include: [
          {
            model: Patient,
            as: "patient",
            attributes: { exclude: ["password"] },
            required: false,
            include: [{ model: User, as: "user", attributes: ["id", "full_name", "email", "phone"], required: false }],
          },
          { model: Staff, as: "doctor", required: false, include: [{ model: User, as: "user", attributes: ["id", "full_name", "email", "phone"], required: false }] },
        ],
      },
    ],
  },
  {
    model: Staff,
    as: "labTechnician",
    required: false,
    include: [{ model: User, as: "user", attributes: ["id", "full_name", "email", "phone"], required: false }],
  },
];

const list = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { search } = req.query;

    const where = {};
    if (search) {
      where[Op.or] = [
        { result_value: { [Op.iLike]: `%${search}%` } },
        { reference_range: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows } = await LabResult.findAndCountAll({
      where,
      limit,
      offset,
      include,
      order: [["result_date", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error listing lab results", error: error.message });
  }
};

const enterResults = async (req, res) => {
  try {
    const { lab_order_item_id, result_value, reference_range, interpretation, lab_technician_id, result_date } = req.body;
    if (!lab_order_item_id) {
      return res.status(400).json({ success: false, message: "lab_order_item_id is required" });
    }

    const item = await LabOrderItem.findByPk(lab_order_item_id);
    if (!item) return res.status(404).json({ success: false, message: "Lab order item not found" });

    let techId = lab_technician_id ?? null;
    if (!techId && req.userId) {
      const staff = await Staff.findOne({ where: { user_id: req.userId } });
      if (staff) techId = staff.id;
    }

    const existing = await LabResult.findOne({ where: { lab_order_item_id } });
    if (existing) {
      const updated = await existing.update({
        result_value: result_value ?? existing.result_value,
        reference_range: reference_range ?? existing.reference_range,
        interpretation: interpretation ?? existing.interpretation,
        lab_technician_id: techId ?? existing.lab_technician_id,
        result_date: result_date ?? existing.result_date,
      });
      return res.status(200).json({ success: true, data: updated });
    }

    const created = await LabResult.create({
      lab_order_item_id,
      result_value: result_value ?? null,
      reference_range: reference_range ?? null,
      interpretation: interpretation ?? null,
      lab_technician_id: techId ?? null,
      result_date: result_date ?? new Date(),
    });
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error entering lab results", error: error.message });
  }
};

const updateResults = enterResults;

module.exports = { list, enterResults, updateResults };

