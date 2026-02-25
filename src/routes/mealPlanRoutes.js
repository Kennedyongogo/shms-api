const express = require("express");
const mealPlanController = require("../controllers/mealPlanController");

const router = express.Router();

router.get("/", mealPlanController.getAll);
router.get("/:id", mealPlanController.getById);
router.post("/", mealPlanController.create);
router.put("/:id", mealPlanController.update);
router.delete("/:id", mealPlanController.remove);

module.exports = router;
