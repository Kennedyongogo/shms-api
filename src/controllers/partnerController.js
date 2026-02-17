const { Partner } = require("../models");
const { convertToRelativePath } = require("../utils/filePath");
const { Op } = require("sequelize");
const path = require("path");
const { deleteFile } = require("../middleware/upload");
const {
  logCreate,
  logUpdate,
  logDelete,
} = require("../utils/auditLogger");

// Normalize partner body: admin form sends "website", API/model use "websiteUrl"; parse services JSON
function normalizePartnerBody(body) {
  const out = { ...body };
  if (out.website !== undefined) {
    out.websiteUrl = out.website;
    delete out.website;
  }
  if (out.services !== undefined) {
    if (typeof out.services === "string") {
      try {
        out.services = JSON.parse(out.services);
      } catch {
        out.services = null;
      }
    }
  }
  if (out.featured !== undefined) {
    out.featured = out.featured === true || out.featured === "true";
  }
  return out;
}

// Create partner
const createPartner = async (req, res) => {
  try {
    const body = normalizePartnerBody(req.body);
    const {
      name,
      initial,
      logo,
      logoAltText,
      websiteUrl,
      description,
      partnershipType,
      contactEmail,
      contactPhone,
      displayOrder,
      address,
      sector,
      services,
      featured,
    } = body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Please provide partner name",
      });
    }

    // Handle logo upload
    let logoPath = null;
    if (req.file && req.file.path) {
      logoPath = convertToRelativePath(req.file.path);
    } else if (logo) {
      logoPath = logo;
    }

    const partner = await Partner.create({
      name,
      initial,
      logo: logoPath,
      logoAltText,
      websiteUrl,
      description,
      partnershipType,
      contactEmail,
      contactPhone,
      displayOrder: displayOrder ? parseInt(displayOrder) : 0,
      address: address || null,
      sector: sector || null,
      services: Array.isArray(services) ? services : null,
      featured: featured === true || featured === "true",
      isActive: true,
      created_by: req.user?.id || null,
      updated_by: req.user?.id || null,
    });

    if (req.user) {
      await logCreate(
        req.user.id,
        "partner",
        partner.id,
        { name, partnershipType },
        req
      );
    }

    res.status(201).json({
      success: true,
      message: "Partner created successfully",
      data: partner,
    });
  } catch (error) {
    console.error("Error creating partner:", error);
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({
        success: false,
        message: "Partner with this name already exists",
      });
    }
    res.status(500).json({
      success: false,
      message: "Error creating partner",
      error: error.message,
    });
  }
};

// Get all partners (admin) with filters
const getAllPartners = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      partnershipType,
      isActive,
      sortBy = "displayOrder",
      sortOrder = "ASC",
    } = req.query;

    const where = {};

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
      ];
    }

    if (partnershipType) {
      where.partnershipType = partnershipType;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Partner.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder], ["name", "ASC"]],
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
    console.error("Error fetching partners:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching partners",
      error: error.message,
    });
  }
};

// Get partner by ID (admin)
const getPartnerById = async (req, res) => {
  try {
    const { id } = req.params;
    const partner = await Partner.findByPk(id);

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found",
      });
    }

    res.status(200).json({
      success: true,
      data: partner,
    });
  } catch (error) {
    console.error("Error fetching partner:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching partner",
      error: error.message,
    });
  }
};

// Get public partners (active only)
const getPublicPartners = async (req, res) => {
  try {
    const partners = await Partner.findAll({
      where: { isActive: true },
      order: [["displayOrder", "ASC"], ["name", "ASC"]],
      attributes: {
        exclude: ["isDeleted", "deletedAt", "updated_by", "created_by"],
      },
    });

    res.status(200).json({
      success: true,
      count: partners.length,
      data: partners,
    });
  } catch (error) {
    console.error("Error fetching public partners:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching partners",
      error: error.message,
    });
  }
};

// Update partner
const updatePartner = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = normalizePartnerBody(req.body);

    const partner = await Partner.findByPk(id);

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found",
      });
    }

    const oldValues = partner.toJSON();
    const oldLogo = partner.logo;

    // Handle logo upload
    if (req.file && req.file.path) {
      updates.logo = convertToRelativePath(req.file.path);
      // Delete old logo if it exists
      if (oldLogo) {
        const oldLogoPath = path.join(__dirname, "..", "..", oldLogo);
        await deleteFile(oldLogoPath);
      }
    } else if (updates.delete_logo === "true" || updates.delete_logo === true) {
      if (oldLogo) {
        const oldLogoPath = path.join(__dirname, "..", "..", oldLogo);
        await deleteFile(oldLogoPath);
        updates.logo = null;
      }
    }

    // Convert boolean strings to booleans
    if (updates.isActive !== undefined) {
      updates.isActive = updates.isActive === true || updates.isActive === "true";
    }

    // Convert numeric strings to numbers
    if (updates.displayOrder !== undefined) {
      updates.displayOrder = parseInt(updates.displayOrder);
    }

    updates.updated_by = req.user?.id || null;

    await partner.update(updates);

    if (req.user) {
      await logUpdate(
        req.user.id,
        "partner",
        partner.id,
        oldValues,
        updates,
        req,
        `Updated partner ${partner.name}`
      );
    }

    // Reload to get updated data
    await partner.reload();

    res.status(200).json({
      success: true,
      message: "Partner updated successfully",
      data: partner,
    });
  } catch (error) {
    console.error("Error updating partner:", error);
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({
        success: false,
        message: "Partner with this name already exists",
      });
    }
    res.status(500).json({
      success: false,
      message: "Error updating partner",
      error: error.message,
    });
  }
};

// Delete partner (hard delete – row removed from database)
const deletePartner = async (req, res) => {
  try {
    const { id } = req.params;
    const partner = await Partner.findByPk(id);

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found",
      });
    }

    const oldValues = partner.toJSON();

    await partner.destroy();

    if (req.user) {
      await logDelete(
        req.user.id,
        "partner",
        partner.id,
        oldValues,
        req,
        `Deleted partner ${partner.name}`
      );
    }

    res.status(200).json({
      success: true,
      message: "Partner deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting partner:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting partner",
      error: error.message,
    });
  }
};

module.exports = {
  createPartner,
  getAllPartners,
  getPartnerById,
  getPublicPartners,
  updatePartner,
  deletePartner,
};
