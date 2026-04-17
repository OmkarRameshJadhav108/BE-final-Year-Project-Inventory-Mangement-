const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  wholesaler: { type: mongoose.Schema.Types.ObjectId, ref: "Wholesaler" },
  products: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      quantity: Number,
    },
  ],
  totalAmount: Number,
}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);
