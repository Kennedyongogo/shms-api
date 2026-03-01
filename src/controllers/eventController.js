const { Op } = require("sequelize");
const { Event, EventImage } = require("../models");
const { createCrudController, parsePagination } = require("../utils/crudControllerFactory");
const { toRelativeUploadPath } = require("../middleware/upload");
const { scopeByHospital, belongsToUserHospital, withHospitalId } = require("../utils/hospitalScope");

const withBannerPath = (req) => {
  const body = { ...req.body };
  if (req.file?.path) body.banner_image_path = toRelativeUploadPath(req.file.path);
  return body;
};

const crud = createCrudController({
  Model: Event,
  name: "Event",
  searchableFields: ["title", "slug", "description", "location", "status"],
  buildCreateData: withBannerPath,
  buildUpdateData: withBannerPath,
});

const getAll = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { search } = req.query;
    const where = { ...scopeByHospital(req) };
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { slug: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { location: { [Op.iLike]: `%${search}%` } },
        { status: { [Op.iLike]: `%${search}%` } },
      ];
    }
    const { count, rows } = await Event.findAndCountAll({ where, limit, offset, order: [["createdAt", "DESC"]] });
    return res.status(200).json({
      success: true,
      data: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching Events", error: error.message });
  }
};

const getByIdScoped = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await Event.findByPk(id);
    if (!record) return res.status(404).json({ success: false, message: "Event not found" });
    if (!belongsToUserHospital(record, req)) return res.status(404).json({ success: false, message: "Event not found" });
    return res.status(200).json({ success: true, data: record });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching Event", error: error.message });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await Event.findByPk(id);
    if (!record) return res.status(404).json({ success: false, message: "Event not found" });
    if (!belongsToUserHospital(record, req)) return res.status(403).json({ success: false, message: "Access denied" });
    return crud.update(req, res);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await Event.findByPk(id);
    if (!record) return res.status(404).json({ success: false, message: "Event not found" });
    if (!belongsToUserHospital(record, req)) return res.status(403).json({ success: false, message: "Access denied" });
    return crud.remove(req, res);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const create = async (req, res) => {
  req.body = withBannerPath(req);
  req.body = withHospitalId(req.body || {}, req);
  return crud.create(req, res);
};

const publish = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findByPk(id);
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });
    if (!belongsToUserHospital(event, req)) return res.status(403).json({ success: false, message: "Access denied" });
    const updated = await event.update({ status: "published" });
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error publishing event", error: error.message });
  }
};

const addEventImage = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findByPk(id);
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });
    if (!belongsToUserHospital(event, req)) return res.status(403).json({ success: false, message: "Access denied" });

    if (!req.file?.path) {
      return res.status(400).json({ success: false, message: "event_image file is required" });
    }

    const { caption, uploaded_by } = req.body;
    const img = await EventImage.create({
      event_id: id,
      image_path: toRelativeUploadPath(req.file.path),
      caption: caption ?? null,
      uploaded_by: uploaded_by ?? null,
    });
    return res.status(201).json({ success: true, data: img });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error adding event image", error: error.message });
  }
};

module.exports = { ...crud, getAll, getById: getByIdScoped, update, remove, create, publish, addEventImage };

