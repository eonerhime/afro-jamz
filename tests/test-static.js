import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const audioPath = path.join(__dirname, "src", "backend", "audio");
console.log("Static files directory:", audioPath);
console.log("Directory exists:", fs.existsSync(audioPath));

app.use("/uploads", express.static(audioPath));

app.listen(4000, () => {
  console.log("Test server on http://localhost:4000");
  console.log("Try: http://localhost:4000/covers/midnight-groove.jpg");
});
