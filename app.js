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

mongoose.connect(mongoURI, {
  serverSelectionTimeoutMS: 5000
})
  .then(() => console.log("✅ MongoDB Atlas Connected Successfully!"))
  .catch(err => console.error("❌ Database Connection Error:", err.message));

// --- MIDDLEWARE & CORS ---
const allowedOrigins = ["https://assaimart.com", "http://localhost:5173", "http://localhost:3000"];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || origin.includes('vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  credentials: true
}));

// FIXED: '*' ko '(.*)' se replace kiya gaya hai Vercel compatibility ke liye
app.options('(.*)', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- API ROUTES ---
app.use(router);

// Serve static files
let distPath = path.join(__dirname, "dist");
app.use(express.static(distPath));

// FIXED: Path regex ko theek kiya gaya hai
app.get('/:path*', (req, res) => {
  const indexPath = path.join(distPath, "index.html");
  
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "API Route Not Found" });
  }

  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send("Frontend build not found.");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});