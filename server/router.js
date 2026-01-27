import { Router } from "express";
import path from "path";
import { fileURLToPath } from "url";
import {
  getInitialData,
  saveAdminUsers,
  saveCategories,
  saveOrders,
  saveProducts,
  saveMessages,
  saveSubscribers,
  createId,
} from "./database.js";
import { hashPassword, verifyPassword, createToken, verifyToken, revokeToken } from "./auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

let statePromise;

async function getState() {
  if (!statePromise) {
    statePromise = bootstrapState();
  }
  return statePromise;
}

async function bootstrapState() {
  const initial = await getInitialData();
  if (!initial.adminUsers.length) {
    const defaultAdmin = {
      id: createId(),
      email: "assaimartofficial@gmail.com",
      passwordHash: hashPassword("AssaiMart123#"),
      name: "Administrator",
    };
    initial.adminUsers.push(defaultAdmin);
    await saveAdminUsers(initial.adminUsers);
  }
  if (!initial.categories.length) {
    initial.categories = [
      { id: createId(), name: "Premium Perfumes", slug: "premium", tier: "premium" },
      { id: createId(), name: "Medium Range Perfumes", slug: "medium", tier: "medium" },
      { id: createId(), name: "Basic / Budget Perfumes", slug: "basic", tier: "basic" },
      { id: createId(), name: "Men", slug: "men", tier: "segment-men" },
      { id: createId(), name: "Women", slug: "women", tier: "segment-women" },
      { id: createId(), name: "Unisex", slug: "unisex", tier: "segment-unisex" },
    ];
    await saveCategories(initial.categories);
  }
  return initial;
}

function withOrderItemImages(order, products) {
  if (!order || !Array.isArray(order.items)) {
    return order;
  }
  return {
    ...order,
    items: order.items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      const imageUrl = product && (product.imageUrl || product.image);
      if (!imageUrl) {
        return item;
      }
      return {
        ...item,
        imageUrl,
      };
    }),
  };
}

// Helper to get token
function getAuthToken(req) {
  const header = req.headers["authorization"];
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer") return null;
  return token || null;
}

// Helper for admin check
async function requireAdmin(req, res) {
  const token = getAuthToken(req);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  const state = await getState();
  const admin = state.adminUsers.find((u) => u.id === payload.adminId);
  if (!admin) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return { state, admin, token };
}

// Routes

router.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    cwd: process.cwd(),
    dirname: __dirname
  });
});

router.post("/api/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const state = await getState();
    const admin = state.adminUsers.find((u) => u.email === email);
    if (!admin || !verifyPassword(password, admin.passwordHash)) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const token = createToken(admin.id);
    res.json({
      token,
      admin: { id: admin.id, email: admin.email, name: admin.name },
    });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: "Invalid request body" });
  }
});

router.post("/api/admin/logout", (req, res) => {
  const token = getAuthToken(req);
  if (token) {
    revokeToken(token);
  }
  res.json({ success: true });
});

router.post("/api/admin/reset-password", async (req, res) => {
  try {
    const state = await getState();
    const { password } = req.body;
    
    if (!password || typeof password !== "string" || password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }

    let index = state.adminUsers.findIndex((u) => u.email === "assaimartofficial@gmail.com");
    if (index === -1 && state.adminUsers.length > 0) {
      index = 0;
    }

    if (index === -1) {
      res.status(404).json({ error: "Admin user not found" });
      return;
    }

    state.adminUsers[index].passwordHash = hashPassword(password);
    await saveAdminUsers(state.adminUsers);
    
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: "Invalid request body" });
  }
});

router.get("/api/categories", async (req, res) => {
  const state = await getState();
  res.json(state.categories);
});

router.post("/api/contact", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
      res.status(400).json({ error: "Missing contact information" });
      return;
    }
    const state = await getState();
    if (!Array.isArray(state.messages)) {
      state.messages = [];
    }
    const entry = {
      id: createId(),
      name,
      email,
      subject,
      message,
      createdAt: new Date().toISOString(),
      read: false,
    };
    state.messages.push(entry);
    await saveMessages(state.messages);
    res.status(201).json({ success: true });
  } catch {
    res.status(400).json({ error: "Invalid request body" });
  }
});

