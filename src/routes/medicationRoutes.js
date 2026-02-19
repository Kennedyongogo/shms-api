const express = require("express");
const medicationController = require("../controllers/medicationController");

const router = express.Router();

router.post("/", medicationController.create);
router.get("/", medicationController.getAll);
router.get("/:id", medicationController.getById);
router.put("/:id", medicationController.update);
router.delete("/:id", medicationController.remove);

module.exports = router;

