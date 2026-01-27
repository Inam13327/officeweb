import mongoose from "mongoose";
import fs from "fs";
// Kyunke file 'server' folder ke andar hai, isliye hum "./models.js" use karenge
import { Product, Category } from "./models.js"; 

const mongoURI = "mongodb+srv://inam13327:Lenovopc@cluster0.fxjutdn.mongodb.net/ecommerce?retryWrites=true&w=majority";

async function migrate() {
  try {
    await mongoose.connect(mongoURI);
    console.log("🚀 Connected to MongoDB for migration...");

    // Yahan hum path sahi kar rahe hain: "./data/products.json"
    // Kyunke hum pehle se hi 'server' folder ke andar hain
    const productsPath = "./data/products.json";
    
    if (!fs.existsSync(productsPath)) {
      throw new Error(`File not found at ${productsPath}. Check if 'data' folder is inside 'server'.`);
    }

    const productsData = JSON.parse(fs.readFileSync(productsPath, "utf-8"));
    
    // Pehle purana data clear karte hain takay duplicates na hon
    await Product.deleteMany({});
    await Category.deleteMany({});

    await Product.insertMany(productsData);
    console.log("✅ Products migrated!");

    const categoriesData = [
      { id: "1", name: "Premium Perfumes", slug: "premium", tier: "premium" },
      { id: "2", name: "Medium Range Perfumes", slug: "medium", tier: "medium" },
      { id: "3", name: "Basic / Budget Perfumes", slug: "basic", tier: "basic" },
      { id: "4", name: "Men", slug: "men", tier: "segment-men" },
      { id: "5", name: "Women", slug: "women", tier: "segment-women" },
      { id: "6", name: "Unisex", slug: "unisex", tier: "segment-unisex" },
    ];
    
    await Category.insertMany(categoriesData);
    console.log("✅ Categories migrated!");

    console.log("--- ✨ ALL DATA MIGRATED SUCCESSFULLY ---");
    process.exit();
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    process.exit(1);
  }
}

migrate();