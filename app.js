import express from "express";
import cors from "cors";
import { router } from "./server/router.js";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// --- DATABASE CONNECTION ---
const mongoURI = "mongodb+srv://inam13327:Lenovopoc@cluster0.fxjutdn.mongodb.net/ecommerce?retryWrites=true&w=majority";

mongoose.connect(mongoURI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ DB Error:", err.message));

// --- CORS CONFIG ---
// Vercel par '*' ya standard wildcards ki wajah se error aata hai
app.use(cors({
  origin: true, // Sab origins ko allow karein (Testing ke liye)
  credentials: true
}));

app.use(express.json());

// --- ROUTES ---
// Saare /api/ calls yahan jayengi
app.use("/api", router); 

// Static files (Frontend)
const distPath = path.join(__dirname, "dist");
app.use(express.static(distPath));

// Frontend Fallback - Bina kisi '*' ke
app.get("/", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// Agar koi route match na ho toh index.html par bhej dein (Regex se bachne ke liye simple handler)
app.use((req, res) => {
  if (!req.url.startsWith("/api")) {
    res.sendFile(path.join(distPath, "index.html"));
  } else {
    res.status(404).json({ error: "API Route Not Found" });
  }
});

export default app;