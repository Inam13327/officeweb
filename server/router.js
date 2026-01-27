import { Router } from "express";
import { Product, Order, Message, Category } from "./models.js";
import { hashPassword, verifyPassword, createToken, verifyToken } from "./auth.js";
import { v4 as uuidv4 } from 'uuid'; // createId ki jagah uuid use kar sakte hain

const router = Router();

// Helper for Admin Auth
async function requireAdmin(req, res) {
  const header = req.headers["authorization"];
  const token = header && header.split(" ")[1];
  const payload = verifyToken(token);
  
  if (!payload) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return payload;
}

// --- PUBLIC ROUTES ---

// Get all products with filters
router.get("/api/products", async (req, res) => {
  try {
    const query = req.query;
    let filter = {};

    if (query.category) filter.categorySlug = query.category;
    if (query.segment) filter.segment = query.segment;
    if (query.featured) filter.featuredHome = true;
    if (query.q) {
      filter.name = { $regex: query.q, $options: "i" };
    }

    const products = await Product.find(filter);
    res.json(products);
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

// Single product
router.get("/api/products/:id", async (req, res) => {
  const product = await Product.findOne({ id: req.params.id });
  product ? res.json(product) : res.status(404).send("Not found");
});

// Checkout (Save Order)
router.post("/api/checkout", async (req, res) => {
  try {
    const { items, customer } = req.body;
    const newOrder = new Order({
      id: uuidv4(),
      items,
      customer,
      createdAt: new Date()
    });
    await newOrder.save();
    res.status(201).json({ orderId: newOrder.id });
  } catch (e) {
    res.status(400).json({ error: "Order failed" });
  }
});

// Contact Form
router.post("/api/contact", async (req, res) => {
  const newMessage = new Message({ ...req.body, id: uuidv4() });
  await newMessage.save();
  res.status(201).json({ success: true });
});

// --- ADMIN ROUTES ---

router.get("/api/admin/overview", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const totalProducts = await Product.countDocuments();
  const totalOrders = await Order.countDocuments();
  const messages = await Message.countDocuments({ read: false });
  res.json({ totalProducts, totalOrders, unreadMessages: messages });
});

router.post("/api/admin/products", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const product = new Product({ ...req.body, id: uuidv4() });
  await product.save();
  res.status(201).json(product);
});

router.delete("/api/admin/products/:id", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  await Product.deleteOne({ id: req.params.id });
  res.json({ success: true });
});

router.get("/api/admin/orders", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const orders = await Order.find().sort({ createdAt: -1 });
  res.json(orders);
});

export { router };