import { Router } from "express";
import { Product, Order, Message, Category } from "./models.js";
import { hashPassword, verifyPassword, createToken, verifyToken } from "./auth.js";
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Helper for Admin Auth
async function requireAdmin(req, res) {
  const header = req.headers["authorization"];
  const token = header && header.split(" ")[1];
  if (!token) {
    res.status(401).json({ error: "No token provided" });
    return null;
  }
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return payload;
}

// --- ADMIN AUTH ROUTES ---

router.post("/api/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    // Filhal hum email check kar rahe hain, aap isay DB se bhi verify kar sakte hain
    if (email === "assaimartofficial@gmail.com" && verifyPassword(password, hashPassword("AssaiMart123#"))) {
      const token = createToken("admin_id_123");
      return res.json({
        token,
        admin: { id: "admin_id_123", email, name: "Administrator" },
      });
    }
    res.status(401).json({ error: "Invalid credentials" });
  } catch (e) {
    res.status(500).json({ error: "Login failed" });
  }
});

// --- PUBLIC ROUTES ---

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

router.get("/api/products/:id", async (req, res) => {
  try {
    const product = await Product.findOne({ id: req.params.id });
    product ? res.json(product) : res.status(404).send("Not found");
  } catch (e) {
    res.status(500).json({ error: "Error fetching product" });
  }
});

router.post("/api/checkout", async (req, res) => {
  try {
    const { items, customer } = req.body;
    const newOrder = new Order({
      id: uuidv4(),
      items,
      customer,
      status: "processing",
      createdAt: new Date()
    });
    await newOrder.save();
    res.status(201).json({ orderId: newOrder.id });
  } catch (e) {
    res.status(400).json({ error: "Order failed" });
  }
});

router.post("/api/contact", async (req, res) => {
  try {
    const newMessage = new Message({ ...req.body, id: uuidv4() });
    await newMessage.save();
    res.status(201).json({ success: true });
  } catch (e) {
    res.status(400).json({ error: "Message failed" });
  }
});

router.get("/api/categories", async (req, res) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (e) {
    res.status(500).json({ error: "Error fetching categories" });
  }
});

// --- ADMIN MANAGEMENT ROUTES ---

router.get("/api/admin/overview", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const totalProducts = await Product.countDocuments();
  const totalOrders = await Order.countDocuments();
  const unreadMessages = await Message.countDocuments({ read: false });
  res.json({ totalProducts, totalOrders, unreadMessages });
});

router.get("/api/admin/products", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const products = await Product.find();
  res.json(products);
});

router.post("/api/admin/products", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const product = new Product({ ...req.body, id: uuidv4() });
  await product.save();
  res.status(201).json(product);
});

router.put("/api/admin/products/:id", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const updated = await Product.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
  res.json(updated);
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

router.get("/api/admin/messages", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const messages = await Message.find().sort({ createdAt: -1 });
  res.json(messages);
});

export { router };