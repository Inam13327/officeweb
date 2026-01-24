import { parse } from "url";
import fs from "fs";
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

const MIME_TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

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

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  });
  res.end(payload);
}

function notFound(res) {
  sendJson(res, 404, { error: "Not found" });
}

function methodNotAllowed(res) {
  sendJson(res, 405, { error: "Method not allowed" });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      if (!data) {
        resolve({});
        return;
      }
      try {
        const json = JSON.parse(data);
        resolve(json);
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function getAuthToken(req) {
  const header = req.headers["authorization"];
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer") return null;
  return token || null;
}

async function requireAdmin(req, res) {
  const token = getAuthToken(req);
  const payload = verifyToken(token);
  if (!payload) {
    sendJson(res, 401, { error: "Unauthorized" });
    return null;
  }
  const state = await getState();
  const admin = state.adminUsers.find((u) => u.id === payload.adminId);
  if (!admin) {
    sendJson(res, 401, { error: "Unauthorized" });
    return null;
  }
  return { state, admin, token };
}

export async function handleRequest(req, res) {
  const { pathname, query } = parse(req.url || "", true);

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    });
    res.end();
    return;
  }

  if (pathname === "/api/health" && req.method === "GET") {
    sendJson(res, 200, { 
      status: "ok", 
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      cwd: process.cwd(),
      dirname: __dirname
    });
    return;
  }

  if (pathname === "/api/admin/login" && req.method === "POST") {
    try {
      const body = await parseBody(req);
      const { email, password } = body;
      const state = await getState();
      const admin = state.adminUsers.find((u) => u.email === email);
      if (!admin || !verifyPassword(password, admin.passwordHash)) {
        sendJson(res, 401, { error: "Invalid credentials" });
        return;
      }
      const token = createToken(admin.id);
      sendJson(res, 200, {
        token,
        admin: { id: admin.id, email: admin.email, name: admin.name },
      });
    } catch (e) {
      console.error(e);
      sendJson(res, 400, { error: "Invalid request body" });
    }
    return;
  }

  if (pathname === "/api/admin/logout" && req.method === "POST") {
    const token = getAuthToken(req);
    if (token) {
      revokeToken(token);
    }
    sendJson(res, 200, { success: true });
    return;
  }

  if (pathname === "/api/admin/reset-password" && req.method === "POST") {
    try {
      const state = await getState();
      const body = await parseBody(req);
      const { password } = body;
      
      if (!password || typeof password !== "string" || password.length < 6) {
        sendJson(res, 400, { error: "Password must be at least 6 characters" });
        return;
      }

      let index = state.adminUsers.findIndex((u) => u.email === "assaimartofficial@gmail.com");
      if (index === -1 && state.adminUsers.length > 0) {
        index = 0;
      }

      if (index === -1) {
        sendJson(res, 404, { error: "Admin user not found" });
        return;
      }

      state.adminUsers[index].passwordHash = hashPassword(password);
      await saveAdminUsers(state.adminUsers);
      
      sendJson(res, 200, { success: true });
    } catch (e) {
      console.error(e);
      sendJson(res, 400, { error: "Invalid request body" });
    }
    return;
  }

  if (pathname === "/api/categories" && req.method === "GET") {
    const state = await getState();
    sendJson(res, 200, state.categories);
    return;
  }

  if (pathname === "/api/contact" && req.method === "POST") {
    try {
      const body = await parseBody(req);
      const { name, email, subject, message } = body;
      if (!name || !email || !subject || !message) {
        sendJson(res, 400, { error: "Missing contact information" });
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
      sendJson(res, 201, { success: true });
    } catch {
      sendJson(res, 400, { error: "Invalid request body" });
    }
    return;
  }

  if (pathname === "/api/newsletter/subscribe" && req.method === "POST") {
    try {
      const body = await parseBody(req);
      const email = body && typeof body.email === "string" ? body.email.trim() : "";
      if (!email) {
        sendJson(res, 400, { error: "Email is required" });
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
      sendJson(res, 200, { success: true });
    } catch {
      sendJson(res, 400, { error: "Invalid request body" });
    }
    return;
  }

  if (pathname === "/api/products" && req.method === "GET") {
    const state = await getState();
    let items = [...state.products];
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
    sendJson(res, 200, items);
    return;
  }

  if (pathname && pathname.startsWith("/api/products/") && req.method === "GET") {
    const id = pathname.split("/").pop();
    const state = await getState();
    const product = state.products.find((p) => p.id === id);
    if (!product) {
      notFound(res);
      return;
    }
    sendJson(res, 200, product);
    return;
  }

  if (pathname === "/api/checkout" && req.method === "POST") {
    try {
      const body = await parseBody(req);
      const { items, customer } = body;
      if (!items || !Array.isArray(items) || !customer || !customer.name || !customer.phone || !customer.address) {
        sendJson(res, 400, { error: "Missing order information" });
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
      sendJson(res, 201, { orderId: order.id });
    } catch {
      sendJson(res, 400, { error: "Invalid request body" });
    }
    return;
  }

  if (pathname && pathname.startsWith("/api/orders/") && req.method === "GET") {
    const id = pathname.split("/").pop();
    const initial = await getInitialData();
    const order = initial.orders.find((o) => o.id === id);
    if (!order) {
      notFound(res);
      return;
    }
    const enriched = withOrderItemImages(order, initial.products || []);
    sendJson(res, 200, enriched);
    return;
  }

  if (pathname === "/api/admin/overview" && req.method === "GET") {
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
    sendJson(res, 200, overview);
    return;
  }

  if (pathname === "/api/admin/messages" && req.method === "GET") {
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
    sendJson(res, 200, messages);
    return;
  }

  if (pathname === "/api/admin/subscribers" && req.method === "GET") {
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
    sendJson(res, 200, subscribers);
    return;
  }

  if (pathname === "/api/admin/messages/mark-read" && req.method === "POST") {
    const ctx = await requireAdmin(req, res);
    if (!ctx) return;
    const { state } = ctx;
    if (!Array.isArray(state.messages) || state.messages.length === 0) {
      sendJson(res, 200, { success: true });
      return;
    }
    state.messages = state.messages.map((m) => ({
      ...m,
      read: true,
    }));
    await saveMessages(state.messages);
    sendJson(res, 200, { success: true });
    return;
  }

  if (pathname && pathname.startsWith("/api/admin/messages/")) {
    const id = pathname.split("/").pop();
    if (req.method === "DELETE") {
      const ctx = await requireAdmin(req, res);
      if (!ctx) return;
      const { state } = ctx;
      if (!Array.isArray(state.messages)) {
        state.messages = [];
      }
      const index = state.messages.findIndex((m) => m.id === id);
      if (index === -1) {
        notFound(res);
        return;
      }
      const removed = state.messages.splice(index, 1)[0];
      await saveMessages(state.messages);
      sendJson(res, 200, removed);
      return;
    }
    methodNotAllowed(res);
    return;
  }

  if (pathname === "/api/admin/products") {
    if (req.method === "GET") {
      const ctx = await requireAdmin(req, res);
      if (!ctx) return;
      const { state } = ctx;
      sendJson(res, 200, state.products);
      return;
    }
    if (req.method === "POST") {
      try {
        const ctx = await requireAdmin(req, res);
        if (!ctx) return;
        const { state } = ctx;
        const body = await parseBody(req);
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
        sendJson(res, 201, product);
      } catch {
        sendJson(res, 400, { error: "Invalid request body" });
      }
      return;
    }
    methodNotAllowed(res);
    return;
  }

  if (pathname && pathname.startsWith("/api/admin/products/")) {
    const id = pathname.split("/").pop();
    if (req.method === "PUT") {
      try {
        const ctx = await requireAdmin(req, res);
        if (!ctx) return;
        const { state } = ctx;
        const body = await parseBody(req);
        const index = state.products.findIndex((p) => p.id === id);
        if (index === -1) {
          notFound(res);
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
        sendJson(res, 200, updated);
      } catch {
        sendJson(res, 400, { error: "Invalid request body" });
      }
      return;
    }
    if (req.method === "DELETE") {
      const ctx = await requireAdmin(req, res);
      if (!ctx) return;
      const { state } = ctx;
      const index = state.products.findIndex((p) => p.id === id);
      if (index === -1) {
        notFound(res);
        return;
      }
      const removed = state.products.splice(index, 1)[0];
      await saveProducts(state.products);
      sendJson(res, 200, removed);
      return;
    }
    methodNotAllowed(res);
    return;
  }

  if (pathname === "/api/admin/orders") {
    if (req.method === "GET") {
      const ctx = await requireAdmin(req, res);
      if (!ctx) return;
      const { state } = ctx;
      const orders = Array.isArray(state.orders)
        ? state.orders.map((order) => withOrderItemImages(order, state.products || []))
        : [];
      sendJson(res, 200, orders);
      return;
    }
    methodNotAllowed(res);
    return;
  }

  if (pathname && pathname.startsWith("/api/admin/orders/")) {
    const id = pathname.split("/").pop();
    if (req.method === "GET") {
      const ctx = await requireAdmin(req, res);
      if (!ctx) return;
      const initial = await getInitialData();
      const order = initial.orders.find((o) => o.id === id);
      if (!order) {
        notFound(res);
        return;
      }
      const enriched = withOrderItemImages(order, initial.products || []);
      sendJson(res, 200, enriched);
      return;
    }
    if (req.method === "PUT") {
      try {
        const ctx = await requireAdmin(req, res);
        if (!ctx) return;
        const { state } = ctx;
        const body = await parseBody(req);
        const index = state.orders.findIndex((o) => o.id === id);
        if (index === -1) {
          notFound(res);
          return;
        }
        const existing = state.orders[index];
        const updated = {
          ...existing,
          ...body,
        };
        state.orders[index] = updated;
        await saveOrders(state.orders);
        sendJson(res, 200, updated);
      } catch {
        sendJson(res, 400, { error: "Invalid request body" });
      }
      return;
    }
    if (req.method === "DELETE") {
      const ctx = await requireAdmin(req, res);
      if (!ctx) return;
      const { state } = ctx;
      const index = state.orders.findIndex((o) => o.id === id);
      if (index === -1) {
        notFound(res);
        return;
      }
      const removed = state.orders.splice(index, 1)[0];
      await saveOrders(state.orders);
      sendJson(res, 200, removed);
      return;
    }
    methodNotAllowed(res);
    return;
  }

  // Static file serving logic
  // Try to find dist folder in ../dist (standard) or ../ (if contents uploaded to root)
  let distPath = path.join(__dirname, "../dist");
  if (!fs.existsSync(distPath)) {
     // Check if we are running from a structure where assets are in root
     // But be careful not to serve server files.
     // If ../dist doesn't exist, maybe the user uploaded contents to root.
     // In that case, static files are in ../
     distPath = path.join(__dirname, "..");
  }

  let filePath = path.join(distPath, pathname === "/" ? "index.html" : pathname);

  // Security check: prevent escaping the intended root
  // If distPath is root, we must ensure we don't serve server/ or node_modules/
  const relative = path.relative(distPath, filePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    notFound(res);
    return;
  }
  
  // Extra security: if serving from root, deny access to sensitive folders/files
  if (distPath === path.join(__dirname, "..")) {
    if (
      relative.startsWith("server") || 
      relative.startsWith("node_modules") || 
      relative.startsWith(".git") ||
      relative.startsWith(".env") ||
      relative === "package.json" ||
      relative === "package-lock.json" ||
      relative === "app.js"
    ) {
      notFound(res);
      return;
    }
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for client-side routing
      const indexPath = path.join(distPath, "index.html");
      fs.readFile(indexPath, (err, content) => {
        if (err) {
          // If even index.html is missing, we can't do anything
          notFound(res);
          return;
        }
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(content, "utf-8");
      });
      return;
    }

    const extname = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[extname] || "application/octet-stream";

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      } else {
        res.writeHead(200, { "Content-Type": contentType });
        res.end(content, "utf-8");
      }
    });
  });
}