router.post("/api/newsletter/subscribe", async (req, res) => {

  try {
    const body = req.body;
    const email = body && typeof body.email === "string" ? body.email.trim() : "";
    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }
    const state = await getState();
    if (!Array.isArray(state.subscribers)) {
      state.subscribers = [];
    }
    const exists = state.subscribers.some(
      (s) => s.email && s.email.toLowerCase() === email.toLowerCase()
    );
    if (!exists) {
      state.subscribers.push({
        id: createId(),
        email,
        createdAt: new Date().toISOString(),
      });
      await saveSubscribers(state.subscribers);
    }
    res.json({ success: true });
  } catch {
    res.status(400).json({ error: "Invalid request body" });
  }
});

router.get("/api/products", async (req, res) => {
  const state = await getState();
  let items = [...state.products];
  const query = req.query;

  if (query.category) {
    items = items.filter((p) => p.categorySlug === query.category);
  }
  if (query.segment) {
    items = items.filter((p) => p.segment === query.segment);
  }
  if (query.tier) {
    items = items.filter((p) => p.tier === query.tier);
  }
  if (query.productType) {
    items = items.filter((p) => (p.productType || "Perfume") === query.productType);
  }
  if (query.featured) {
    items = items.filter((p) => p.featuredHome);
  }
  if (query.q) {
    const term = String(query.q).toLowerCase();
    items = items.filter((p) => p.name.toLowerCase().includes(term) || p.description.toLowerCase().includes(term));
  }
  res.json(items);
});

router.get("/api/products/:id", async (req, res) => {
  const id = req.params.id;
  const state = await getState();
  const product = state.products.find((p) => p.id === id);
  if (!product) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(product);
});

router.post("/api/checkout", async (req, res) => {
  try {
    const { items, customer } = req.body;
    if (!items || !Array.isArray(items) || !customer || !customer.name || !customer.phone || !customer.address) {
      res.status(400).json({ error: "Missing order information" });
      return;
    }
    const state = await getState();
    const order = {
      id: createId(),
      items,
      customer,
      status: "processing",
      createdAt: new Date().toISOString(),
    };
    state.orders.push(order);
    await saveOrders(state.orders);
    res.status(201).json({ orderId: order.id });
  } catch {
    res.status(400).json({ error: "Invalid request body" });
  }
});

router.get("/api/orders/:id", async (req, res) => {
  const id = req.params.id;
  const initial = await getInitialData();
  const order = initial.orders.find((o) => o.id === id);
  if (!order) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const enriched = withOrderItemImages(order, initial.products || []);
  res.json(enriched);
});

// Admin Routes

router.get("/api/admin/overview", async (req, res) => {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  const { state } = ctx;
  const orders = state.orders;
  const products = state.products;
  const messages = Array.isArray(state.messages) ? state.messages : [];
  const unreadByEmail = new Set(
    messages.filter((m) => !m.read && m.email).map((m) => m.email)
  );
  const overview = {
    totalProducts: products.length,
    totalOrders: orders.length,
    newOrders: orders.filter((o) => o.status === "processing").length,
    unreadMessages: unreadByEmail.size,
  };
  res.json(overview);
});

router.get("/api/admin/messages", async (req, res) => {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  const { state } = ctx;
  const messages = Array.isArray(state.messages)
    ? state.messages
        .slice()
        .sort((a, b) => {
          const aTime = new Date(a.createdAt).getTime();
          const bTime = new Date(b.createdAt).getTime();
          return bTime - aTime;
        })
    : [];
  res.json(messages);
});

router.get("/api/admin/subscribers", async (req, res) => {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  const { state } = ctx;
  const subscribers = Array.isArray(state.subscribers)
    ? state.subscribers
        .slice()
        .sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
        )
    : [];
  res.json(subscribers);
});

router.post("/api/admin/messages/mark-read", async (req, res) => {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  const { state } = ctx;
  if (!Array.isArray(state.messages) || state.messages.length === 0) {
    res.json({ success: true });
    return;
  }
  state.messages = state.messages.map((m) => ({
    ...m,
    read: true,
  }));
  await saveMessages(state.messages);
  res.json({ success: true });
});

