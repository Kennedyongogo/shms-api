const express = require("express");
const kenyalabtestController = require("../controllers/kenyalabtestController");

const router = express.Router();

router.post("/", kenyalabtestController.create);
router.get("/", kenyalabtestController.getAll);
router.get("/:id", kenyalabtestController.getById);
router.put("/:id", kenyalabtestController.update);
router.delete("/:id", kenyalabtestController.remove);

module.exports = router;
