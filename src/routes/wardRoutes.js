const express = require("express");
const wardController = require("../controllers/wardController");

const router = express.Router();

router.post("/", wardController.create);
router.get("/", wardController.getAll);
router.get("/:id", wardController.getById);
router.put("/:id", wardController.update);
router.delete("/:id", wardController.remove);

module.exports = router;

