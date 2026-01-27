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
  .then(() => console.log("✅ MongoDB Atlas Connected Successfully!"))
  .catch(err => console.error("❌ Database Connection Error:", err));
// ---------------------------

// --- MIDDLEWARE & CORS ---
// Is section ko update kiya gaya hai takay Pre-flight block na ho
const allowedOrigins = ["https://assaimart.com", "http://localhost:5173", "http://localhost:3000"];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || origin.includes('vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Pre-flight OPTIONS request ko handle karne ke liye (Very Important)
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- API ROUTES ---
// API routes hamesha pehle aane chahiye static files se
app.use(router);

// Serve static files
let distPath = path.join(__dirname, "dist");
app.use(express.static(distPath));

// Handle client-side routing
app.get(/.*/, (req, res) => {
  const indexPath = path.join(distPath, "index.html");
  
  // Agar API call hai jo router.js mein handle nahi hui
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "API Route Not Found" });
  }

  // Frontend build check
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send("Frontend build not found. API is running at /api");
  }
});

// Server Start
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});