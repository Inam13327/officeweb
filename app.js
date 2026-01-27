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
// Password: Lenovopoc (Typo fix kiya gaya hai)
const mongoURI = "mongodb+srv://inam13327:Lenovopoc@cluster0.fxjutdn.mongodb.net/ecommerce?retryWrites=true&w=majority";

mongoose.connect(mongoURI)
  .then(() => console.log("✅ MongoDB Atlas Connected Successfully!"))
  .catch(err => console.error("❌ Database Connection Error:", err));
// ---------------------------

// --- MIDDLEWARE & CORS ---
app.use(cors({
  // Hostinger domain aur local development dono allow hain
  origin: ["https://assaimart.com", "http://localhost:5173", "http://localhost:3000"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use(router);

// Serve static files (Vercel deployment ke liye)
let distPath = path.join(__dirname, "dist");
app.use(express.static(distPath));

// Handle client-side routing (React Router support)
app.get(/.*/, (req, res) => {
  const indexPath = path.join(distPath, "index.html");
  
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    // Agar route /api se start nahi ho raha to 404 error
    if (!req.path.startsWith("/api")) {
        res.status(404).send("Frontend build not found. API is running at /api");
    } else {
        res.status(404).json({ error: "API Route Not Found" });
    }
  }
});

// Server Start
app.listen(PORT, () => {
  console.log(`🚀 API Server is live at: https://officeweb-gamma.vercel.app`);
});