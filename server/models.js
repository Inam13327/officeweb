import mongoose from "mongoose";

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
}, { strict: false }); // strict false takay aapka purana sara data accept ho jaye

const OrderSchema = new mongoose.Schema({
  id: String,
  items: Array,
  customer: Object,
  status: { type: String, default: "processing" },
  createdAt: { type: Date, default: Date.now }
});

const MessageSchema = new mongoose.Schema({
  id: String,
  name: String,
  email: String,
  subject: String,
  message: String,
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const CategorySchema = new mongoose.Schema({
  id: String,
  name: String,
  slug: String,
  tier: String
});

export const Product = mongoose.model("Product", ProductSchema);
export const Order = mongoose.model("Order", OrderSchema);
export const Message = mongoose.model("Message", MessageSchema);
export const Category = mongoose.model("Category", CategorySchema);