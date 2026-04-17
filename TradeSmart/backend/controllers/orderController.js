const Order = require("../models/Order");
const Product = require("../models/Product");

function buildBillNumber() {
  return `TS-${Date.now()}`;
}

exports.createOrder = async (req, res) => {
  try {
    const rawProducts = Array.isArray(req.body.products) ? req.body.products : [];
    const normalizedProducts = rawProducts
      .filter((item) => item?.product)
      .map((item) => ({
        product: item.product,
        quantity: Math.max(1, Number(item.quantity) || 1),
      }));

    if (normalizedProducts.length === 0) {
      return res.status(400).json({ error: "At least one product is required" });
    }

    const productIds = normalizedProducts.map((item) => item.product);
    const products = await Product.find({ _id: { $in: productIds } });
    const productPriceMap = new Map(products.map((product) => [String(product._id), Number(product.price) || 0]));

    const totalAmount = normalizedProducts.reduce((sum, item) => {
      return sum + ((productPriceMap.get(String(item.product)) || 0) * item.quantity);
    }, 0);

    const expectedShipmentDate = req.body.expectedShipmentDate
      ? new Date(req.body.expectedShipmentDate)
      : new Date(Date.now() + (2 * 24 * 60 * 60 * 1000));

    const order = await Order.create({
      ...req.body,
      billNumber: req.body.billNumber || buildBillNumber(),
      products: normalizedProducts,
      totalAmount,
      shipmentStatus: req.body.shipmentStatus || "placed",
      expectedShipmentDate,
      actualShipmentDate: req.body.actualShipmentDate || null,
    });
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
