const express = require("express");
const medicalHistoryController = require("../controllers/medicalHistoryController");

const router = express.Router();

router.post("/", medicalHistoryController.create);
router.get("/", medicalHistoryController.getAll);
router.get("/:id", medicalHistoryController.getById);
router.put("/:id", medicalHistoryController.update);
router.delete("/:id", medicalHistoryController.remove);

module.exports = router;

