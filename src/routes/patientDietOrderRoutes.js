const express = require("express");
const patientDietOrderController = require("../controllers/patientDietOrderController");

const router = express.Router();

router.get("/", patientDietOrderController.getAll);
router.get("/:id", patientDietOrderController.getById);
router.post("/", patientDietOrderController.create);
router.put("/:id", patientDietOrderController.update);
router.delete("/:id", patientDietOrderController.remove);

module.exports = router;
