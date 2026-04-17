const mongoose = require("mongoose");

const wholesalerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: String,
  address: String,
}, { timestamps: true });

module.exports = mongoose.model("Wholesaler", wholesalerSchema);
