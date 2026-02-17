const { Project, sequelize } = require("../models");
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

// Create project
const createProject = async (req, res) => {
  try {
    const {
      slug,
      title,
      description,
      shortDescription,
      location,
      image,
      imageAltText,
      tags,
      category,
      featured,
      priority,
      displayOrder,
      status,
      projectStatus,
      fullContent,
      clientName,
      startDate,
      endDate,
      impactMetrics,
      farmersTrained,
      roiIncreasePercent,
      latitude,
      longitude,
      metaTitle,
      metaDescription,
    } = req.body;

    // Validate required fields
    if (!slug || !title || !description || !location) {
      return res.status(400).json({
        success: false,
        message: "Please provide slug, title, description, and location",
      });
    }

    // Handle image upload (upload.single("project_image") puts file in req.file, not req.files)
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
    const impactMetricsArray = parseJsonArray(impactMetrics);

    // Validate and parse coordinates
    let parsedLatitude = null;
    let parsedLongitude = null;
    if (latitude !== undefined && latitude !== null && latitude !== "") {
      parsedLatitude = parseFloat(latitude);
      if (isNaN(parsedLatitude) || parsedLatitude < -90 || parsedLatitude > 90) {
        return res.status(400).json({
          success: false,
          message: "Latitude must be a valid number between -90 and 90",
        });
      }
    }
    if (longitude !== undefined && longitude !== null && longitude !== "") {
      parsedLongitude = parseFloat(longitude);
      if (isNaN(parsedLongitude) || parsedLongitude < -180 || parsedLongitude > 180) {
        return res.status(400).json({
          success: false,
          message: "Longitude must be a valid number between -180 and 180",
        });
      }
    }

    const project = await Project.create({
      slug,
      title,
      description,
      shortDescription: shortDescription || description.substring(0, 200),
      location,
      image: imagePath,
      imageAltText,
      tags: tagsArray,
      category,
      featured: featured !== undefined ? (featured === true || featured === "true") : false,
      priority: priority ? parseInt(priority) : 0,
      displayOrder: displayOrder ? parseInt(displayOrder) : 0,
      status: status ?? "draft",
      projectStatus: projectStatus ?? "pending",
      fullContent,
      clientName,
      startDate,
      endDate,
      impactMetrics: impactMetricsArray,
      farmersTrained: farmersTrained != null && farmersTrained !== "" ? parseInt(farmersTrained, 10) : null,
      roiIncreasePercent: roiIncreasePercent != null && roiIncreasePercent !== "" ? parseFloat(roiIncreasePercent) : null,
      latitude: parsedLatitude,
      longitude: parsedLongitude,
      metaTitle,
      metaDescription,
      views: 0,
      created_by: req.user?.id || null,
      updated_by: req.user?.id || null,
    });

    if (req.user) {
      await logCreate(
        req.user.id,
        "project",
        project.id,
        { slug, title, category, status: project.status },
        req
      );
    }

    res.status(201).json({
      success: true,
      message: "Project created successfully",
      data: project,
    });
  } catch (error) {
    console.error("Error creating project:", error);
    res.status(500).json({
      success: false,
      message: "Error creating project",
      error: error.message,
    });
  }
};

// Get all projects (admin) with filters
const getAllProjects = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      status,
      projectStatus,
      featured,
      sortBy = "displayOrder",
      sortOrder = "ASC",
    } = req.query;

    const where = {};

    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { location: { [Op.like]: `%${search}%` } },
        { shortDescription: { [Op.like]: `%${search}%` } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (status) {
      where.status = status;
    }

    if (projectStatus) {
      where.projectStatus = projectStatus;
    }

    if (featured !== undefined) {
      where.featured = featured === "true";
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Project.findAndCountAll({
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
    console.error("Error fetching projects:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching projects",
      error: error.message,
    });
  }
};

// Get project by ID (admin)
const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findByPk(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching project",
      error: error.message,
    });
  }
};

// Get public projects (published)
const getPublicProjects = async (req, res) => {
  try {
    const { category, categories, featured, projectStatus, limit } = req.query;
    const where = { status: "published" };

    if (category) {
      where.category = category;
    } else if (categories) {
      const list = categories
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
      if (list.length) {
        where.category = { [Op.in]: list };
      }
    }

    if (featured !== undefined) {
      where.featured = featured === "true";
    }

    if (projectStatus) {
      where.projectStatus = projectStatus;
    }

    const projects = await Project.findAll({
      where,
      limit: limit ? parseInt(limit) : undefined,
      order: [
        ["featured", "DESC"],
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
      count: projects.length,
      data: projects,
    });
  } catch (error) {
    console.error("Error fetching public projects:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching projects",
      error: error.message,
    });
  }
};

