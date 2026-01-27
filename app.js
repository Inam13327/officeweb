import express from "express";
import cors from "cors";
import { router } from "./server/router.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

// --- DATABASE CONNECTION ---
const mongoURI = "mongodb+srv://inam13327:Lenovopoc@cluster0.fxjutdn.mongodb.net/ecommerce?retryWrites=true&w=majority";

mongoose.connect(mongoURI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ DB Error:", err.message));

// --- CORS CONFIG ---
const allowedOrigins = ["https://assaimart.com", "http://localhost:5173", "http://localhost:3000"];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || origin.includes('vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('CORS blocked'));
    }
  },
  credentials: true
}));

// Pre-flight requests ke liye simple middleware (Wildcard error se bachne ke liye)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// --- ROUTES ---
app.use("/api", router); // Saare API routes /api se shuru honge

// Static files logic
const distPath = path.join(__dirname, "dist");
app.use(express.static(distPath));

// Frontend Fallback (Simple path for Vercel)
app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "API not found" });
  }
  res.sendFile(path.join(distPath, "index.html"), (err) => {
    if (err) res.status(404).send("Build not found");
  });
});

app.listen(PORT, () => console.log(`Server on ${PORT}`));