const express = require("express");
const mealDeliveryLogController = require("../controllers/mealDeliveryLogController");

const router = express.Router();

router.get("/", mealDeliveryLogController.getAll);
router.get("/:id", mealDeliveryLogController.getById);
router.post("/", mealDeliveryLogController.create);
router.put("/:id", mealDeliveryLogController.update);
router.delete("/:id", mealDeliveryLogController.remove);

module.exports = router;
