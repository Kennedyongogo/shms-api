const { LabTest, LabTestTemplate } = require("../models");
const { createCrudController } = require("../utils/crudControllerFactory");

const buildCreateData = async (req) => {
  const body = { ...req.body };
  const hospitalId = req.user?.hospital_id ?? body.hospital_id ?? null;
  if (hospitalId != null) body.hospital_id = hospitalId;
  if (body.price != null) body.price = Number(body.price);
  // template (if provided) is stored in LabTestTemplate table, not in LabTest
  delete body.template;
  delete body.template_version;
  return body;
};

const crud = createCrudController({
  Model: LabTest,
  name: "LabTest",
  searchableFields: ["test_name", "test_code"],
  scopeByHospital: true,
  buildCreateData,
});

const includeTemplate = [{ model: LabTestTemplate, as: "template", required: false }];

// Override reads so admin UI can show template on click
const getAll = async (req, res) => {
  try {
    const { parsePagination } = require("../utils/crudControllerFactory");
    const { page, limit, offset } = parsePagination(req.query);
    const { search } = req.query;
    const where = {};
    if (req.user?.hospital_id) where.hospital_id = req.user.hospital_id;
    if (search) {
      const { Op } = require("sequelize");
      where[Op.or] = [
        { test_name: { [Op.iLike]: `%${search}%` } },
        { test_code: { [Op.iLike]: `%${search}%` } },
      ];
    }
    const { count, rows } = await LabTest.findAndCountAll({
      where,
      include: includeTemplate,
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
    return res.status(500).json({ success: false, message: "Error fetching LabTests", error: error.message });
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await LabTest.findByPk(id, { include: includeTemplate });
    if (!record) return res.status(404).json({ success: false, message: "LabTest not found" });
    if (req.user?.hospital_id && record.hospital_id && record.hospital_id !== req.user.hospital_id) {
      return res.status(404).json({ success: false, message: "LabTest not found" });
    }
    return res.status(200).json({ success: true, data: record });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching LabTest", error: error.message });
  }
};

// Lookup by (hospital_id + test_name). This is for UI flows where the table row click uses the name.
const getByName = async (req, res) => {
  try {
    const { Op } = require("sequelize");
    const testName =
      req.query.test_name ?? req.query.testName ?? req.body?.test_name ?? req.body?.testName ?? null;
    const hospitalIdFromQuery = req.query.hospital_id ?? req.query.hospitalId ?? null;

    if (!testName) {
      return res.status(400).json({ success: false, message: "test_name is required" });
    }
    const cleanName = String(testName).trim();
    if (!cleanName) {
      return res.status(400).json({ success: false, message: "test_name cannot be empty" });
    }

    // Secure scoping: if the logged-in user has a hospital_id, always force it.
    const hospitalId = req.user?.hospital_id ?? hospitalIdFromQuery;
    if (!hospitalId) {
      return res.status(400).json({ success: false, message: "hospital_id is required" });
    }

    const record = await LabTest.findOne({
      where: {
        hospital_id: hospitalId,
        // Case-insensitive exact match.
        test_name: { [Op.iLike]: cleanName },
      },
      include: includeTemplate,
      order: [["createdAt", "DESC"]],
    });

    if (!record) {
      return res.status(404).json({ success: false, message: "LabTest not found" });
    }

    return res.status(200).json({ success: true, data: record });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching LabTest", error: error.message });
  }
};

// Override create/update to support saving templates.
const createWithTemplate = async (req, res) => {
  try {
    const body = { ...req.body };
    const template = body.template ?? null;
    const templateVersion = body.template_version != null ? Number(body.template_version) : null;
    const hospitalId = req.user?.hospital_id ?? body.hospital_id ?? null;
    if (hospitalId != null) body.hospital_id = hospitalId;
    if (body.price != null) body.price = Number(body.price);
    delete body.template;
    delete body.template_version;

    const created = await LabTest.create(body);
    if (template) {
      await LabTestTemplate.upsert({
        lab_test_id: created.id,
        version: Number.isFinite(templateVersion) && templateVersion > 0 ? templateVersion : 1,
        template,
      });
    }
    const reloaded = await LabTest.findByPk(created.id, {
      include: [{ model: LabTestTemplate, as: "template", required: false }],
    });
    return res.status(201).json({ success: true, data: reloaded });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error creating LabTest", error: error.message });
  }
};

const updateWithTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await LabTest.findByPk(id);
    if (!record) return res.status(404).json({ success: false, message: "LabTest not found" });

    const body = { ...req.body };
    const template = Object.prototype.hasOwnProperty.call(body, "template") ? body.template : undefined;
    const templateVersion = body.template_version != null ? Number(body.template_version) : undefined;
    if (body.price != null) body.price = Number(body.price);
    delete body.template;
    delete body.template_version;

    await record.update(body);
    if (template !== undefined) {
      if (template == null) {
        await LabTestTemplate.destroy({ where: { lab_test_id: id } });
      } else {
        const existing = await LabTestTemplate.findOne({ where: { lab_test_id: id } });
        const nextVersion =
          Number.isFinite(templateVersion) && templateVersion > 0
            ? templateVersion
            : (existing?.version || 0) + 1;
        await LabTestTemplate.upsert({
          lab_test_id: id,
          version: nextVersion,
          template,
        });
      }
    }

    const reloaded = await LabTest.findByPk(id, {
      include: [{ model: LabTestTemplate, as: "template", required: false }],
    });
    return res.status(200).json({ success: true, data: reloaded });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error updating LabTest", error: error.message });
  }
};

module.exports = { ...crud, getAll, getById, getByName, create: createWithTemplate, update: updateWithTemplate };

