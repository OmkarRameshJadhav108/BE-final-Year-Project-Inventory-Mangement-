const express = require("express");
const router = express.Router();

const {
  addWholesaler,
  getWholesalers,
} = require("../controllers/wholesalerController");

// CREATE WHOLESALER
router.post("/", addWholesaler);

// GET ALL WHOLESALERS
router.get("/", getWholesalers);

module.exports = router;