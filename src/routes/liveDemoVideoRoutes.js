const express = require("express");
const liveDemoVideoController = require("../controllers/liveDemoVideoController");
const { uploadDemoVideo, handleUploadError } = require("../middleware/upload");
const { authenticateUser } = require("../middleware/auth");

const router = express.Router();

router.post("/", authenticateUser, uploadDemoVideo, handleUploadError, liveDemoVideoController.create);
router.get("/", authenticateUser, liveDemoVideoController.getAll);
router.get("/package/:package", liveDemoVideoController.getByPackage);
router.get("/:id", authenticateUser, liveDemoVideoController.getById);
router.put("/:id", authenticateUser, uploadDemoVideo, handleUploadError, liveDemoVideoController.update);
router.delete("/:id", authenticateUser, liveDemoVideoController.remove);

module.exports = router;
