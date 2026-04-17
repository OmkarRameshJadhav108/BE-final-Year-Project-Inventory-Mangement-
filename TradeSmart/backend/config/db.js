const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/tradesmart";
    await mongoose.connect(mongoUri);
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("MongoDB Error:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
