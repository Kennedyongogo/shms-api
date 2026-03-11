const { Notification } = require("../models");
const { createCrudController, parsePagination } = require("../utils/crudControllerFactory");

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
    const created = await Notification.bulkCreate(rows, { returning: true });

    // Emit real-time events to connected users (if Socket.IO is available)
    const io = req.app?.get("io");
    if (io) {
      for (const notif of created) {
        io.to(`user:${notif.user_id}`).emit("notification_new", {
          id: notif.id,
          user_id: notif.user_id,
          message: notif.message,
          type: notif.type,
          is_read: notif.is_read,
          createdAt: notif.createdAt,
        });
      }
    }

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

const getMyNotifications = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const where = {
      user_id: req.user.id,
    };
    if (typeof req.query.is_read !== "undefined") {
      if (req.query.is_read === "true") where.is_read = true;
      if (req.query.is_read === "false") where.is_read = false;
    }

    const { count, rows } = await Notification.findAndCountAll({
      where,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching notifications",
      error: error.message,
    });
  }
};

const removeNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const notif = await Notification.findByPk(id);
    if (!notif) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }
    if (notif.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: "You can only delete your own notifications" });
    }
    await notif.destroy();
    return res.status(200).json({ success: true, message: "Notification deleted" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error deleting notification",
      error: error.message,
    });
  }
};

module.exports = {
  ...crud,
  sendNotifications,
  markAsRead,
  getMyNotifications,
  removeNotification,
};

