const express = require("express");
const scheduleController = require("../controllers/scheduleController");

const router = express.Router();

router.post("/", scheduleController.create);
router.get("/", scheduleController.getAll);
router.get("/:id", scheduleController.getById);
router.put("/:id", scheduleController.update);
router.delete("/:id", scheduleController.remove);

module.exports = router;

