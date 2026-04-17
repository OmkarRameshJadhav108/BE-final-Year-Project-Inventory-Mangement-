const Product = require("../models/Product");

function isSameDay(left, right) {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

async function refreshDailySales(product) {
  const now = new Date();

  if (!product.salesUpdatedAt || !isSameDay(new Date(product.salesUpdatedAt), now)) {
    product.soldToday = 0;
    product.salesUpdatedAt = now;
    await product.save();
  }

  return product;
}

async function refreshProductsDailySales(products) {
  return Promise.all(products.map((product) => refreshDailySales(product)));
}

// ADD PRODUCT
exports.addProduct = async (req, res) => {
  try {
    const product = new Product({
      name: req.body.name,
      price: Number(req.body.price),
      category: req.body.category,
      stock: Number(req.body.stock) || 0,
      lowStockThreshold: Number(req.body.lowStockThreshold) || 5,
      salesUpdatedAt: new Date(),
    });

    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET ALL PRODUCTS
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    const refreshedProducts = await refreshProductsDailySales(products);
    res.json(refreshedProducts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE PRODUCT
exports.updateProduct = async (req, res) => {
  try {
    const update = {
      ...req.body,
    };

    if (update.price !== undefined) update.price = Number(update.price);
    if (update.stock !== undefined) update.stock = Number(update.stock);
    if (update.lowStockThreshold !== undefined) {
      update.lowStockThreshold = Number(update.lowStockThreshold);
    }

    const product = await Product.findByIdAndUpdate(req.params.id, update, { new: true });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const refreshedProduct = await refreshDailySales(product);
    res.json(refreshedProduct);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// RECORD DAILY SALE
exports.recordSale = async (req, res) => {
  try {
    const quantity = Number(req.body.quantity);

    if (!quantity || quantity < 1) {
      return res.status(400).json({ message: "Quantity must be at least 1" });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    await refreshDailySales(product);

    if ((product.stock || 0) < quantity) {
      return res.status(400).json({ message: "Not enough stock for this sale" });
    }

    product.stock = (product.stock || 0) - quantity;
    product.soldToday = (product.soldToday || 0) + quantity;
    product.totalSold = (product.totalSold || 0) + quantity;
    product.salesUpdatedAt = new Date();

    await product.save();

    res.json({
      message: "Daily sale recorded",
      product,
      lowStock: product.stock <= (product.lowStockThreshold || 0),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE PRODUCT
exports.deleteProduct = async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
