const express = require("express");
const { stockInOut } = require("../controllers/inventoryTransactionController");

const router = express.Router();

router.post("/", stockInOut);

module.exports = router;