// Get public project by slug (published)
const getPublicProjectBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const project = await Project.findOne({
      where: { slug, status: "published" },
      attributes: {
        exclude: ["isDeleted", "deletedAt", "updated_by", "created_by"],
      },
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Increment view count
    await project.increment("views");

    res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error("Error fetching project by slug:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching project",
      error: error.message,
    });
  }
};

// Get public project statistics (for portal stats cards)
const getPublicStats = async (req, res) => {
  try {
    const baseWhere = { status: "published" };
    const now = new Date();
    const thisYear = now.getFullYear();
    const lastYear = thisYear - 1;
    const startThisYear = new Date(thisYear, 0, 1);
    const startLastYear = new Date(lastYear, 0, 1);
    const endLastYear = new Date(thisYear, 0, 1);

    // Total published projects
    const totalProjects = await Project.count({ where: baseWhere });

    // Projects created this year vs last year (for % change)
    const [countThisYear, countLastYear] = await Promise.all([
      Project.count({
        where: { ...baseWhere, createdAt: { [Op.gte]: startThisYear } },
      }),
      Project.count({
        where: {
          ...baseWhere,
          createdAt: { [Op.gte]: startLastYear, [Op.lt]: endLastYear },
        },
      }),
    ]);
    const totalProjectsChangePercent =
      countLastYear > 0
        ? Math.round(((countThisYear - countLastYear) / countLastYear) * 100)
        : (countThisYear > 0 ? 100 : 0);

    // Farmers trained: sum of farmersTrained across published projects
    const farmersTrainedSum = (await Project.sum("farmersTrained", { where: baseWhere })) || 0;

    // Farmers impact change: sum of farmersTrained for projects started this year vs last year
    const [farmersThisYear, farmersLastYear] = await Promise.all([
      Project.sum("farmersTrained", {
        where: {
          ...baseWhere,
          startDate: { [Op.gte]: startThisYear },
        },
      }),
      Project.sum("farmersTrained", {
        where: {
          ...baseWhere,
          startDate: { [Op.gte]: startLastYear, [Op.lt]: endLastYear },
        },
      }),
    ]);
    const farmersThisYearNum = Number(farmersThisYear) || 0;
    const farmersLastYearNum = Number(farmersLastYear) || 0;
    const farmersTrainedChangePercent =
      farmersLastYearNum > 0
        ? Math.round(((farmersThisYearNum - farmersLastYearNum) / farmersLastYearNum) * 100)
        : (farmersThisYearNum > 0 ? 100 : 0);

    // Average ROI increase: average of roiIncreasePercent (only projects that have it)
    const roiResult = await Project.findOne({
      where: {
        ...baseWhere,
        roiIncreasePercent: { [Op.ne]: null },
      },
      attributes: [[sequelize.fn("AVG", sequelize.col("roiIncreasePercent")), "avgRoi"]],
      raw: true,
    });
    const avgRoi = roiResult?.avgRoi != null ? Math.round(parseFloat(roiResult.avgRoi)) : null;

    res.status(200).json({
      success: true,
      data: {
        totalProjects,
        totalProjectsChangePercent,
        farmersTrained: farmersTrainedSum,
        farmersTrainedChangePercent,
        averageRoiIncreasePercent: avgRoi,
      },
    });
  } catch (error) {
    console.error("Error fetching project stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching project statistics",
      error: error.message,
    });
  }
};

