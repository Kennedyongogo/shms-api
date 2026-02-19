const { Event, EventImage } = require("../models");
const { createCrudController } = require("../utils/crudControllerFactory");
const { toRelativeUploadPath } = require("../middleware/upload");

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

const publish = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findByPk(id);
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });
    const updated = await event.update({ status: "published" });
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error publishing event", error: error.message });
  }
};

const addEventImage = async (req, res) => {
  try {
    const { id } = req.params; // event id
    const event = await Event.findByPk(id);
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });

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

module.exports = { ...crud, publish, addEventImage };

