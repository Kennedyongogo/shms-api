const { Service } = require("../models");
const { convertToRelativePath } = require("../utils/filePath");
const { Op } = require("sequelize");
const path = require("path");
const { deleteFile } = require("../middleware/upload");
const {
  logCreate,
  logUpdate,
  logDelete,
  logStatusChange,
} = require("../utils/auditLogger");

// Create service
const createService = async (req, res) => {
  try {
    const {
      slug,
      title,
      description,
      shortDescription,
      image,
      imageAltText,
      icon,
      isKeyService,
      badgeLabel,
      badgeColor,
      displayOrder,
      priority,
      status,
      featured,
      metaTitle,
      metaDescription,
      fullContent,
      benefits,
      useCases,
      relatedServiceIds,
    } = req.body;

    // Validate required fields
    if (!slug || !title || !description) {
      return res.status(400).json({
        success: false,
        message: "Please provide slug, title, and description",
      });
    }

    // Handle image upload (multer single puts file in req.file)
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

    const benefitsArray = parseJsonArray(benefits);
    const useCasesArray = parseJsonArray(useCases);
    const relatedIdsArray = parseJsonArray(relatedServiceIds);

    const service = await Service.create({
      slug,
      title,
      description,
      shortDescription: shortDescription || description.substring(0, 200),
      image: imagePath,
      imageAltText,
      icon,
      isKeyService: isKeyService !== undefined ? (isKeyService === true || isKeyService === "true") : false,
      badgeLabel,
      badgeColor,
      displayOrder: displayOrder ? parseInt(displayOrder) : 0,
      priority: priority ? parseInt(priority) : 0,
      status: status ?? "draft",
      featured: featured !== undefined ? (featured === true || featured === "true") : false,
      metaTitle,
      metaDescription,
      fullContent,
      benefits: benefitsArray,
      useCases: useCasesArray,
      relatedServiceIds: relatedIdsArray,
      views: 0,
      created_by: req.user?.id || null,
      updated_by: req.user?.id || null,
    });

    if (req.user) {
      await logCreate(
        req.user.id,
        "service",
        service.id,
        { slug, title, isKeyService: service.isKeyService, status: service.status },
        req
      );
    }

    res.status(201).json({
      success: true,
      message: "Service created successfully",
      data: service,
    });
  } catch (error) {
    console.error("Error creating service:", error);
    res.status(500).json({
      success: false,
      message: "Error creating service",
      error: error.message,
    });
  }
};

// Get all services (admin) with filters
const getAllServices = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      isKeyService,
      status,
      featured,
      sortBy = "displayOrder",
      sortOrder = "ASC",
    } = req.query;

    const where = {};

    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { shortDescription: { [Op.like]: `%${search}%` } },
      ];
    }

    if (isKeyService !== undefined) {
      where.isKeyService = isKeyService === "true";
    }

    if (status) {
      where.status = status;
    }

    if (featured !== undefined) {
      where.featured = featured === "true";
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Service.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder], ["priority", "DESC"], ["createdAt", "DESC"]],
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
    console.error("Error fetching services:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching services",
      error: error.message,
    });
  }
};

// Get service by ID (admin)
const getServiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await Service.findByPk(id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    res.status(200).json({
      success: true,
      data: service,
    });
  } catch (error) {
    console.error("Error fetching service:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching service",
      error: error.message,
    });
  }
};

// Get public services (published)
const getPublicServices = async (req, res) => {
  try {
    const { isKeyService, featured, limit } = req.query;
    const where = { status: "published" };

    if (isKeyService !== undefined) {
      where.isKeyService = isKeyService === "true";
    }

    if (featured !== undefined) {
      where.featured = featured === "true";
    }

    const services = await Service.findAll({
      where,
      limit: limit ? parseInt(limit) : undefined,
      order: [
        ["isKeyService", "DESC"],
        ["displayOrder", "ASC"],
        ["priority", "DESC"],
        ["createdAt", "DESC"],
      ],
      attributes: {
        exclude: ["isDeleted", "deletedAt", "updated_by", "created_by"],
      },
    });

    res.status(200).json({
      success: true,
      count: services.length,
      data: services,
    });
  } catch (error) {
    console.error("Error fetching public services:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching services",
      error: error.message,
    });
  }
};

// Get public service by slug (published)
const getPublicServiceBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const service = await Service.findOne({
      where: { slug, status: "published" },
      attributes: {
        exclude: ["isDeleted", "deletedAt", "updated_by", "created_by"],
      },
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    // Increment view count
    await service.increment("views");

    res.status(200).json({
      success: true,
      data: service,
    });
  } catch (error) {
    console.error("Error fetching service by slug:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching service",
      error: error.message,
    });
  }
};

