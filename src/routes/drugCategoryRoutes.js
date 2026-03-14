const express = require("express");
const drugCategoryController = require("../controllers/drugCategoryController");

const router = express.Router();

router.post("/", drugCategoryController.create);
router.get("/", drugCategoryController.getAll);
router.get("/:id", drugCategoryController.getById);
router.put("/:id", drugCategoryController.update);
router.delete("/:id", drugCategoryController.remove);

module.exports = router;
