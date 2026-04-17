const Wholesaler = require("../models/Wholesaler");

exports.addWholesaler = async (req, res) => {
  try {
    const wholesaler = await Wholesaler.create(req.body);
    res.status(201).json(wholesaler);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getWholesalers = async (req, res) => {
  try {
    const data = await Wholesaler.find();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