// Update project
const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const project = await Project.findByPk(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const oldValues = project.toJSON();
    const oldImage = project.image;

    // Handle image upload (upload.single("project_image") puts file in req.file, not req.files)
    if (req.file && req.file.path) {
      updates.image = convertToRelativePath(req.file.path);
      // Delete old image if it exists
      if (oldImage) {
        const oldImagePath = path.join(__dirname, "..", "..", oldImage);
        await deleteFile(oldImagePath);
      }
    } else if (updates.delete_image === "true" || updates.delete_image === true) {
      // If explicitly deleting image
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

    if (updates.impactMetrics !== undefined) {
      updates.impactMetrics = parseJsonArray(updates.impactMetrics);
    }

    // Convert boolean strings to booleans
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

    if (updates.farmersTrained !== undefined) {
      updates.farmersTrained =
        updates.farmersTrained === null || updates.farmersTrained === ""
          ? null
          : parseInt(updates.farmersTrained, 10);
    }
    if (updates.roiIncreasePercent !== undefined) {
      updates.roiIncreasePercent =
        updates.roiIncreasePercent === null || updates.roiIncreasePercent === ""
          ? null
          : parseFloat(updates.roiIncreasePercent);
    }

    // Validate and parse coordinates
    if (updates.latitude !== undefined) {
      if (updates.latitude === null || updates.latitude === "") {
        updates.latitude = null;
      } else {
        const parsedLat = parseFloat(updates.latitude);
        if (isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90) {
          return res.status(400).json({
            success: false,
            message: "Latitude must be a valid number between -90 and 90",
          });
        }
        updates.latitude = parsedLat;
      }
    }

    if (updates.longitude !== undefined) {
      if (updates.longitude === null || updates.longitude === "") {
        updates.longitude = null;
      } else {
        const parsedLng = parseFloat(updates.longitude);
        if (isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180) {
          return res.status(400).json({
            success: false,
            message: "Longitude must be a valid number between -180 and 180",
          });
        }
        updates.longitude = parsedLng;
      }
    }

    // Update slug if title changed
    if (updates.title && updates.title !== project.title) {
      updates.slug = updates.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    }

    updates.updated_by = req.user?.id || null;

    await project.update(updates);

    if (req.user) {
      await logUpdate(
        req.user.id,
        "project",
        project.id,
        oldValues,
        updates,
        req,
        `Updated project ${project.slug}`
      );

      if (updates.status && updates.status !== oldValues.status) {
        await logStatusChange(
          req.user.id,
          "project",
          project.id,
          oldValues.status,
          updates.status,
          req,
          `Changed project content status from ${oldValues.status} to ${updates.status}`
        );
      }

      if (updates.projectStatus && updates.projectStatus !== oldValues.projectStatus) {
        await logStatusChange(
          req.user.id,
          "project",
          project.id,
          oldValues.projectStatus,
          updates.projectStatus,
          req,
          `Changed project execution status from ${oldValues.projectStatus} to ${updates.projectStatus}`
        );
      }
    }

    // Reload to get updated data
    await project.reload();

    res.status(200).json({
      success: true,
      message: "Project updated successfully",
      data: project,
    });
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({
      success: false,
      message: "Error updating project",
      error: error.message,
    });
  }
};

// Update project status
const updateProjectStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !["draft", "published", "archived"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid status (draft, published, archived)",
      });
    }

    const project = await Project.findByPk(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const oldStatus = project.status;
    project.status = status;
    project.updated_by = req.user?.id || null;
    await project.save();

    if (req.user) {
      await logStatusChange(
        req.user.id,
        "project",
        project.id,
        oldStatus,
        status,
        req,
        `Changed project content status from ${oldStatus} to ${status}`
      );
    }

    res.status(200).json({
      success: true,
      message: "Project content status updated successfully",
      data: project,
    });
  } catch (error) {
    console.error("Error updating project status:", error);
    res.status(500).json({
      success: false,
      message: "Error updating project status",
      error: error.message,
    });
  }
};

// Update project execution status (pending/ongoing/completed)
const updateProjectExecutionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { projectStatus } = req.body;

    if (!projectStatus || !["pending", "ongoing", "completed", "cancelled", "on_hold"].includes(projectStatus)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid projectStatus (pending, ongoing, completed, cancelled, on_hold)",
      });
    }

    const project = await Project.findByPk(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const oldProjectStatus = project.projectStatus;
    project.projectStatus = projectStatus;
    project.updated_by = req.user?.id || null;
    await project.save();

    if (req.user) {
      await logStatusChange(
        req.user.id,
        "project",
        project.id,
        oldProjectStatus,
        projectStatus,
        req,
        `Changed project execution status from ${oldProjectStatus} to ${projectStatus}`
      );
    }

    res.status(200).json({
      success: true,
      message: "Project execution status updated successfully",
      data: project,
    });
  } catch (error) {
    console.error("Error updating project execution status:", error);
    res.status(500).json({
      success: false,
      message: "Error updating project execution status",
      error: error.message,
    });
  }
};

// Delete project
const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findByPk(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Delete associated image file
    if (project.image) {
      const imagePath = path.join(__dirname, "..", "..", project.image);
      await deleteFile(imagePath);
    }

    const projectData = {
      slug: project.slug,
      title: project.title,
      status: project.status,
    };

    // Soft delete
    await project.destroy();

    if (req.user) {
      await logDelete(
        req.user.id,
        "project",
        project.id,
        projectData,
        req,
        `Deleted project ${project.slug}`
      );
    }

    res.status(200).json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting project",
      error: error.message,
    });
  }
};

module.exports = {
  createProject,
  getAllProjects,
  getProjectById,
  getPublicProjects,
  getPublicProjectBySlug,
  getPublicStats,
  updateProject,
  updateProjectStatus,
  updateProjectExecutionStatus,
  deleteProject,
};
