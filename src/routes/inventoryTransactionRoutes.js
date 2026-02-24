const express = require("express");
const { getAll, stockInOut } = require("../controllers/inventoryTransactionController");

const router = express.Router();

router.get("/", getAll);
router.post("/", stockInOut);

module.exports = router;

