const express = require("express");
const notificationController = require("../controllers/notificationController");

const router = express.Router();

router.post("/send", notificationController.sendNotifications);
router.patch("/:id/read", notificationController.markAsRead);

router.get("/me", notificationController.getMyNotifications);

router.post("/", notificationController.create);
router.get("/", notificationController.getAll);
router.get("/:id", notificationController.getById);
router.put("/:id", notificationController.update);
router.delete("/:id", notificationController.removeNotification);

module.exports = router;