// Get key services (for home page)
const getKeyServices = async (req, res) => {
  try {
    const services = await Service.findAll({
      where: {
        isKeyService: true,
        status: "published",
      },
      order: [
        ["displayOrder", "ASC"],
        ["priority", "DESC"],
        ["createdAt", "DESC"],
      ],
      attributes: {
        exclude: ["isDeleted", "deletedAt", "updated_by", "created_by"],
      },
    });

    res.status(200).json({
      success: true,
      count: services.length,
      data: services,
    });
  } catch (error) {
    console.error("Error fetching key services:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching key services",
      error: error.message,
    });
  }
};

// Update service
const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const service = await Service.findByPk(id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    // Handle image upload (multer single puts file in req.file)
    if (req.file && req.file.path) {
      updates.image = convertToRelativePath(req.file.path);
      
      // Delete old image if it exists
      if (service.image) {
        const oldImagePath = path.join(__dirname, "..", "..", service.image);
        await deleteFile(oldImagePath);
      }
    } else if (updates.image === "" || updates.image === null) {
      // If image is explicitly set to empty, delete old image
      if (service.image) {
        const oldImagePath = path.join(__dirname, "..", "..", service.image);
        await deleteFile(oldImagePath);
        updates.image = null;
      }
    }

    // Parse JSON arrays
    const parseJsonArray = (value) => {
      if (!value) return undefined;
      if (Array.isArray(value)) return value;
      if (typeof value === "string") {
        try {
          return JSON.parse(value);
        } catch (e) {
          return value.split(",").map((item) => item.trim()).filter(Boolean);
        }
      }
      return undefined;
    };

    if (updates.benefits !== undefined) {
      updates.benefits = parseJsonArray(updates.benefits);
    }

    if (updates.useCases !== undefined) {
      updates.useCases = parseJsonArray(updates.useCases);
    }

    if (updates.relatedServiceIds !== undefined) {
      updates.relatedServiceIds = parseJsonArray(updates.relatedServiceIds);
    }

    // Convert boolean strings to booleans
    if (updates.isKeyService !== undefined) {
      updates.isKeyService = updates.isKeyService === true || updates.isKeyService === "true";
    }

    if (updates.featured !== undefined) {
      updates.featured = updates.featured === true || updates.featured === "true";
    }

    // Convert numeric strings to numbers
    if (updates.displayOrder !== undefined) {
      updates.displayOrder = parseInt(updates.displayOrder);
    }

    if (updates.priority !== undefined) {
      updates.priority = parseInt(updates.priority);
    }

    // Update slug if title changed
    if (updates.title && updates.title !== service.title) {
      updates.slug = updates.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    }

    updates.updated_by = req.user?.id || null;

    await service.update(updates);

    if (req.user) {
      await logUpdate(
        req.user.id,
        "service",
        service.id,
        { slug: service.slug, title: service.title },
        updates,
        req
      );
    }

    res.status(200).json({
      success: true,
      message: "Service updated successfully",
      data: service,
    });
  } catch (error) {
    console.error("Error updating service:", error);
    res.status(500).json({
      success: false,
      message: "Error updating service",
      error: error.message,
    });
  }
};

// Update service status
const updateServiceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !["draft", "published", "archived"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid status (draft, published, archived)",
      });
    }

    const service = await Service.findByPk(id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    const oldStatus = service.status;
    service.status = status;
    service.updated_by = req.user?.id || null;
    await service.save();

    if (req.user) {
      await logStatusChange(
        req.user.id,
        "service",
        service.id,
        oldStatus,
        status,
        { slug: service.slug, title: service.title },
        req
      );
    }

    res.status(200).json({
      success: true,
      message: "Service status updated successfully",
      data: service,
    });
  } catch (error) {
    console.error("Error updating service status:", error);
    res.status(500).json({
      success: false,
      message: "Error updating service status",
      error: error.message,
    });
  }
};

// Delete service
const deleteService = async (req, res) => {
  try {
    const { id } = req.params;

    const service = await Service.findByPk(id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    // Delete associated image file
    if (service.image) {
      const imagePath = path.join(__dirname, "..", "..", service.image);
      await deleteFile(imagePath);
    }

    // Soft delete
    await service.destroy();

    if (req.user) {
      await logDelete(
        req.user.id,
        "service",
        service.id,
        { slug: service.slug, title: service.title },
        req
      );
    }

    res.status(200).json({
      success: true,
      message: "Service deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting service:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting service",
      error: error.message,
    });
  }
};

module.exports = {
  createService,
  getAllServices,
  getServiceById,
  getPublicServices,
  getPublicServiceBySlug,
  getKeyServices,
  updateService,
  updateServiceStatus,
  deleteService,
};
