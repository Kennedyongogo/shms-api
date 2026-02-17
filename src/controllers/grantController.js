const { Grant, sequelize } = require("../models");
const { convertToRelativePath } = require("../utils/filePath");
const { Op } = require("sequelize");
const path = require("path");
const { deleteFile } = require("../middleware/upload");
const {
  logCreate,
  logUpdate,
  logDelete,
} = require("../utils/auditLogger");

// Create grant
const createGrant = async (req, res) => {
  try {
    const {
      title,
      badge,
      description,
      amount,
      amountMin,
      amountMax,
      currency,
      deadline,
      deadlineText,
      isRolling,
      image,
      imageAltText,
      applicationUrl,
      eligibilityCriteria,
      requirements,
      fundingType,
      sector,
      targetAudience,
      organization,
      contactEmail,
      contactPhone,
      tags,
      featured,
    } = req.body;

    // Validate required fields
    if (!title || !badge || !description) {
      return res.status(400).json({
        success: false,
        message: "Please provide title, badge, and description",
      });
    }

    // Handle image upload
    let imagePath = null;
    if (req.file && req.file.path) {
      imagePath = convertToRelativePath(req.file.path);
    } else if (image) {
      imagePath = image;
    }

    // Parse JSON arrays
    const parseJsonArray = (value) => {
      if (!value) return [];
      if (Array.isArray(value)) return value;
      if (typeof value === "string") {
        try {
          return JSON.parse(value);
        } catch (e) {
          return value.split(",").map((item) => item.trim()).filter(Boolean);
        }
      }
      return [];
    };

    const tagsArray = parseJsonArray(tags);

    const grant = await Grant.create({
      title,
      badge,
      description,
      amount,
      amountMin: amountMin ? parseFloat(amountMin) : null,
      amountMax: amountMax ? parseFloat(amountMax) : null,
      currency: currency || "USD",
      deadline,
      deadlineText,
      isRolling: isRolling !== undefined ? (isRolling === true || isRolling === "true") : false,
      image: imagePath,
      imageAltText,
      applicationUrl,
      eligibilityCriteria,
      requirements,
      fundingType,
      sector,
      targetAudience,
      organization,
      contactEmail,
      contactPhone,
      tags: tagsArray,
      featured: featured !== undefined ? (featured === true || featured === "true") : false,
      isActive: true,
      created_by: req.user?.id || null,
      updated_by: req.user?.id || null,
    });

    if (req.user) {
      await logCreate(
        req.user.id,
        "grant",
        grant.id,
        { title, badge, fundingType },
        req
      );
    }

    res.status(201).json({
      success: true,
      message: "Grant created successfully",
      data: grant,
    });
  } catch (error) {
    console.error("Error creating grant:", error);
    res.status(500).json({
      success: false,
      message: "Error creating grant",
      error: error.message,
    });
  }
};

// Get all grants (admin) with filters
const getAllGrants = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      fundingType,
      sector,
      featured,
      isActive,
      isRolling,
      sortBy = "deadline",
      sortOrder = "ASC",
    } = req.query;

    const where = {};

    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { organization: { [Op.like]: `%${search}%` } },
      ];
    }

    if (fundingType) {
      where.fundingType = fundingType;
    }

    if (sector) {
      where.sector = { [Op.like]: `%${sector}%` };
    }

    if (featured !== undefined) {
      where.featured = featured === "true";
    }

    if (isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    if (isRolling !== undefined) {
      where.isRolling = isRolling === "true";
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Grant.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder], ["createdAt", "DESC"]],
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
    console.error("Error fetching grants:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching grants",
      error: error.message,
    });
  }
};

// Get grant by ID (admin)
const getGrantById = async (req, res) => {
  try {
    const { id } = req.params;
    const grant = await Grant.findByPk(id);

    if (!grant) {
      return res.status(404).json({
        success: false,
        message: "Grant not found",
      });
    }

    res.status(200).json({
      success: true,
      data: grant,
    });
  } catch (error) {
    console.error("Error fetching grant:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching grant",
      error: error.message,
    });
  }
};

