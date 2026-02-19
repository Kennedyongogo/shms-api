const { Notification } = require("../models");
const { createCrudController } = require("../utils/crudControllerFactory");

const crud = createCrudController({
  Model: Notification,
  name: "Notification",
  searchableFields: ["message", "type"],
});

const sendNotifications = async (req, res) => {
  try {
    const { user_ids, message, type } = req.body;
    if (!Array.isArray(user_ids) || !user_ids.length || !message) {
      return res.status(400).json({ success: false, message: "user_ids(array) and message are required" });
    }
    const rows = user_ids.map((user_id) => ({
      user_id,
      message,
      type: type ?? null,
      is_read: false,
    }));
    const created = await Notification.bulkCreate(rows);
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error sending notifications", error: error.message });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notif = await Notification.findByPk(id);
    if (!notif) return res.status(404).json({ success: false, message: "Notification not found" });
    const updated = await notif.update({ is_read: true });
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error marking notification as read", error: error.message });
  }
};

module.exports = { ...crud, sendNotifications, markAsRead };

