const express = require("express");
const router = express.Router();
const {
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
} = require("../controllers/projectController");
const {
  authenticateAdmin,
  requireAdminOrHigher,
} = require("../middleware/auth");
const { uploadProjectImage, handleUploadError } = require("../middleware/upload");
const { errorHandler } = require("../middleware/errorHandler");

// Public routes
/**
 * @route   GET /api/projects/public
 * @desc    Get all published projects (public)
 * @access  Public
 */
router.get("/public", getPublicProjects);

/**
 * @route   GET /api/projects/public/stats
 * @desc    Get project statistics for public portal (total projects, farmers trained, avg ROI)
 * @access  Public
 */
router.get("/public/stats", getPublicStats);

/**
 * @route   GET /api/projects/public/:slug
 * @desc    Get single project by slug (public)
 * @access  Public
 */
router.get("/public/:slug", getPublicProjectBySlug);

// Admin routes
router.use(authenticateAdmin);
router.use(requireAdminOrHigher);

/**
 * @route   POST /api/projects
 * @desc    Create a new project
 * @access  Admin
 */
router.post("/", uploadProjectImage, handleUploadError, createProject);

/**
 * @route   GET /api/projects
 * @desc    Get all projects with filters (admin)
 * @access  Admin
 */
router.get("/", getAllProjects);

/**
 * @route   GET /api/projects/:id
 * @desc    Get project by ID (admin)
 * @access  Admin
 */
router.get("/:id", getProjectById);

/**
 * @route   PUT /api/projects/:id
 * @desc    Update project (admin)
 * @access  Admin
 */
router.put("/:id", uploadProjectImage, handleUploadError, updateProject);

/**
 * @route   PUT /api/projects/:id/status
 * @desc    Update project content status (draft/published/archived) (admin)
 * @access  Admin
 */
router.put("/:id/status", updateProjectStatus);

/**
 * @route   PUT /api/projects/:id/project-status
 * @desc    Update project execution status (pending/ongoing/completed) (admin)
 * @access  Admin
 */
router.put("/:id/project-status", updateProjectExecutionStatus);

/**
 * @route   DELETE /api/projects/:id
 * @desc    Delete project (admin)
 * @access  Admin
 */
router.delete("/:id", deleteProject);

router.use(errorHandler);

module.exports = router;
