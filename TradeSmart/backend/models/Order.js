const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  wholesaler: { type: mongoose.Schema.Types.ObjectId, ref: "Wholesaler" },
  retailerName: String,
  retailerPhone: String,
  shopkeeperName: String,
  branchName: String,
  branchAddress: String,
  shopkeeperGstin: String,
  driverName: String,
  driverPhone: String,
  billNumber: String,
  paymentMethod: String,
  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "partial"],
    default: "pending"
  },
  shipmentStatus: {
    type: String,
    enum: ["placed", "processing", "shipped", "delivered"],
    default: "placed"
  },
  expectedShipmentDate: Date,
  actualShipmentDate: Date,
  trackingNote: String,
  products: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      quantity: Number,
    },
  ],
  totalAmount: Number,
}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);
