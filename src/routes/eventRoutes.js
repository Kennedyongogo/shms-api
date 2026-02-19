const express = require("express");
const eventController = require("../controllers/eventController");
const { uploadEventBanner, uploadEventImage, handleUploadError } = require("../middleware/upload");
const { authenticateUser } = require("../middleware/auth");

const router = express.Router();

router.post("/", authenticateUser, uploadEventBanner, handleUploadError, eventController.create);
router.get("/", eventController.getAll);
router.get("/:id", eventController.getById);
router.put("/:id", authenticateUser, uploadEventBanner, handleUploadError, eventController.update);
router.delete("/:id", authenticateUser, eventController.remove);

router.patch("/:id/publish", authenticateUser, eventController.publish);
router.post("/:id/images", authenticateUser, uploadEventImage, handleUploadError, eventController.addEventImage);

module.exports = router;

