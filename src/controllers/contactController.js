const { Contact } = require("../models");
const { Op } = require("sequelize");
const {
  logCreate,
  logUpdate,
  logDelete,
  logStatusChange,
} = require("../utils/auditLogger");

// Create contact (public)
const createContact = async (req, res) => {
  try {
    const { fullName, email, phone, serviceType, message } = req.body;

    // Validate required fields
    if (!fullName || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "Please provide fullName, email, and message",
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    const contact = await Contact.create({
      fullName,
      email,
      phone: phone || null,
      serviceType: serviceType || null,
      message,
      status: "new",
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get("User-Agent") || null,
    });

    res.status(201).json({
      success: true,
      message: "Thank you for contacting us. We'll get back to you soon.",
      data: {
        id: contact.id,
      },
    });
  } catch (error) {
    console.error("Error creating contact:", error);
    res.status(500).json({
      success: false,
      message: "Error submitting contact form",
      error: error.message,
    });
  }
};

// Get all contacts (admin) with filters
const getAllContacts = async (req, res) => {
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
      where[Op.or] = [
        { fullName: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { message: { [Op.like]: `%${search}%` } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Contact.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder]],
    });

    res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching contacts",
      error: error.message,
    });
  }
};

// Get contact by ID (admin)
const getContactById = async (req, res) => {
  try {
    const { id } = req.params;
    const contact = await Contact.findByPk(id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact not found",
      });
    }

    res.status(200).json({
      success: true,
      data: contact,
    });
  } catch (error) {
    console.error("Error fetching contact:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching contact",
      error: error.message,
    });
  }
};

// Update contact (admin)
const updateContact = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const contact = await Contact.findByPk(id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact not found",
      });
    }

    const oldValues = contact.toJSON();

    // If status is being updated, set reviewedBy and reviewedAt
    if (updates.status && updates.status !== contact.status) {
      updates.reviewedBy = req.user?.id || null;
      updates.reviewedAt = new Date();
    }

    updates.updatedAt = new Date();

    await contact.update(updates);

    if (req.user) {
      await logUpdate(
        req.user.id,
        "contact",
        contact.id,
        oldValues,
        updates,
        req,
        `Updated contact ${contact.id}`
      );

      if (updates.status && updates.status !== oldValues.status) {
        await logStatusChange(
          req.user.id,
          "contact",
          contact.id,
          oldValues.status,
          updates.status,
          req,
          `Changed contact status from ${oldValues.status} to ${updates.status}`
        );
      }
    }

    await contact.reload();

    res.status(200).json({
      success: true,
      message: "Contact updated successfully",
      data: contact,
    });
  } catch (error) {
    console.error("Error updating contact:", error);
    res.status(500).json({
      success: false,
      message: "Error updating contact",
      error: error.message,
    });
  }
};

// Update contact status (admin)
const updateContactStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !["new", "read", "replied", "archived"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid status (new, read, replied, archived)",
      });
    }

    const contact = await Contact.findByPk(id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact not found",
      });
    }

    const oldStatus = contact.status;
    contact.status = status;
    contact.reviewedBy = req.user?.id || null;
    contact.reviewedAt = new Date();
    await contact.save();

    if (req.user) {
      await logStatusChange(
        req.user.id,
        "contact",
        contact.id,
        oldStatus,
        status,
        req,
        `Changed contact status from ${oldStatus} to ${status}`
      );
    }

    res.status(200).json({
      success: true,
      message: "Contact status updated successfully",
      data: contact,
    });
  } catch (error) {
    console.error("Error updating contact status:", error);
    res.status(500).json({
      success: false,
      message: "Error updating contact status",
      error: error.message,
    });
  }
};

// Delete contact (admin)
const deleteContact = async (req, res) => {
  try {
    const { id } = req.params;

    const contact = await Contact.findByPk(id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact not found",
      });
    }

    const contactData = {
      fullName: contact.fullName,
      email: contact.email,
      status: contact.status,
    };

    await contact.destroy();

    if (req.user) {
      await logDelete(
        req.user.id,
        "contact",
        contact.id,
        contactData,
        req,
        `Deleted contact ${contact.id}`
      );
    }

    res.status(200).json({
      success: true,
      message: "Contact deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting contact:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting contact",
      error: error.message,
    });
  }
};

module.exports = {
  createContact,
  getAllContacts,
  getContactById,
  updateContact,
  updateContactStatus,
  deleteContact,
};
