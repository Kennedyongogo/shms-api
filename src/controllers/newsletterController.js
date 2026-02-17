const { NewsletterSubscriber } = require("../models");
const { Op } = require("sequelize");
const {
  logCreate,
  logUpdate,
  logDelete,
  logStatusChange,
} = require("../utils/auditLogger");

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Subscribe to newsletter (public)
const subscribe = async (req, res) => {
  try {
    const { email, source } = req.body;
    const trimmedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!trimmedEmail) {
      return res.status(400).json({
        success: false,
        message: "Please provide an email address",
      });
    }

    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    const existing = await NewsletterSubscriber.findOne({
      where: { email: trimmedEmail },
    });

    if (existing) {
      if (existing.status === "subscribed") {
        return res.status(200).json({
          success: true,
          message: "You're already subscribed to our newsletter.",
          data: { id: existing.id },
        });
      }
      await existing.update({
        status: "subscribed",
        source: source || existing.source,
      });
      if (req.auditLogger) {
        logStatusChange(req.auditLogger, "NewsletterSubscriber", existing.id, "unsubscribed", "subscribed");
      }
      return res.status(200).json({
        success: true,
        message: "You've been re-subscribed to our newsletter.",
        data: { id: existing.id },
      });
    }

    const subscriber = await NewsletterSubscriber.create({
      email: trimmedEmail,
      status: "subscribed",
      source: source || "blog",
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.get("User-Agent") || null,
    });

    if (req.auditLogger) {
      logCreate(req.auditLogger, "NewsletterSubscriber", subscriber.id, { email: trimmedEmail });
    }

    res.status(201).json({
      success: true,
      message: "Thank you for subscribing! You'll receive our latest updates.",
      data: { id: subscriber.id },
    });
  } catch (error) {
    console.error("Error subscribing to newsletter:", error);
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(200).json({
        success: true,
        message: "You're already subscribed to our newsletter.",
        data: {},
      });
    }
    res.status(500).json({
      success: false,
      message: "Error subscribing to newsletter",
      error: error.message,
    });
  }
};

// Get all subscribers (admin)
const getAllSubscribers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    const where = {};

    if (search) {
      where.email = { [Op.like]: `%${search}%` };
    }

    if (status) {
      where.status = status;
    }

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const { count, rows } = await NewsletterSubscriber.findAndCountAll({
      where,
      limit: parseInt(limit, 10),
      offset,
      order: [[sortBy, sortOrder]],
    });

    res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(count / parseInt(limit, 10)),
      },
    });
  } catch (error) {
    console.error("Error fetching newsletter subscribers:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching subscribers",
      error: error.message,
    });
  }
};

// Get subscriber by ID (admin)
const getSubscriberById = async (req, res) => {
  try {
    const { id } = req.params;
    const subscriber = await NewsletterSubscriber.findByPk(id);
    if (!subscriber) {
      return res.status(404).json({
        success: false,
        message: "Subscriber not found",
      });
    }
    res.status(200).json({
      success: true,
      data: subscriber,
    });
  } catch (error) {
    console.error("Error fetching subscriber:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching subscriber",
      error: error.message,
    });
  }
};

// Update subscriber status (admin)
const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["subscribed", "unsubscribed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be 'subscribed' or 'unsubscribed'",
      });
    }

    const subscriber = await NewsletterSubscriber.findByPk(id);
    if (!subscriber) {
      return res.status(404).json({
        success: false,
        message: "Subscriber not found",
      });
    }

    const previousStatus = subscriber.status;
    await subscriber.update({ status });

    if (req.auditLogger) {
      logStatusChange(req.auditLogger, "NewsletterSubscriber", id, previousStatus, status);
    }

    res.status(200).json({
      success: true,
      message: "Status updated",
      data: subscriber,
    });
  } catch (error) {
    console.error("Error updating subscriber status:", error);
    res.status(500).json({
      success: false,
      message: "Error updating status",
      error: error.message,
    });
  }
};

// Delete subscriber (admin)
const deleteSubscriber = async (req, res) => {
  try {
    const { id } = req.params;
    const subscriber = await NewsletterSubscriber.findByPk(id);
    if (!subscriber) {
      return res.status(404).json({
        success: false,
        message: "Subscriber not found",
      });
    }
    await subscriber.destroy();
    if (req.auditLogger) {
      logDelete(req.auditLogger, "NewsletterSubscriber", id, { email: subscriber.email });
    }
    res.status(200).json({
      success: true,
      message: "Subscriber removed",
    });
  } catch (error) {
    console.error("Error deleting subscriber:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting subscriber",
      error: error.message,
    });
  }
};

module.exports = {
  subscribe,
  getAllSubscribers,
  getSubscriberById,
  updateStatus,
  deleteSubscriber,
};
