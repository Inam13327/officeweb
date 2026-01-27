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
const mongoURI = "mongodb+srv://inam13327:Lenovopc@cluster0.fxjutdn.mongodb.net/ecommerce?retryWrites=true&w=majority";

mongoose.connect(mongoURI)
  .then(() => console.log("✅ MongoDB Atlas Connected Successfully!"))
  .catch(err => console.error("❌ Database Connection Error:", err));
// ---------------------------

// Middleware
// Behtar CORS settings takay Hostinger se data fetch ho sakay
app.use(cors({
  origin: "*", // Filhal sab allow hai, baad mein apna domain dal dena
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use(router);

// Serve static files
let distPath = path.join(__dirname, "dist");
app.use(express.static(distPath));

// Handle client-side routing
app.get(/.*/, (req, res) => {
  const indexPath = path.join(distPath, "index.html");
  
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    // Agar API route nahi hai to frontend error, warna JSON error
    if (!req.path.startsWith("/api")) {
        res.status(404).send("Frontend build not found. API is running at /api");
    } else {
        res.status(404).json({ error: "API Route Not Found" });
    }
  }
});

app.listen(PORT, () => {
  console.log(`🚀 API Server is live at: https://officeweb-gamma.vercel.app`);
});