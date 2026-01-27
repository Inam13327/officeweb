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
// URL: /api/admin/login
router.post("/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    // Database connection check: image_3010fe.png dikhati hai ke DB connected hai
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
// URL: /api/products
router.get("/products", async (req, res) => {
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

// URL: /api/products/:id
router.get("/products/:id", async (req, res) => {
  try {
    const product = await Product.findOne({ id: req.params.id });
    product ? res.json(product) : res.status(404).send("Not found");
  } catch (e) {
    res.status(500).json({ error: "Error fetching product" });
  }
});

// URL: /api/checkout
router.post("/checkout", async (req, res) => {
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

// URL: /api/contact
router.post("/contact", async (req, res) => {
  try {
    const newMessage = new Message({ ...req.body, id: uuidv4() });
    await newMessage.save();
    res.status(201).json({ success: true });
  } catch (e) {
    res.status(400).json({ error: "Message failed" });
  }
});

// URL: /api/categories
router.get("/categories", async (req, res) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (e) {
    res.status(500).json({ error: "Error fetching categories" });
  }
});

// --- ADMIN MANAGEMENT ROUTES ---

router.get("/admin/overview", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const totalProducts = await Product.countDocuments();
  const totalOrders = await Order.countDocuments();
  const unreadMessages = await Message.countDocuments({ read: false });
  res.json({ totalProducts, totalOrders, unreadMessages });
});

router.get("/admin/products", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const products = await Product.find();
  res.json(products);
});

router.post("/admin/products", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const product = new Product({ ...req.body, id: uuidv4() });
  await product.save();
  res.status(201).json(product);
});

router.put("/admin/products/:id", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const updated = await Product.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
  res.json(updated);
});

router.delete("/admin/products/:id", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  await Product.deleteOne({ id: req.params.id });
  res.json({ success: true });
});

router.get("/admin/orders", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const orders = await Order.find().sort({ createdAt: -1 });
  res.json(orders);
});

router.get("/admin/messages", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const messages = await Message.find().sort({ createdAt: -1 });
  res.json(messages);
});

export { router };