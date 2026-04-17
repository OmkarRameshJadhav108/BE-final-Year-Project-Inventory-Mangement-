const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  category: String,
  stock: { type: Number, default: 0 },
  lowStockThreshold: { type: Number, default: 5 },
  soldToday: { type: Number, default: 0 },
  totalSold: { type: Number, default: 0 },
  salesUpdatedAt: Date,
  image: String,
}, { timestamps: true });

module.exports = mongoose.model("Product", productSchema);
