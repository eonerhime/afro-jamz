import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import winston from "winston";
import swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";
import authRoutes from "./routes/auth.routes.js";
import producerRoutes from "./routes/producer.routes.js";
import purchasesRoutes from "./routes/purchases.routes.js";
import licensesRoutes from "./routes/licenses.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import paymentMethodsRoutes from "./routes/payment-methods.routes.js";
import beatsRoutes from "./routes/beats.routes.js";
import { initializeDB, getDB } from "./db/index.js";

const PORT = process.env.PORT || 3001;
const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan("combined"));

// Serve static audio files (protected by routes)
app.use("/audio", express.static("./src/backend/audio"));

// Initialize database
initializeDB();

// ==========================================
// RATE LIMITING
// ==========================================
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 5 attempts
});

app.use("/auth/login", loginLimiter);

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

// ==========================================
// SWAGGER CONFIGURATION
// ==========================================
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "AfroJamz API",
      version: "1.0.0",
      description: "API documentation for AfroJamz - African Beat Marketplace",
      contact: {
        name: "AfroJamz Support",
        email: "support@afrojamz.com",
      },
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: "Development server",
      },
      {
        url: "https://api.afrojamz.com",
        description: "Production server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./src/backend/server.js", "./src/backend/routes/*.js"], // Path to API docs
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

// Swagger UI route
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

console.log(
  `📚 Swagger documentation available at http://localhost:${PORT}/api-docs`,
);

// ==========================================
// ROUTE MOUNTING
// ==========================================

// Authentication routes (no /api prefix)
app.use("/auth", authRoutes);

// Admin routes (mount BEFORE parameterized routes to avoid conflicts)
app.use("/api/admin", adminRoutes);

// Producer routes
app.use("/api/producer", producerRoutes);

// Buyer routes (purchases, payment methods, downloads)
app.use("/api/buyer", purchasesRoutes);
app.use("/api/buyer/payment-methods", paymentMethodsRoutes);

// Beat routes (public & producer)
app.use("/api/beats", beatsRoutes);

// ==========================================
// HEALTH CHECK ENDPOINT
// ==========================================

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ==========================================
// START SERVER
// ==========================================

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   🎵 AfroJamz Backend Server Started   ║
╚════════════════════════════════════════╝
  
  Server running on port ${PORT}
  Environment: ${process.env.NODE_ENV || "development"}
  Swagger UI: http://localhost:${PORT}/api-docs
  Health Check: http://localhost:${PORT}/health
  `);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down gracefully...");

  const db = getDB();
  if (db) {
    db.close((err) => {
      if (err) {
        console.error("❌ Error closing database:", err.message);
      } else {
        console.log("✅ Database connection closed.");
      }
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

export default app;
