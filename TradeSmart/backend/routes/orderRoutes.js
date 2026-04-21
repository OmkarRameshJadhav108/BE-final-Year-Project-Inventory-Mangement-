const express = require("express");
const router = express.Router();
const { createOrder, getOrders, updateOrderPayment } = require("../controllers/orderController");

// CREATE ORDER
router.post("/", createOrder);

// GET ALL ORDERS
router.get("/", getOrders);

// UPDATE PAYMENT
router.patch("/:id/payment", updateOrderPayment);

module.exports = router;

