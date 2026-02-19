const express = require("express");
const settingsController = require("../controllers/settingsController");

const router = express.Router();

router.post("/", settingsController.create);
router.get("/", settingsController.getAll);
router.get("/:id", settingsController.getById);
router.put("/:id", settingsController.update);
router.delete("/:id", settingsController.remove);

module.exports = router;

