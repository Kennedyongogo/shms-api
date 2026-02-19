const express = require("express");
const nursingController = require("../controllers/nursingController");

const router = express.Router();

router.post("/record", nursingController.recordNursingNote);
router.post("/", nursingController.create);
router.get("/", nursingController.getAll);
router.get("/:id", nursingController.getById);
router.put("/:id", nursingController.update);
router.delete("/:id", nursingController.remove);

module.exports = router;

