import express from "express";
import cors from "cors";
import { router } from "./server/router.js";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// --- DATABASE CONNECTION ---
const mongoURI = process.env.MONGODB_URI || "mongodb+srv://inam13327:Lenovopoc@cluster0.fxjutdn.mongodb.net/ecommerce?retryWrites=true&w=majority";

mongoose.connect(mongoURI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ DB Error:", err.message));

// --- CORS CONFIG ---
// Allow Hostinger frontend to access Vercel backend
app.use(cors({
  origin: true, 
  credentials: true
}));

app.use(express.json());

// --- ROUTES ---
// Saare /api/ calls yahan jayengi
app.use("/api", router); 

// Static files (Frontend)
const distPath = path.join(__dirname, "dist");
app.use(express.static(distPath));

// Frontend Fallback
// Check if frontend exists (for Vercel backend-only mode)
const indexHtmlPath = path.join(distPath, "index.html");

app.get("/", (req, res) => {
  if (fs.existsSync(indexHtmlPath)) {
    res.sendFile(indexHtmlPath);
  } else {
    res.send("<h1>Backend is running!</h1><p>Frontend is hosted separately.</p>");
  }
});

// Agar koi route match na ho toh index.html par bhej dein
app.use((req, res) => {
  if (!req.url.startsWith("/api") && fs.existsSync(indexHtmlPath)) {
    res.sendFile(indexHtmlPath);
  } else {
    res.status(404).json({ error: "API Route Not Found" });
  }
});

// Start Server if run directly (Hostinger/Local)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

export default app;