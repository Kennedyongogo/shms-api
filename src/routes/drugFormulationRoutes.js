const express = require("express");
const drugFormulationController = require("../controllers/drugFormulationController");

const router = express.Router();

router.post("/", drugFormulationController.create);
router.get("/", drugFormulationController.getAll);
router.get("/:id", drugFormulationController.getById);
router.put("/:id", drugFormulationController.update);
router.delete("/:id", drugFormulationController.remove);

module.exports = router;
