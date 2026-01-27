import express from "express";
import cors from "cors";
import { router } from "./server/router.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import mongoose from "mongoose"; // Naya addition

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

// --- DATABASE CONNECTION ---
// Aapka MongoDB Atlas connection string
const mongoURI = "mongodb+srv://inam13327:Lenovopc123#.@cluster0.fxjutdn.mongodb.net/ecommerce?retryWrites=true&w=majority";

mongoose.connect(mongoURI)
  .then(() => console.log("✅ MongoDB Atlas Connected Successfully!"))
  .catch(err => console.error("❌ Database Connection Error:", err));
// ---------------------------

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use(router);

// Serve static files
let distPath = path.join(__dirname, "dist");

app.use(express.static(distPath));

// Handle client-side routing
app.get(/.*/, (req, res) => {
  if (distPath === __dirname) {
    const reqPath = req.path;
    if (
      reqPath.startsWith("/server") || 
      reqPath.startsWith("/node_modules") || 
      reqPath.startsWith("/.git") ||
      reqPath.startsWith("/.env") ||
      reqPath === "/package.json"
    ) {
      return res.status(404).send("Not found");
    }
  }

  const indexPath = path.join(distPath, "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    if (!req.path.startsWith("/api")) {
        res.status(404).send("Frontend build not found. Please run 'npm run build'.");
    } else {
        res.status(404).json({ error: "Not found" });
    }
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});