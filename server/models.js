import mongoose from "mongoose";

// --- PRODUCT SCHEMA ---
const ProductSchema = new mongoose.Schema({
  id: String,
  name: String,
  description: String,
  brand: { type: String, default: "ASSAIMART" },
  price: Number,
  originalPrice: Number,
  categorySlug: String,
  segment: String,
  tier: String,
  imageUrl: String,
  available: { type: Boolean, default: true },
  featuredHome: Boolean,
  createdAt: { type: Date, default: Date.now }
}, { strict: false }); // strict: false allows flexible data entry

// --- ORDER SCHEMA ---
const OrderSchema = new mongoose.Schema({
  id: String,
  items: Array,
  customer: Object,
  status: { type: String, default: "processing" },
  createdAt: { type: Date, default: Date.now }
});

// --- MESSAGE SCHEMA ---
const MessageSchema = new mongoose.Schema({
  id: String,
  name: String,
  email: String,
  subject: String,
  message: String,
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// --- CATEGORY SCHEMA ---
const CategorySchema = new mongoose.Schema({
  id: String,
  name: String,
  slug: String,
  tier: String
});

/**
 * MODELS EXPORT
 * Note: Teesra parameter ("products", "orders", etc.) wahi hona chahiye jo Atlas mein hai.
 * Aapke Atlas screenshot ke mutabiq ye lowercase mein hain.
 */
export const Product = mongoose.model("Product", ProductSchema, "products");
export const Order = mongoose.model("Order", OrderSchema, "orders");
export const Message = mongoose.model("Message", MessageSchema, "messages");
export const Category = mongoose.model("Category", CategorySchema, "categories");