router.delete("/api/admin/messages/:id", async (req, res) => {
  const id = req.params.id;
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  const { state } = ctx;
  if (!Array.isArray(state.messages)) {
    state.messages = [];
  }
  const index = state.messages.findIndex((m) => m.id === id);
  if (index === -1) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const removed = state.messages.splice(index, 1)[0];
  await saveMessages(state.messages);
  res.json(removed);
});

router.get("/api/admin/products", async (req, res) => {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  const { state } = ctx;
  res.json(state.products);
});

router.post("/api/admin/products", async (req, res) => {
  try {
    const ctx = await requireAdmin(req, res);
    if (!ctx) return;
    const { state } = ctx;
    const body = req.body;
    const id = createId();
    const product = {
      id,
      name: body.name || "",
      description: body.description || "",
      brand: body.brand || "ASSAIMART",
      size: body.size || "100ml",
      price: Number(body.price) || 0,
      originalPrice: body.originalPrice ? Number(body.originalPrice) : undefined,
      categorySlug: body.categorySlug || "premium",
      segment: body.segment || "unisex",
      tier: body.tier || "premium",
      productType: body.productType || "Perfume",
      featuredHome: Boolean(body.featuredHome),
      featuredMen: Boolean(body.featuredMen),
      featuredWomen: Boolean(body.featuredWomen),
      featuredUnisex: Boolean(body.featuredUnisex),
      imageUrl: body.imageUrl || "",
      notes: body.notes || "",
      available: body.available !== false,
      rating: body.rating !== undefined ? Number(body.rating) : undefined,
      ratingMedia: Array.isArray(body.ratingMedia) ? body.ratingMedia : [],
    };
    state.products.push(product);
    await saveProducts(state.products);
    res.status(201).json(product);
  } catch {
    res.status(400).json({ error: "Invalid request body" });
  }
});

router.put("/api/admin/products/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const ctx = await requireAdmin(req, res);
    if (!ctx) return;
    const { state } = ctx;
    const body = req.body;
    const index = state.products.findIndex((p) => p.id === id);
    if (index === -1) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const existing = state.products[index];
    const updated = {
      ...existing,
      ...body,
      price: body.price !== undefined ? Number(body.price) : existing.price,
      originalPrice: body.originalPrice !== undefined ? Number(body.originalPrice) : existing.originalPrice,
      rating: body.rating !== undefined ? Number(body.rating) : existing.rating,
      ratingMedia: body.ratingMedia !== undefined
        ? (Array.isArray(body.ratingMedia) ? body.ratingMedia : existing.ratingMedia)
        : existing.ratingMedia,
    };
    state.products[index] = updated;
    await saveProducts(state.products);
    res.json(updated);
  } catch {
    res.status(400).json({ error: "Invalid request body" });
  }
});

router.delete("/api/admin/products/:id", async (req, res) => {
  const id = req.params.id;
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  const { state } = ctx;
  const index = state.products.findIndex((p) => p.id === id);
  if (index === -1) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const removed = state.products.splice(index, 1)[0];
  await saveProducts(state.products);
  res.json(removed);
});

router.get("/api/admin/orders", async (req, res) => {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  const { state } = ctx;
  const orders = Array.isArray(state.orders)
    ? state.orders.map((order) => withOrderItemImages(order, state.products || []))
    : [];
  res.json(orders);
});

router.get("/api/admin/orders/:id", async (req, res) => {
  const id = req.params.id;
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  const initial = await getInitialData();
  const order = initial.orders.find((o) => o.id === id);
  if (!order) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const enriched = withOrderItemImages(order, initial.products || []);
  res.json(enriched);
});

router.put("/api/admin/orders/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const ctx = await requireAdmin(req, res);
    if (!ctx) return;
    const { state } = ctx;
    const body = req.body;
    const index = state.orders.findIndex((o) => o.id === id);
    if (index === -1) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const existing = state.orders[index];
    const updated = {
      ...existing,
      ...body,
    };
    state.orders[index] = updated;
    await saveOrders(state.orders);
    res.json(updated);
  } catch {
    res.status(400).json({ error: "Invalid request body" });
  }
});

router.delete("/api/admin/orders/:id", async (req, res) => {
  const id = req.params.id;
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  const { state } = ctx;
  const index = state.orders.findIndex((o) => o.id === id);
  if (index === -1) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const removed = state.orders.splice(index, 1)[0];
  await saveOrders(state.orders);
  res.json(removed);
});

export { router };
