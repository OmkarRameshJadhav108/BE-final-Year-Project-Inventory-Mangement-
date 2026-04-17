const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ["inventory_manager", "shopkeeper", "big_retailer", "manufacturer"],
    default: "inventory_manager"
  }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