// Get public grants (active only)
const getPublicGrants = async (req, res) => {
  try {
    const { fundingType, sector, featured, limit } = req.query;
    const where = { isActive: true };

    if (fundingType) {
      where.fundingType = fundingType;
    }

    if (sector) {
      where.sector = { [Op.like]: `%${sector}%` };
    }

    if (featured !== undefined) {
      where.featured = featured === "true";
    }

    const grants = await Grant.findAll({
      where,
      limit: limit ? parseInt(limit) : undefined,
      order: [
        ["featured", "DESC"],
        ["deadline", "ASC"],
        ["createdAt", "DESC"],
      ],
      attributes: {
        exclude: ["isDeleted", "deletedAt", "updated_by", "created_by"],
      },
    });

    res.status(200).json({
      success: true,
      count: grants.length,
      data: grants,
    });
  } catch (error) {
    console.error("Error fetching public grants:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching grants",
      error: error.message,
    });
  }
};

// Update grant
const updateGrant = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const grant = await Grant.findByPk(id);

    if (!grant) {
      return res.status(404).json({
        success: false,
        message: "Grant not found",
      });
    }

    const oldValues = grant.toJSON();
    const oldImage = grant.image;

    // Handle image upload
    if (req.file && req.file.path) {
      updates.image = convertToRelativePath(req.file.path);
      // Delete old image if it exists
      if (oldImage) {
        const oldImagePath = path.join(__dirname, "..", "..", oldImage);
        await deleteFile(oldImagePath);
      }
    } else if (updates.delete_image === "true" || updates.delete_image === true) {
      if (oldImage) {
        const oldImagePath = path.join(__dirname, "..", "..", oldImage);
        await deleteFile(oldImagePath);
        updates.image = null;
      }
    }

    // Parse JSON arrays
    const parseJsonArray = (value) => {
      if (value === undefined) return undefined;
      if (!value) return [];
      if (Array.isArray(value)) return value;
      if (typeof value === "string") {
        try {
          return JSON.parse(value);
        } catch (e) {
          return value.split(",").map((item) => item.trim()).filter(Boolean);
        }
      }
      return [];
    };

    if (updates.tags !== undefined) {
      updates.tags = parseJsonArray(updates.tags);
    }

    // Convert boolean strings to booleans
    if (updates.featured !== undefined) {
      updates.featured = updates.featured === true || updates.featured === "true";
    }

    if (updates.isActive !== undefined) {
      updates.isActive = updates.isActive === true || updates.isActive === "true";
    }

    if (updates.isRolling !== undefined) {
      updates.isRolling = updates.isRolling === true || updates.isRolling === "true";
    }

    // Convert numeric strings to numbers
    if (updates.amountMin !== undefined) {
      updates.amountMin = updates.amountMin === null || updates.amountMin === "" ? null : parseFloat(updates.amountMin);
    }

    if (updates.amountMax !== undefined) {
      updates.amountMax = updates.amountMax === null || updates.amountMax === "" ? null : parseFloat(updates.amountMax);
    }

    updates.updated_by = req.user?.id || null;

    await grant.update(updates);

    if (req.user) {
      await logUpdate(
        req.user.id,
        "grant",
        grant.id,
        oldValues,
        updates,
        req,
        `Updated grant ${grant.title}`
      );
    }

    // Reload to get updated data
    await grant.reload();

    res.status(200).json({
      success: true,
      message: "Grant updated successfully",
      data: grant,
    });
  } catch (error) {
    console.error("Error updating grant:", error);
    res.status(500).json({
      success: false,
      message: "Error updating grant",
      error: error.message,
    });
  }
};

// Delete grant (hard delete – row removed from database)
const deleteGrant = async (req, res) => {
  try {
    const { id } = req.params;
    const grant = await Grant.findByPk(id);

    if (!grant) {
      return res.status(404).json({
        success: false,
        message: "Grant not found",
      });
    }

    const oldValues = grant.toJSON();

    await grant.destroy();

    if (req.user) {
      await logDelete(
        req.user.id,
        "grant",
        grant.id,
        oldValues,
        req,
        `Deleted grant ${grant.title}`
      );
    }

    res.status(200).json({
      success: true,
      message: "Grant deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting grant:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting grant",
      error: error.message,
    });
  }
};

module.exports = {
  createGrant,
  getAllGrants,
  getGrantById,
  getPublicGrants,
  updateGrant,
  deleteGrant,
};
