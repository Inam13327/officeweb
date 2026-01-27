import express from "express";
import cors from "cors";
import { router } from "./server/router.js";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

// --- DATABASE CONNECTION ---
// Aapka database setup bilkul sahi hai
const mongoURI = "mongodb+srv://inam13327:Lenovopoc@cluster0.fxjutdn.mongodb.net/ecommerce?retryWrites=true&w=majority";

mongoose.connect(mongoURI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ DB Error:", err.message));

// --- CORS CONFIG ---
const allowedOrigins = ["https://assaimart.com", "http://localhost:5173", "http://localhost:3000"];

app.use(cors({
  origin: function (origin, callback) {
    // Vercel preview URLs aur allowed origins ko permit karna
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || origin.includes('vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('CORS blocked'));
    }
  },
  credentials: true
}));

// --- MIDDLEWARE ---
app.use(express.json());

// Path-to-regexp error se bachne ke liye generic pre-flight handler
app.options('*', cors()); 

// --- API ROUTES ---
// Logs ke mutabiq /api/products crash ho raha tha
app.use("/api", router); 

// --- STATIC FILES & FRONTEND FALLBACK ---
const distPath = path.join(__dirname, "dist");
app.use(express.static(distPath));

// Important: Wildcard matching ko simple rakhein
app.get("*", (req, res) => {
  // Agar request /api se start ho rahi hai toh index.html mat bhejo
  if (req.originalUrl.startsWith("/api")) {
    return res.status(404).json({ error: "API Route not found" });
  }
  
  res.sendFile(path.join(distPath, "index.html"), (err) => {
    if (err) {
      res.status(404).send("Frontend build not found. Make sure 'dist' folder exists.");
    }
  });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

export default app; // Vercel compatibility ke liye