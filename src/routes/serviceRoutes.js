const express = require("express");
const serviceController = require("../controllers/serviceController");
const { uploadServiceImage, handleUploadError } = require("../middleware/upload");
const { authenticateUser, requireRoles } = require("../middleware/auth");

const router = express.Router();

router.post("/", authenticateUser, requireRoles(["admin"]), uploadServiceImage, handleUploadError, serviceController.create);
router.get("/", serviceController.getAll);
router.get("/:id", serviceController.getById);
router.put("/:id", authenticateUser, requireRoles(["admin"]), uploadServiceImage, handleUploadError, serviceController.update);
router.delete("/:id", authenticateUser, requireRoles(["admin"]), serviceController.remove);

module.exports = router;

