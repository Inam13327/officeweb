import express from "express";
import cors from "cors";
import { router } from "./server/router.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use(router);

// Serve static files
// Since this file is in the root, dist should be in ./dist
let distPath = path.join(__dirname, "dist");

// Check if dist exists
if (!fs.existsSync(distPath)) {
  console.warn("Dist folder not found at " + distPath + ". Make sure to run 'npm run build' before starting the server in production.");
  // Fallback to current directory if needed, but risky in root
}

// Serve static files from distPath
app.use(express.static(distPath));

// Handle client-side routing by serving index.html for all non-API routes
app.get(/.*/, (req, res) => {
  // Security check: prevent serving sensitive files if distPath is root (which shouldn't happen with standard structure)
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
    // If index.html doesn't exist, it might be an API 404 or just missing build
    if (!req.path.startsWith("/api")) {
        res.status(404).send("Frontend build not found. Please run 'npm run build'.");
    } else {
        res.status(404).json({ error: "Not found" });
    }
  }
});

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});
