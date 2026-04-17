const Order = require("../models/Order");

exports.createOrder = async (req, res) => {
  try {
    const order = await Order.create(req.body);
    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("wholesaler")
      .populate("products.product");

    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
